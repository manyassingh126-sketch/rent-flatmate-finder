const mongoose = require('mongoose');

const compatibilityScoreSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  score: { type: Number, required: true, min: 0, max: 100 },
  explanation: { type: String, required: true },
  source: { type: String, enum: ['llm', 'rule-based'], required: true },
}, { timestamps: true });

compatibilityScoreSchema.index({ tenant: 1, listing: 1 }, { unique: true });

module.exports = mongoose.model('CompatibilityScore', compatibilityScoreSchema);