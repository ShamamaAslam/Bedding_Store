const express = require('express');
const router = express.Router();
const {
  createPaymentIntent,
  createPayfastSession,
  verifyPayfastSession
} = require('../Controllers/PaymentController.js');
const { protect } = require('../Middleware/authMiddleware');

router.post('/create-intent', protect, createPaymentIntent);
router.post('/payfast/create-session', protect, createPayfastSession);
router.post('/payfast/verify', protect, verifyPayfastSession);

module.exports = router;