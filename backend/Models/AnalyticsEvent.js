const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: [
      'session_source',
      'product_view',
      'product_click',
      'add_to_cart',
      'wishlist_add',
      'wishlist_remove',
      'search_query',
      'checkout_start',
      'checkout_shipping_filled',
      'checkout_payment_selected',
      'checkout_submit_attempt',
      'checkout_payment_failed',
      'checkout_payment_success',
      'checkout_order_success'
    ]
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  sessionId: {
    type: String,
    index: true,
    trim: true,
    default: ''
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products',
    default: null
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  keyword: {
    type: String,
    trim: true,
    default: ''
  },
  source: {
    type: String,
    trim: true,
    default: ''
  },
  step: {
    type: String,
    trim: true,
    default: ''
  },
  page: {
    type: String,
    trim: true,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

analyticsEventSchema.index({ eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ product: 1, eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ user: 1, eventType: 1, createdAt: -1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);