const mongoose = require('mongoose');

const tenantProfileSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  preferredLocation: { type: String, required: true },
  budgetMin: { type: Number, required: true },
  budgetMax: { type: Number, required: true },
  moveInDate: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('TenantProfile', tenantProfileSchema);