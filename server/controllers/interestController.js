const InterestRequest = require('../models/InterestRequest');
const CompatibilityScore = require('../models/CompatibilityScore');
const Listing = require('../models/Listing');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');

// Tenant sends interest in a listing
const sendInterest = async (req, res) => {
  try {
    const { listingId } = req.body;
    const tenantId = req.user.id;

    const existing = await InterestRequest.findOne({ tenant: tenantId, listing: listingId });
    if (existing) return res.status(400).json({ message: 'Interest already expressed for this listing' });

    const listing = await Listing.findById(listingId).populate('owner');
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const interest = await InterestRequest.create({ tenant: tenantId, listing: listingId });

    // Check compatibility score, notify owner if high
    const scoreDoc = await CompatibilityScore.findOne({ tenant: tenantId, listing: listingId });
    if (scoreDoc && scoreDoc.score > 80) {
      const tenant = await User.findById(tenantId);
      await sendEmail(
        listing.owner.email,
        'High Compatibility Interest Received',
        `${tenant.name} (score: ${scoreDoc.score}/100) has expressed interest in your listing at ${listing.location}. Explanation: ${scoreDoc.explanation}`
      );
    }

    res.status(201).json(interest);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Owner responds to interest (accept/decline)
const respondToInterest = async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' or 'declined'
    const interest = await InterestRequest.findById(req.params.id).populate('listing').populate('tenant', 'name email');

    if (!interest) return res.status(404).json({ message: 'Interest request not found' });
    if (interest.listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    interest.status = status;
    await interest.save();

    await sendEmail(
      interest.tenant.email,
      `Your interest request was ${status}`,
      `The owner has ${status} your interest in the listing at ${interest.listing.location}.`
    );

    res.status(200).json(interest);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get interests for logged-in owner (their listings)
const getOwnerInterests = async (req, res) => {
  try {
    const listings = await Listing.find({ owner: req.user.id }).select('_id');
    const listingIds = listings.map((l) => l._id);
    const interests = await InterestRequest.find({ listing: { $in: listingIds } })
      .populate('tenant', 'name email')
      .populate('listing', 'location rent');
    res.status(200).json(interests);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get interests sent by logged-in tenant
const getTenantInterests = async (req, res) => {
  try {
    const interests = await InterestRequest.find({ tenant: req.user.id }).populate('listing');
    res.status(200).json(interests);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { sendInterest, respondToInterest, getOwnerInterests, getTenantInterests };