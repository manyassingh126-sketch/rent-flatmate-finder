const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  interestRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'InterestRequest', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);