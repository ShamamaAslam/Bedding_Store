const Order = require('../Models/Order');
const Product = require('../Models/Products');
const {
  calculateSecureOrderTotal,
  decrementProductStock,
  sendOrderConfirmationEmail
} = require('../Utils/orderHelper');

// Create new order
const createOrder = async (req, res) => {
  try {
    const {
      items,
      totalAmount,
      shippingAddress,
      paymentMethod,
      paymentStatus,
      stripePaymentId,
      notes,
      marketingSource,
      checkoutSessionId,
      couponCode,
      discountPercent
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in order' });
    }

    // 1. Secure Price and Coupon validation on Backend
    let calculatedAmountData;
    try {
      calculatedAmountData = await calculateSecureOrderTotal({
        items,
        couponCode,
        discountPercent: Number(discountPercent || 0)
      });
    } catch (calcError) {
      return res.status(400).json({ success: false, message: calcError.message });
    }

    // Protection check: Compare client-supplied amount with secured backend total
    const tolerance = 5; // tolerance for rounding differences
    if (Math.abs(calculatedAmountData.payableTotal - Number(totalAmount)) > tolerance) {
      return res.status(400).json({
        success: false,
        message: `Order amount validation failed. Client: Rs. ${totalAmount}, Server: Rs. ${calculatedAmountData.payableTotal}`
      });
    }

    const verifiedItems = calculatedAmountData.verifiedItems;
    let stockUpdated = false;

    // 2. Atomic Stock Decrement (COD orders update stock immediately)
    if (paymentMethod === 'COD') {
      const stockRes = await decrementProductStock(verifiedItems);
      if (!stockRes.success) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${stockRes.failedProduct}.`
        });
      }
      stockUpdated = true;
    }

    const order = await Order.create({
      user: req.user.id,
      items: verifiedItems,
      totalAmount: calculatedAmountData.payableTotal, // Securely calculated total
      shippingAddress,
      paymentMethod,
      marketingSource: marketingSource || 'direct',
      checkoutSessionId: checkoutSessionId || '',
      paymentStatus: paymentStatus || 'Pending',
      stripePaymentId: stripePaymentId || null,
      stockUpdated,
      notes
    });

    // 3. Send Transactional Confirmation Email (for COD orders immediately)
    if (paymentMethod === 'COD') {
      sendOrderConfirmationEmail(order, req.user.email).catch(console.error);
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get user's orders
const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('items.product', 'name images')
      .sort('-createdAt');
    
    res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get single order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name images');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if user owns order or is admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }
    
    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Admin: Get all orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product', 'name')
      .sort('-createdAt');
    
    res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Admin: Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, trackingNumber, returnReason, isDefective, refundAmount } = req.body;

    const updateData = { orderStatus, trackingNumber };

    if (orderStatus === 'Delivered') {
      updateData.deliveredAt = new Date();
    }

    if (typeof returnReason === 'string') {
      updateData.returnReason = returnReason;
    }

    if (typeof isDefective === 'boolean') {
      updateData.isDefective = isDefective;
    }

    if (Number.isFinite(Number(refundAmount))) {
      updateData.refundAmount = Math.max(0, Number(refundAmount));
    }

    if ((orderStatus === 'Cancelled' || updateData.refundAmount > 0) && !updateData.returnedAt) {
      updateData.returnedAt = new Date();
    }

    if (orderStatus === 'Delivered') {
      const existingOrder = await Order.findById(req.params.id).select('paymentMethod paymentStatus');

      if (existingOrder?.paymentMethod === 'COD' && existingOrder.paymentStatus === 'Pending') {
        updateData.paymentStatus = 'Paid';
      }
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Order status updated',
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// User self-service: update shipping address (only allowed when orderStatus is Pending or Processing)
const updateOrderShippingAddress = async (req, res) => {
  try {
    const { shippingAddress } = req.body;
    if (!shippingAddress) {
      return res.status(400).json({ success: false, message: 'Shipping address is required' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify ownership
    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this order' });
    }

    // Check status
    const editableStatuses = ['Pending', 'Processing'];
    if (!editableStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order shipping address cannot be modified once it has reached the "${order.orderStatus}" stage.`
      });
    }

    order.shippingAddress = shippingAddress;
    order.notes = `${order.notes || ''}\n[SYSTEM] Shipping address updated by user on ${new Date().toLocaleString()}`.trim();
    await order.save();

    res.json({
      success: true,
      message: 'Shipping address updated successfully!',
      order
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  updateOrderShippingAddress
};