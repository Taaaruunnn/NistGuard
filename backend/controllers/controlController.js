const NistControl = require('../models/NistControl');

// @desc    Get all NIST controls
// @route   GET /api/controls
const getControls = async (req, res) => {
  try {
    const controls = await NistControl.find({});
    res.status(200).json(controls);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching controls' });
  }
};

module.exports = { getControls };