const User = require('../models/User');
const Listing = require('../models/Listing');
const InterestRequest = require('../models/InterestRequest');

const getAllUsers = async (req, res) => {
  const users = await User.find().select('-password');
  res.status(200).json(users);
};

const getAllListings = async (req, res) => {
  const listings = await Listing.find().populate('owner', 'name email');
  res.status(200).json(listings);
};

const getActivitySummary = async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalListings = await Listing.countDocuments();
  const totalInterests = await InterestRequest.countDocuments();
  const filledListings = await Listing.countDocuments({ isFilled: true });
  res.status(200).json({ totalUsers, totalListings, totalInterests, filledListings });
};

const deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(200).json({ message: 'User deleted' });
};

const deleteListing = async (req, res) => {
  await Listing.findByIdAndDelete(req.params.id);
  res.status(200).json({ message: 'Listing deleted' });
};

module.exports = { getAllUsers, getAllListings, getActivitySummary, deleteUser, deleteListing };