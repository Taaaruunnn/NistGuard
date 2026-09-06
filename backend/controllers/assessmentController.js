const Assessment = require('../models/Assessment');
const NistControl = require('../models/NistControl');

const getScoreMultiplier = (status) => {
  switch (status) {
    case 'Fully Implemented': return 1.0;
    case 'Partially Implemented': return 0.5;
    case 'Not Implemented': default: return 0.0;
  }
};

const createAssessment = async (req, res) => {
  try {
    const { organizationName, industry, scope, responses } = req.body;

    if (!organizationName || !industry || !scope || !responses || !responses.length) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    const controlIds = responses.map((r) => r.controlId);
    const controls = await NistControl.find({ _id: { $in: controlIds } });

    const controlMap = new Map();
    controls.forEach((c) => controlMap.set(c._id.toString(), c.function));

    const functionStats = {
      Govern: { earned: 0, total: 0 },
      Identify: { earned: 0, total: 0 },
      Protect: { earned: 0, total: 0 },
      Detect: { earned: 0, total: 0 },
      Respond: { earned: 0, total: 0 },
      Recover: { earned: 0, total: 0 },
    };

    // ... (previous code remains the same)
        responses.forEach((resp) => {
          const func = controlMap.get(resp.controlId.toString());
          if (func && resp.implementationStatus !== 'Not Applicable') {
            const points = getScoreMultiplier(resp.implementationStatus) * 100;
            functionStats[func].earned += points;
            functionStats[func].total += 100;
          }
        });

        // FIXED: Removed the "/ 100" at the end of the round function
        const computePercentage = (stats) =>
          stats.total > 0 ? Math.round((stats.earned / stats.total) * 100) : 0;

        const scores = {
          govern: computePercentage(functionStats.Govern),
          identify: computePercentage(functionStats.Identify),
          protect: computePercentage(functionStats.Protect),
          detect: computePercentage(functionStats.Detect),
          respond: computePercentage(functionStats.Respond),
          recover: computePercentage(functionStats.Recover),
        };

        // FIXED: Removed the "/ 100" at the end of the round function
        const totalEarned = Object.values(functionStats).reduce((acc, curr) => acc + curr.earned, 0);
        const totalPossible = Object.values(functionStats).reduce((acc, curr) => acc + curr.total, 0);
        scores.overallScore = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
        
        // ... (saving to Assessment.create remains the same)

    const assessment = await Assessment.create({
      organizationName, industry, scope, responses, scores,
    });

    res.status(201).json({ success: true, data: assessment });
  } catch (error) {
    console.error('Assessment creation error:', error);
    res.status(500).json({ message: 'Server error creating assessment' });
  }
};

const getAssessmentById = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id).populate(
      'responses.controlId',
      'function categoryId categoryName subcategoryId description'
    );
    if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
    res.status(200).json({ success: true, data: assessment });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving assessment' });
  }
};

module.exports = { createAssessment, getAssessmentById };