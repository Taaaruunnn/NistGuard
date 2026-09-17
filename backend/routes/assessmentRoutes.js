const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/assessmentController');

// Everything below is scoped to the signed-in user's own assessments.
router.use(requireAuth);

router.get('/', c.listAssessments);
router.post('/', c.createAssessment);

router.get('/:id', c.getAssessment);
router.put('/:id', c.updateAssessment);
router.patch('/:id', c.updateAssessment);
router.delete('/:id', c.deleteAssessment);

router.get('/:id/responses', c.getResponses);
router.put('/:id/responses', c.saveResponses);
router.post('/:id/responses', c.saveResponses);

router.get('/:id/scores', c.getScores);

router.get('/:id/findings', c.getFindings);
router.post('/:id/findings', c.createFinding);
router.patch('/:id/findings/:findingId', c.updateFinding);

router.get('/:id/report', c.getReport);

module.exports = router;
