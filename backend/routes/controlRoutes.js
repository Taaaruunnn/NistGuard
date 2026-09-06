const express = require('express');
const router = express.Router();
const { getControls } = require('../controllers/controlController');

router.get('/', getControls);

module.exports = router;