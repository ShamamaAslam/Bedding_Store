const express = require('express');
const router = express.Router();
const { assistantChat, assistantSuggest, assistantSeo } = require('../Controllers/AssistantController');
const { optionalAuth } = require('../Middleware/optionalAuthMiddleware');

router.post('/chat', optionalAuth, assistantChat);
router.get('/suggest', assistantSuggest);
router.post('/seo', optionalAuth, assistantSeo);

module.exports = router;
