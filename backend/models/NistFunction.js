const mongoose = require('mongoose');

/** One of the six CSF 2.0 Functions (GV, ID, PR, DE, RS, RC). Reference data. */
const nistFunctionSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true }, // 'GV'
  name: { type: String, required: true },                                // 'Govern'
  description: { type: String, required: true },
  order: { type: Number, required: true }, // canonical NIST ordering
});

module.exports = mongoose.models.NistFunction || mongoose.model('NistFunction', nistFunctionSchema);
