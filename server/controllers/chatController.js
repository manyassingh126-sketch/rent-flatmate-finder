const ChatMessage = require('../models/ChatMessage');
const InterestRequest = require('../models/InterestRequest');

const getChatHistory = async (req, res) => {
  try {
    const { interestRequestId } = req.params;

    const interest = await InterestRequest.findById(interestRequestId).populate('listing');
    if (!interest) return res.status(404).json({ message: 'Interest request not found' });
    if (interest.status !== 'accepted') {
      return res.status(403).json({ message: 'Chat only available for accepted interests' });
    }

    const isOwner = interest.listing.owner.toString() === req.user.id;
    const isTenant = interest.tenant.toString() === req.user.id;
    if (!isOwner && !isTenant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const messages = await ChatMessage.find({ interestRequest: interestRequestId })
      .populate('sender', 'name')
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getChatHistory };