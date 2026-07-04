const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createOrUpdateProfile, getMyProfile } = require('../controllers/tenantController');

router.post('/profile', protect, authorize('tenant'), createOrUpdateProfile);
router.get('/profile', protect, authorize('tenant'), getMyProfile);

module.exports = router;