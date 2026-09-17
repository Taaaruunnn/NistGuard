const mongoose = require('mongoose');
const { SEVERITIES, IMPACT_LEVELS } = require('../config/tiers');

/**
 * A gap worth acting on.
 *
 * Auto findings are derived from responses by services/scoring.js and are
 * regenerated whenever responses change -- they are a materialised view, not a
 * source of truth. Manual findings (source: 'manual') are author-owned and are
 * never touched by regeneration.
 */
const findingSchema = new mongoose.Schema(
  {
    assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true, index: true },
    subcategory: { type: mongoose.Schema.Types.ObjectId, ref: 'NistSubcategory', required: true },
    subcategoryCode: { type: String, required: true, uppercase: true },
    categoryCode: { type: String, required: true, uppercase: true },
    functionCode: { type: String, required: true, uppercase: true },

    currentTier: { type: Number, required: true },
    targetTier: { type: Number, required: true },
    gap: { type: Number, required: true }, // targetTier - currentTier, floored at 0

    severity: { type: String, enum: SEVERITIES, required: true },
    businessImpact: { type: String, enum: IMPACT_LEVELS.map((i) => i.key), required: true },

    /** gap x impact weight -- what the findings list is actually sorted by. */
    priorityScore: { type: Number, required: true },

    impactNote: { type: String, default: '' },
    recommendation: { type: String, default: '' },

    source: { type: String, enum: ['auto', 'manual'], default: 'auto' },
    status: { type: String, enum: ['open', 'accepted', 'remediated'], default: 'open' },
  },
  { timestamps: true }
);

findingSchema.index({ assessment: 1, priorityScore: -1 });

module.exports = mongoose.models.Finding || mongoose.model('Finding', findingSchema);
