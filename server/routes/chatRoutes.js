const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getChatHistory } = require('../controllers/chatController');

router.get('/:interestRequestId', protect, getChatHistory);

module.exports = router;