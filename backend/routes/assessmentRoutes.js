const express = require('express');
const router = express.Router();
const { createAssessment, getAssessmentById } = require('../controllers/assessmentController');

router.post('/', createAssessment);
router.get('/:id', getAssessmentById);

module.exports = router;