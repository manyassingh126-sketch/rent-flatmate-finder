const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { sendInterest, respondToInterest, getOwnerInterests, getTenantInterests } = require('../controllers/interestController');

router.post('/', protect, authorize('tenant'), sendInterest);
router.patch('/:id/respond', protect, authorize('owner'), respondToInterest);
router.get('/owner', protect, authorize('owner'), getOwnerInterests);
router.get('/tenant', protect, authorize('tenant'), getTenantInterests);

module.exports = router;