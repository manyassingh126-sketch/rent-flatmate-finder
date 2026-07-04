const CompatibilityScore = require('../models/CompatibilityScore');
const TenantProfile = require('../models/TenantProfile');
const Listing = require('../models/Listing');
const { computeCompatibility } = require('../services/compatibilityService');

// Get (or compute + cache) compatibility score for a tenant-listing pair
const getScore = async (req, res) => {
  try {
    const { listingId } = req.params;
    const tenantId = req.user.id;

    let existing = await CompatibilityScore.findOne({ tenant: tenantId, listing: listingId });
    if (existing) {
      return res.status(200).json(existing);
    }

    const tenantProfile = await TenantProfile.findOne({ tenant: tenantId });
    const listing = await Listing.findById(listingId);

    if (!tenantProfile) return res.status(400).json({ message: 'Complete your tenant profile first' });
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const result = await computeCompatibility(tenantProfile, listing);

    const scoreDoc = await CompatibilityScore.create({
      tenant: tenantId,
      listing: listingId,
      score: result.score,
      explanation: result.explanation,
      source: result.source,
    });

    res.status(201).json(scoreDoc);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all listings ranked by compatibility score for the logged-in tenant
const getRankedListings = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const tenantProfile = await TenantProfile.findOne({ tenant: tenantId });
    if (!tenantProfile) return res.status(400).json({ message: 'Complete your tenant profile first' });

    const listings = await Listing.find({ isFilled: false }).populate('owner', 'name email');

    const results = await Promise.all(
      listings.map(async (listing) => {
        let scoreDoc = await CompatibilityScore.findOne({ tenant: tenantId, listing: listing._id });
        if (!scoreDoc) {
          const result = await computeCompatibility(tenantProfile, listing);
          scoreDoc = await CompatibilityScore.create({
            tenant: tenantId,
            listing: listing._id,
            score: result.score,
            explanation: result.explanation,
            source: result.source,
          });
        }
        return { listing, compatibility: scoreDoc };
      })
    );

    results.sort((a, b) => b.compatibility.score - a.compatibility.score);
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getScore, getRankedListings };