const mongoose = require('mongoose');

/** A CSF 2.0 Category, e.g. GV.OC "Organizational Context". Reference data. */
const nistCategorySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true }, // 'GV.OC'
  functionCode: { type: String, required: true, uppercase: true, index: true },
  function: { type: mongoose.Schema.Types.ObjectId, ref: 'NistFunction', required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  order: { type: Number, required: true },
});

module.exports = mongoose.models.NistCategory || mongoose.model('NistCategory', nistCategorySchema);
