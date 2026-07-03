const Listing = require('../models/Listing');

// Create a new listing (owner only)
const createListing = async (req, res) => {
  try {
    const { location, rent, availableFrom, roomType, furnishingStatus } = req.body;

    if (!location || !rent || !availableFrom || !roomType || !furnishingStatus) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const photos = req.files ? req.files.map((file) => `/uploads/${file.filename}`) : [];

    const listing = await Listing.create({
      owner: req.user.id,
      location,
      rent,
      availableFrom,
      roomType,
      furnishingStatus,
      photos,
    });

    res.status(201).json(listing);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all listings (with optional filters), excludes filled listings
const getListings = async (req, res) => {
  try {
    const { location, minBudget, maxBudget } = req.query;
    const filter = { isFilled: false };

    if (location) filter.location = { $regex: location, $options: 'i' };
    if (minBudget || maxBudget) {
      filter.rent = {};
      if (minBudget) filter.rent.$gte = Number(minBudget);
      if (maxBudget) filter.rent.$lte = Number(maxBudget);
    }

    const listings = await Listing.find(filter).populate('owner', 'name email');
    res.status(200).json(listings);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get listings posted by the logged-in owner
const getMyListings = async (req, res) => {
  try {
    const listings = await Listing.find({ owner: req.user.id });
    res.status(200).json(listings);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update a listing (owner only, must own it)
const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to edit this listing' });
    }

    Object.assign(listing, req.body);
    await listing.save();
    res.status(200).json(listing);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Mark listing as filled
const markAsFilled = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    listing.isFilled = true;
    await listing.save();
    res.status(200).json(listing);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete a listing
const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await listing.deleteOne();
    res.status(200).json({ message: 'Listing deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { createListing, getListings, getMyListings, updateListing, markAsFilled, deleteListing };