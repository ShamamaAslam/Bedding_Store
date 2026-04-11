const express = require('express');
const router = express.Router();
const { createPaymentIntent } = require('../Controllers/PaymentController.js');
const { protect } = require('../Middleware/authMiddleware');

router.post('/create-intent', protect, createPaymentIntent);

module.exports = router;