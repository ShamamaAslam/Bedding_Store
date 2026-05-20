const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products',
    required: true
  },
  name: String,
  price: Number,
  quantity: { type: Number, required: true },
  size: String,
  color: String
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  shippingAddress: {
    fullName: String,
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'Pakistan' },
    phone: String
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Card', 'UPI'],
    default: 'COD'
  },
  marketingSource: {
    type: String,
    default: 'direct'
  },
  checkoutSessionId: {
    type: String,
    default: ''
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed'],
    default: 'Pending'
  },
  stripePaymentId: {
    type: String,
    default: null
  },
  stockUpdated: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    default: ''
  },
  trackingNumber: {
    type: String,
    default: ''
  },
  orderStatus: {
    type: String,
    enum: ['Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Processing'
  },
  returnedAt: {
    type: Date,
    default: null
  },
  returnReason: {
    type: String,
    default: ''
  },
  isDefective: {
    type: Boolean,
    default: false
  },
  refundAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);