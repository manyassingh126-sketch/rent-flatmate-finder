const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getScore, getRankedListings } = require('../controllers/compatibilityController');

router.get('/ranked-listings', protect, authorize('tenant'), getRankedListings);
router.get('/:listingId', protect, authorize('tenant'), getScore);

module.exports = router;