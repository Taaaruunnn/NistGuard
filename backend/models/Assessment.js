const mongoose = require('mongoose');
const { DEFAULT_TARGET_TIER, MIN_TIER, MAX_TIER } = require('../config/tiers');

const assessmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    organizationName: { type: String, trim: true, default: '' },
    industry: { type: String, trim: true, default: '' },
    scope: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['in-progress', 'completed'],
      default: 'in-progress',
      index: true,
    },
    /**
     * The tier every subcategory is measured against. Configurable per
     * assessment so a startup can target "Risk Informed" while a bank targets
     * "Adaptive" without either being scored against the wrong bar.
     */
    targetTier: {
      type: Number,
      min: MIN_TIER,
      max: MAX_TIER,
      default: DEFAULT_TARGET_TIER,
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

module.exports = mongoose.models.Assessment || mongoose.model('Assessment', assessmentSchema);
