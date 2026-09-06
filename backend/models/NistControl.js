const mongoose = require('mongoose');

const nistControlSchema = new mongoose.Schema({
  function: { 
    type: String, 
    required: true,
    enum: ['Govern', 'Identify', 'Protect', 'Detect', 'Respond', 'Recover'] 
  },
  categoryId: { type: String, required: true }, // e.g., 'GV.OC'
  categoryName: { type: String, required: true }, // e.g., 'Organizational Context'
  subcategoryId: { type: String, required: true }, // e.g., 'GV.OC-01'
  description: { type: String, required: true } // The actual requirement text
});

module.exports = mongoose.model('NistControl', nistControlSchema);