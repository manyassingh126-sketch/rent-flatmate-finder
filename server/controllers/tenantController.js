const TenantProfile = require('../models/TenantProfile');

// Create or update tenant profile (upsert)
const createOrUpdateProfile = async (req, res) => {
  try {
    const { preferredLocation, budgetMin, budgetMax, moveInDate } = req.body;

    if (!preferredLocation || !budgetMin || !budgetMax || !moveInDate) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const profile = await TenantProfile.findOneAndUpdate(
      { tenant: req.user.id },
      { tenant: req.user.id, preferredLocation, budgetMin, budgetMax, moveInDate },
      { new: true, upsert: true }
    );

    res.status(200).json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get logged-in tenant's own profile
const getMyProfile = async (req, res) => {
  try {
    const profile = await TenantProfile.findOne({ tenant: req.user.id });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.status(200).json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { createOrUpdateProfile, getMyProfile };