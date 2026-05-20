const Product = require('../Models/Products');
const sendEmail = require('./sendEmail');

const VALID_COUPONS = {
  'SAVE10': 10,
  'WELCOME5': 5,
  'WFSUPER': 15,
  'BEDDING20': 20
};

const DELIVERY_CHARGE = 250;

/**
 * Recalculates and validates the total amount of an order securely using database prices.
 */
const calculateSecureOrderTotal = async ({ items, couponCode, discountPercent }) => {
  let calculatedSubtotal = 0;
  const verifiedItems = [];

  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw new Error(`Product matching ID ${item.product} not found in database.`);
    }

    const price = product.discountPrice || product.price || 0;
    calculatedSubtotal += price * item.quantity;
    
    // Add verified prices for saving to the order items record
    verifiedItems.push({
      product: item.product,
      name: product.name,
      price: price,
      quantity: item.quantity,
      size: item.size,
      color: item.color
    });
  }

  let finalDiscountPercent = 0;
  if (couponCode) {
    const uppercaseCode = couponCode.toUpperCase().trim();
    if (VALID_COUPONS[uppercaseCode] !== undefined) {
      finalDiscountPercent = VALID_COUPONS[uppercaseCode];
    } else {
      throw new Error(`Invalid discount coupon code: ${couponCode}`);
    }
  }

  const discountAmount = Math.round((calculatedSubtotal * finalDiscountPercent) / 100);
  const discountedSubtotal = Math.max(0, calculatedSubtotal - discountAmount);
  const payableTotal = discountedSubtotal + DELIVERY_CHARGE;

  return {
    subtotal: calculatedSubtotal,
    discountAmount,
    discountPercent: finalDiscountPercent,
    payableTotal,
    verifiedItems
  };
};

/**
 * Atomically decrements stock for list of items. Rolls back already decremented items if any fail.
 */
const decrementProductStock = async (items) => {
  const decrementedItems = [];

  for (const item of items) {
    // Atomic update: only decrement if stock is >= quantity
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity, purchases: item.quantity } },
      { new: true }
    );

    if (!updatedProduct) {
      // Rollback all previously decremented items
      for (const rolledBack of decrementedItems) {
        await Product.findByIdAndUpdate(rolledBack.product, {
          $inc: { stock: rolledBack.quantity, purchases: -rolledBack.quantity }
        });
      }
      return {
        success: false,
        failedProduct: item.name || 'a product'
      };
    }

    decrementedItems.push(item);
  }

  return { success: true };
};

/**
 * Sends a transactional order receipt email to the user.
 */
const sendOrderConfirmationEmail = async (order, userEmail) => {
  try {
    const itemsList = order.items
      .map(item => `• ${item.quantity}x ${item.name} (${item.size || 'Standard'}/${item.color || 'None'}) — Rs. ${item.price * item.quantity}`)
      .join('\n');

    const address = order.shippingAddress;
    const addressStr = `${address.fullName}, ${address.street}, ${address.city}, ${address.state} (${address.pincode})`;

    const emailBody = `Thank you for your order at Wajahat Fabrics & Bedding Store!

Order Reference: #${order._id.toString().slice(-8)}
Order Status: ${order.orderStatus}
Payment Method: ${order.paymentMethod}
Payment Status: ${order.paymentStatus}

Order Details:
${itemsList}

Delivery Fee: Rs. ${DELIVERY_CHARGE}
Total Amount: Rs. ${order.totalAmount}

Shipping Address:
${addressStr}
Phone: ${address.phone}

We are processing your order and will dispatch it shortly. Standard delivery takes 2-5 business days.

For support, call us at +92 327 6354709.

Best Regards,
Wajahat Fabrics Team
Plot 23-C, Sector G, LDA Scheme, Lahore, Pakistan.`;

    await sendEmail({
      email: userEmail,
      subject: `Order Confirmed! Reference #${order._id.toString().slice(-8)} — Wajahat Fabrics`,
      message: emailBody
    });
  } catch (error) {
    console.error('Failed to send transactional order email:', error.message);
  }
};

module.exports = {
  calculateSecureOrderTotal,
  decrementProductStock,
  sendOrderConfirmationEmail,
  DELIVERY_CHARGE
};
