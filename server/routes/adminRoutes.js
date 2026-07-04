const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAllUsers, getAllListings, getActivitySummary, deleteUser, deleteListing } = require('../controllers/adminController');

router.get('/users', protect, authorize('admin'), getAllUsers);
router.get('/listings', protect, authorize('admin'), getAllListings);
router.get('/activity', protect, authorize('admin'), getActivitySummary);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);
router.delete('/listings/:id', protect, authorize('admin'), deleteListing);

module.exports = router;