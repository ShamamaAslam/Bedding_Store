const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const { adminMiddleware } = require('../Middleware/AdminMiddleware');
const {
  createOrder,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  updateOrderShippingAddress
} = require('../Controllers/OrderController');
const rateLimiter = require('../Middleware/rateLimiter');

const checkoutLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 15, message: 'Too many order attempts, please try again in 15 minutes.' });

// User routes
router.post('/', protect, checkoutLimiter, createOrder);
router.get('/my-orders', protect, getUserOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/shipping', protect, updateOrderShippingAddress);

// Admin routes
router.get('/admin/all', protect, adminMiddleware, getAllOrders);
router.put('/admin/:id/status', protect, adminMiddleware, updateOrderStatus);

module.exports = router;