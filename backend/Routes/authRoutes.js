const express = require('express');
const router = express.Router();
const {
  registerUser, loginUser, getProfile,
  getWishlist, addToWishlist, removeFromWishlist,
  getAllUsers, updateUserRole
} = require('../Controllers/authController');
const { protect } = require('../Middleware/authMiddleware');
const { adminMiddleware } = require('../Middleware/AdminMiddleware');

// ── Public ────────────────────────────────────────────────
router.post('/register', registerUser);
router.post('/login', loginUser);

// ── User (protected) ─────────────────────────────────────
router.get('/profile', protect, getProfile);

// Wishlist
router.get('/wishlist', protect, getWishlist);
router.post('/wishlist/:productId', protect, addToWishlist);
router.delete('/wishlist/:productId', protect, removeFromWishlist);

// ── Admin ─────────────────────────────────────────────────
router.get('/admin/users', protect, adminMiddleware, getAllUsers);
router.patch('/admin/users/:id', protect, adminMiddleware, updateUserRole);

module.exports = router;