const express = require('express');
const router = express.Router();
const {
  registerUser, loginUser, getProfile,
  forgotPassword, resetPassword, updatePassword,
  getWishlist, addToWishlist, removeFromWishlist,
  getAllUsers, updateUserRole
} = require('../Controllers/authController');
const { protect } = require('../Middleware/authMiddleware');
const { adminMiddleware } = require('../Middleware/AdminMiddleware');

const rateLimiter = require('../Middleware/rateLimiter');

const loginLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts, please try again in 15 minutes.' });
const forgotPasswordLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 5, message: 'Too many password reset attempts, please try again in 15 minutes.' });

// ── Public ────────────────────────────────────────────────
router.post('/register', registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/forgotpassword', forgotPasswordLimiter, forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

// ── User (protected) ─────────────────────────────────────
router.get('/profile', protect, getProfile);
router.put('/updatepassword', protect, updatePassword);

// Wishlist
router.get('/wishlist', protect, getWishlist);
router.post('/wishlist/:productId', protect, addToWishlist);
router.delete('/wishlist/:productId', protect, removeFromWishlist);

// ── Admin ─────────────────────────────────────────────────
router.get('/admin/users', protect, adminMiddleware, getAllUsers);
router.patch('/admin/users/:id', protect, adminMiddleware, updateUserRole);

module.exports = router;