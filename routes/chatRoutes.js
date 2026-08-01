const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const chatController = require('../controllers/chatController');

router.get('/messages/:user1/:user2', protect, chatController.getMessages);

module.exports = router;
