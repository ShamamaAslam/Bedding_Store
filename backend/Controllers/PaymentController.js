const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../Models/Order');
const Product = require('../Models/Products');
const crypto = require('crypto');
const {
  calculateSecureOrderTotal,
  decrementProductStock,
  sendOrderConfirmationEmail
} = require('../Utils/orderHelper');

// Helper to check if a key is a placeholder
const isPlaceholder = (key) => {
  if (!key) return true;
  const normalized = String(key).trim().toLowerCase();
  return normalized.includes('xxx') || normalized.includes('placeholder') || normalized === '';
};

const createPaymentIntent = async (req, res) => {
  try {
    const { totalAmount } = req.body;

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: 'pkr',
      payment_method_types: ['card'],
      metadata: { userId: req.user.id.toString() }
    });

    res.json({ success: true, clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Payment setup failed', error: error.message });
  }
};

const createPayfastSession = async (req, res) => {
  try {
    const { orderPayload } = req.body;
    if (!orderPayload) {
      return res.status(400).json({ success: false, message: 'orderPayload is required' });
    }

    // 1. Recalculate and validate prices/coupons securely on backend
    let calculatedAmountData;
    try {
      calculatedAmountData = await calculateSecureOrderTotal({
        items: orderPayload.items,
        couponCode: orderPayload.couponCode,
        discountPercent: Number(orderPayload.discountPercent || 0)
      });
    } catch (calcError) {
      return res.status(400).json({ success: false, message: calcError.message });
    }

    // Verify amount matches within tolerance
    const tolerance = 5;
    if (Math.abs(calculatedAmountData.payableTotal - Number(orderPayload.totalAmount)) > tolerance) {
      return res.status(400).json({
        success: false,
        message: `Order amount validation failed. Client: Rs. ${orderPayload.totalAmount}, Server: Rs. ${calculatedAmountData.payableTotal}`
      });
    }

    // Verify stock availability (without decrementing yet)
    for (const item of calculatedAmountData.verifiedItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.name} not found.` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
        });
      }
    }

    // 2. Create order in our database as 'Pending'
    const newOrder = await Order.create({
      user: req.user._id,
      items: calculatedAmountData.verifiedItems,
      totalAmount: calculatedAmountData.payableTotal,
      shippingAddress: orderPayload.shippingAddress,
      paymentMethod: 'Card', // Map to Card
      paymentStatus: 'Pending',
      marketingSource: orderPayload.marketingSource || 'direct',
      checkoutSessionId: orderPayload.checkoutSessionId || '',
      stockUpdated: false,
      notes: orderPayload.notes || ''
    });

    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const securedKey = process.env.PAYFAST_SECURED_KEY;

    // Check if we have active, non-placeholder Payfast keys
    if (!isPlaceholder(merchantId) && !isPlaceholder(securedKey)) {
      // ── REAL PAYFAST GATEWAY REDIRECT ──
      const transactionId = newOrder._id.toString();
      const amount = Number(calculatedAmountData.payableTotal).toFixed(2);
      
      // Calculate Payfast Secure Hash: MD5 or SHA256 signature
      const signatureString = `${merchantId}${transactionId}${amount}PKR${securedKey}`;
      const secureHash = crypto.createHash('sha256').update(signatureString).digest('hex');

      const sandboxUrl = `https://sandbox.gopayfast.com/payfast/standard/checkout?merchant_id=${merchantId}&amount=${amount}&transaction_id=${transactionId}&currency_code=PKR&secure_hash=${secureHash}&customer_mobile_no=${encodeURIComponent(orderPayload.shippingAddress.phone)}&customer_email_address=${encodeURIComponent(req.user.email || 'customer@wfbedding.com')}`;

      return res.status(201).json({
        success: true,
        order: newOrder,
        redirectUrl: sandboxUrl
      });
    } else {
      // ── INTERACTIVE MOCK TRANSACTION GATEWAY ──
      const secureGatewayUrl = `/payment/secure-gateway?orderId=${newOrder._id}&amount=${newOrder.totalAmount}`;
      
      return res.status(201).json({
        success: true,
        order: newOrder,
        redirectUrl: secureGatewayUrl
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const verifyPayfastSession = async (req, res) => {
  try {
    const { orderId, paymentId, paymentStatus } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (paymentStatus === 'Paid') {
      order.paymentStatus = 'Paid';
      order.stripePaymentId = paymentId || `payfast_${Date.now()}`;
      
      // Decrement stock atomically (only if not already updated)
      if (!order.stockUpdated) {
        const stockRes = await decrementProductStock(order.items);
        if (!stockRes.success) {
          // Log failure but let payment status stand. Flag note.
          order.notes = `${order.notes || ''}\n[STOCK ERROR] Payment succeeded but stock allocation failed for ${stockRes.failedProduct}. Admin review required.`.trim();
        } else {
          order.stockUpdated = true;
        }
      }

      await order.save();

      // Retrieve user email to send confirmation email
      const populatedOrder = await Order.findById(order._id).populate('user', 'email');
      const userEmail = populatedOrder.user?.email || req.user?.email;
      if (userEmail) {
        sendOrderConfirmationEmail(order, userEmail).catch(console.error);
      }

      return res.json({ success: true, message: 'Order marked as paid', order });
    } else {
      order.paymentStatus = 'Failed';
      await order.save();
      
      return res.json({ success: false, message: 'Payment marked as failed', order });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createPaymentIntent,
  createPayfastSession,
  verifyPayfastSession
};