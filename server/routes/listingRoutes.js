const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createListing,
  getListings,
  getMyListings,
  updateListing,
  markAsFilled,
  deleteListing,
} = require('../controllers/listingController');

router.post('/', protect, authorize('owner'), upload.array('photos', 5), createListing);
router.get('/', getListings);
router.get('/my-listings', protect, authorize('owner'), getMyListings);
router.put('/:id', protect, authorize('owner'), updateListing);
router.patch('/:id/fill', protect, authorize('owner'), markAsFilled);
router.delete('/:id', protect, authorize('owner'), deleteListing);

module.exports = router;