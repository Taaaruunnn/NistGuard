const mongoose = require('mongoose');
const { MIN_TIER, MAX_TIER, IMPACT_LEVELS, DEFAULT_IMPACT } = require('../config/tiers');

/**
 * One response per subcategory per assessment.
 *
 * Responses are created lazily -- an assessment starts with none, and a
 * subcategory the user has not reached yet simply has no Response document.
 * That keeps "unanswered" distinct from "answered as Not Performed", which
 * matters a great deal for an honest completion percentage.
 */
const responseSchema = new mongoose.Schema(
  {
    assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true, index: true },
    subcategory: { type: mongoose.Schema.Types.ObjectId, ref: 'NistSubcategory', required: true },
    subcategoryCode: { type: String, required: true, uppercase: true },
    categoryCode: { type: String, required: true, uppercase: true },
    functionCode: { type: String, required: true, uppercase: true },

    tier: { type: Number, min: MIN_TIER, max: MAX_TIER, required: true },

    /** Excluded from scoring entirely rather than counted as a zero. */
    notApplicable: { type: Boolean, default: false },

    businessImpact: {
      type: String,
      enum: IMPACT_LEVELS.map((i) => i.key),
      default: DEFAULT_IMPACT,
    },

    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

// One response per subcategory per assessment; makes upserts safe under retry.
responseSchema.index({ assessment: 1, subcategory: 1 }, { unique: true });

module.exports = mongoose.models.Response || mongoose.model('Response', responseSchema);
