const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const { adminMiddleware } = require('../Middleware/AdminMiddleware');  // ← No .default
const {
  createOrder,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus
} = require('../Controllers/OrderController');

// User routes
router.post('/', protect, createOrder);
router.get('/my-orders', protect, getUserOrders);
router.get('/:id', protect, getOrderById);

// Admin routes
router.get('/admin/all', protect, adminMiddleware, getAllOrders);
router.put('/admin/:id/status', protect, adminMiddleware, updateOrderStatus);

module.exports = router;