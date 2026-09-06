const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  organizationName: { type: String, required: true },
  industry: { type: String, required: true },
  scope: { type: String, required: true }, // e.g., 'Internal Network', 'Cloud Infrastructure'
  
  // An array mapping user answers to specific NIST controls
  responses: [{
    controlId: { type: mongoose.Schema.Types.ObjectId, ref: 'NistControl', required: true },
    implementationStatus: { 
      type: String, 
      enum: ['Fully Implemented', 'Partially Implemented', 'Not Implemented', 'Not Applicable'],
      required: true
    },
    evidence: { type: String }, // Links to documents or notes
  }],

  // Storing the calculated risk scores out of 100
  scores: {
    govern: { type: Number, default: 0 },
    identify: { type: Number, default: 0 },
    protect: { type: Number, default: 0 },
    detect: { type: Number, default: 0 },
    respond: { type: Number, default: 0 },
    recover: { type: Number, default: 0 },
    overallScore: { type: Number, default: 0 }
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('Assessment', assessmentSchema);