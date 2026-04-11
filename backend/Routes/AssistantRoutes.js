const express = require('express');
const router = express.Router();
const { assistantChat, assistantSuggest } = require('../Controllers/AssistantController');
const { optionalAuth } = require('../Middleware/optionalAuthMiddleware');

router.post('/chat', optionalAuth, assistantChat);
router.get('/suggest', assistantSuggest);

module.exports = router;
