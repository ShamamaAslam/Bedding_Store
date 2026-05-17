const express = require('express');
const router = express.Router();
const { getAnalytics, logAnalyticsEvent, getPersonalizedRecommendations } = require('../Controllers/AnalyticsController');
const { protect } = require('../Middleware/authMiddleware');
const { adminMiddleware } = require('../Middleware/AdminMiddleware');
const { optionalAuth } = require('../Middleware/optionalAuthMiddleware');

router.get('/', protect, adminMiddleware, getAnalytics);
router.post('/events', optionalAuth, logAnalyticsEvent);
router.get('/recommendations', optionalAuth, getPersonalizedRecommendations);

module.exports = router;
