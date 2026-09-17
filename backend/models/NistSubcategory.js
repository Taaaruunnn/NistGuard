const mongoose = require('mongoose');

/**
 * A CSF 2.0 Subcategory, e.g. GV.OC-01. This is the unit a user actually scores
 * during an assessment, so it is the join point for Response and Finding.
 */
const nistSubcategorySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true }, // 'GV.OC-01'
  categoryCode: { type: String, required: true, uppercase: true, index: true },
  functionCode: { type: String, required: true, uppercase: true, index: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'NistCategory', required: true },
  function: { type: mongoose.Schema.Types.ObjectId, ref: 'NistFunction', required: true },
  statement: { type: String, required: true },
  implementationExamples: [{ type: String }],
  order: { type: Number, required: true },
});

module.exports = mongoose.models.NistSubcategory || mongoose.model('NistSubcategory', nistSubcategorySchema);
