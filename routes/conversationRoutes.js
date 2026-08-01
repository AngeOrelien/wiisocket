const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const conversationController = require('../controllers/conversationController');

router.get('/', protect, conversationController.getConversations);

module.exports = router;
