const mongoose = require('mongoose');

const Assessment = require('../models/Assessment');
const Response = require('../models/Response');
const Finding = require('../models/Finding');
const NistFunction = require('../models/NistFunction');
const NistCategory = require('../models/NistCategory');
const NistSubcategory = require('../models/NistSubcategory');

const { computeAssessment, buildFindings } = require('../services/scoring');
const {
  MIN_TIER,
  MAX_TIER,
  DEFAULT_TARGET_TIER,
  IMPACT_LEVELS,
  tierLabel,
} = require('../config/tiers');

const IMPACT_KEYS = IMPACT_LEVELS.map((i) => i.key);

/** Load an assessment and prove it belongs to the caller. */
const ownedAssessment = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ message: 'That is not a valid assessment id.' });
    return null;
  }
  const assessment = await Assessment.findOne({ _id: id, user: req.user._id });
  if (!assessment) {
    res.status(404).json({ message: 'Assessment not found.' });
    return null;
  }
  return assessment;
};

/** Reference data is identical for every request, so cache it per warm container. */
let refCache = null;
const loadReference = async () => {
  if (refCache) return refCache;
  const [functions, categories, subcategories] = await Promise.all([
    NistFunction.find({}).sort({ order: 1 }).lean(),
    NistCategory.find({}).sort({ order: 1 }).lean(),
    NistSubcategory.find({}).sort({ order: 1 }).lean(),
  ]);
  if (functions.length && subcategories.length) {
    refCache = { functions, categories, subcategories };
  }
  return { functions, categories, subcategories };
};

const evaluate = async (assessment) => {
  const [{ functions, categories, subcategories }, responses] = await Promise.all([
    loadReference(),
    Response.find({ assessment: assessment._id }).lean(),
  ]);
  return computeAssessment({
    subcategories,
    responses,
    targetTier: assessment.targetTier ?? DEFAULT_TARGET_TIER,
    categories,
    functions,
  });
};

/**
 * Auto findings are a materialised view of the responses, so rebuild them from
 * scratch on every change. Manual findings are author-owned and left alone.
 */
const regenerateFindings = async (assessment, evaluation) => {
  const docs = buildFindings(evaluation.subcategories, assessment._id, assessment.targetTier);
  await Finding.deleteMany({ assessment: assessment._id, source: 'auto' });
  if (docs.length) await Finding.insertMany(docs);
  return docs.length;
};

// ---------------------------------------------------------------- assessments

const listAssessments = async (req, res) => {
  try {
    const assessments = await Assessment.find({ user: req.user._id }).sort({ updatedAt: -1 }).lean();

    // Attach a light progress summary so the dashboard does not need N calls.
    const ids = assessments.map((a) => a._id);
    const counts = await Response.aggregate([
      { $match: { assessment: { $in: ids } } },
      { $group: { _id: '$assessment', answered: { $sum: 1 } } },
    ]);
    const answeredBy = new Map(counts.map((c) => [String(c._id), c.answered]));
    const total = await NistSubcategory.estimatedDocumentCount();

    return res.json(
      assessments.map((a) => ({
        ...a,
        answered: answeredBy.get(String(a._id)) || 0,
        totalSubcategories: total,
      }))
    );
  } catch (err) {
    console.error('listAssessments error:', err);
    return res.status(500).json({ message: 'Could not load your assessments.' });
  }
};

const createAssessment = async (req, res) => {
  try {
    const { name, organizationName, industry, scope, targetTier } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Give the assessment a name.' });
    }

    let target = Number(targetTier);
    if (!Number.isInteger(target) || target < MIN_TIER || target > MAX_TIER) {
      target = DEFAULT_TARGET_TIER;
    }

    const assessment = await Assessment.create({
      user: req.user._id,
      name: String(name).trim(),
      organizationName: organizationName || req.user.organizationName || '',
      industry: industry || '',
      scope: scope || '',
      targetTier: target,
      status: 'in-progress',
    });

    return res.status(201).json(assessment);
  } catch (err) {
    console.error('createAssessment error:', err);
    return res.status(500).json({ message: 'Could not create the assessment.' });
  }
};

const getAssessment = async (req, res) => {
  try {
    const assessment = await ownedAssessment(req, res);
    if (!assessment) return undefined;

    const evaluation = await evaluate(assessment);
    return res.json({ assessment, overall: evaluation.overall });
  } catch (err) {
    console.error('getAssessment error:', err);
    return res.status(500).json({ message: 'Could not load the assessment.' });
  }
};

const updateAssessment = async (req, res) => {
  try {
    const assessment = await ownedAssessment(req, res);
    if (!assessment) return undefined;

    const { name, organizationName, industry, scope, targetTier, status } = req.body || {};

    if (name !== undefined) assessment.name = String(name).trim() || assessment.name;
    if (organizationName !== undefined) assessment.organizationName = organizationName;
    if (industry !== undefined) assessment.industry = industry;
    if (scope !== undefined) assessment.scope = scope;

    let targetChanged = false;
    if (targetTier !== undefined) {
      const t = Number(targetTier);
      if (!Number.isInteger(t) || t < MIN_TIER || t > MAX_TIER) {
        return res.status(400).json({ message: `targetTier must be an integer between ${MIN_TIER} and ${MAX_TIER}.` });
      }
      targetChanged = t !== assessment.targetTier;
      assessment.targetTier = t;
    }

    if (status !== undefined) {
      if (!['in-progress', 'completed'].includes(status)) {
        return res.status(400).json({ message: 'status must be "in-progress" or "completed".' });
      }
      assessment.status = status;
      assessment.completedAt = status === 'completed' ? new Date() : null;
    }

    await assessment.save();

    // Moving the target bar changes every gap, so the findings must be rebuilt.
    if (targetChanged) {
      const evaluation = await evaluate(assessment);
      await regenerateFindings(assessment, evaluation);
    }

    return res.json(assessment);
  } catch (err) {
    console.error('updateAssessment error:', err);
    return res.status(500).json({ message: 'Could not update the assessment.' });
  }
};

const deleteAssessment = async (req, res) => {
  try {
    const assessment = await ownedAssessment(req, res);
    if (!assessment) return undefined;

    await Promise.all([
      Response.deleteMany({ assessment: assessment._id }),
      Finding.deleteMany({ assessment: assessment._id }),
    ]);
    await assessment.deleteOne();

    return res.json({ ok: true });
  } catch (err) {
    console.error('deleteAssessment error:', err);
    return res.status(500).json({ message: 'Could not delete the assessment.' });
  }
};

// ------------------------------------------------------------------ responses

const getResponses = async (req, res) => {
  try {
    const assessment = await ownedAssessment(req, res);
    if (!assessment) return undefined;

    const responses = await Response.find({ assessment: assessment._id }).lean();
    return res.json(responses);
  } catch (err) {
    console.error('getResponses error:', err);
    return res.status(500).json({ message: 'Could not load responses.' });
  }
};

/**
 * Upsert one or many responses.
 *
 * Accepts either a single object or `{ responses: [...] }` so the walkthrough
 * can save a single answer as the user moves and still flush a whole category
 * in one request when they jump ahead.
 */
const saveResponses = async (req, res) => {
  try {
    const assessment = await ownedAssessment(req, res);
    if (!assessment) return undefined;

    const body = req.body || {};
    const incoming = Array.isArray(body) ? body : body.responses || [body];
    if (!incoming.length) return res.status(400).json({ message: 'No responses supplied.' });

    const { subcategories } = await loadReference();
    const byCode = new Map(subcategories.map((s) => [s.code, s]));

    const ops = [];
    for (const raw of incoming) {
      const code = String(raw.subcategoryCode || '').toUpperCase();
      const sub = byCode.get(code);
      if (!sub) return res.status(400).json({ message: `Unknown subcategory "${raw.subcategoryCode}".` });

      const notApplicable = !!raw.notApplicable;
      let tier = Number(raw.tier);
      if (notApplicable && !Number.isInteger(tier)) tier = 0; // stored but ignored by scoring
      if (!Number.isInteger(tier) || tier < MIN_TIER || tier > MAX_TIER) {
        return res.status(400).json({ message: `tier for ${code} must be an integer between ${MIN_TIER} and ${MAX_TIER}.` });
      }

      const impact = raw.businessImpact ? String(raw.businessImpact) : 'moderate';
      if (!IMPACT_KEYS.includes(impact)) {
        return res.status(400).json({ message: `businessImpact for ${code} must be one of: ${IMPACT_KEYS.join(', ')}.` });
      }

      ops.push({
        updateOne: {
          filter: { assessment: assessment._id, subcategory: sub._id },
          update: {
            $set: {
              assessment: assessment._id,
              subcategory: sub._id,
              subcategoryCode: sub.code,
              categoryCode: sub.categoryCode,
              functionCode: sub.functionCode,
              tier,
              notApplicable,
              businessImpact: impact,
              notes: raw.notes ? String(raw.notes) : '',
            },
          },
          upsert: true,
        },
      });
    }

    await Response.bulkWrite(ops);

    // Responses changed, so gaps changed. Recompute and re-derive findings.
    const evaluation = await evaluate(assessment);
    await regenerateFindings(assessment, evaluation);

    assessment.updatedAt = new Date();
    await assessment.save();

    const responses = await Response.find({ assessment: assessment._id }).lean();
    return res.json({ saved: ops.length, responses, overall: evaluation.overall });
  } catch (err) {
    console.error('saveResponses error:', err);
    return res.status(500).json({ message: 'Could not save the responses.' });
  }
};

// --------------------------------------------------------------------- scores

const getScores = async (req, res) => {
  try {
    const assessment = await ownedAssessment(req, res);
    if (!assessment) return undefined;

    const evaluation = await evaluate(assessment);
    return res.json({
      assessmentId: assessment._id,
      targetTier: assessment.targetTier,
      targetLabel: tierLabel(assessment.targetTier),
      overall: evaluation.overall,
      functions: evaluation.functions,
      categories: evaluation.categories,
    });
  } catch (err) {
    console.error('getScores error:', err);
    return res.status(500).json({ message: 'Could not compute scores.' });
  }
};

// ------------------------------------------------------------------- findings

const getFindings = async (req, res) => {
  try {
    const assessment = await ownedAssessment(req, res);
    if (!assessment) return undefined;

    const filter = { assessment: assessment._id };
    if (req.query.severity) filter.severity = String(req.query.severity);
    if (req.query.function) filter.functionCode = String(req.query.function).toUpperCase();
    if (req.query.status) filter.status = String(req.query.status);

    const findings = await Finding.find(filter)
      .sort({ priorityScore: -1, gap: -1, subcategoryCode: 1 })
      .lean();

    // Join the NIST statement so the report can show what the gap is about.
    const { subcategories } = await loadReference();
    const statements = new Map(subcategories.map((s) => [s.code, s.statement]));

    const limit = Number(req.query.limit);
    const list = findings.map((f) => ({ ...f, statement: statements.get(f.subcategoryCode) || '' }));

    return res.json(Number.isInteger(limit) && limit > 0 ? list.slice(0, limit) : list);
  } catch (err) {
    console.error('getFindings error:', err);
    return res.status(500).json({ message: 'Could not load findings.' });
  }
};

/** Manually flag a gap the automated pass would not catch. */
const createFinding = async (req, res) => {
  try {
    const assessment = await ownedAssessment(req, res);
    if (!assessment) return undefined;

    const { subcategoryCode, severity, impactNote, recommendation, businessImpact } = req.body || {};
    const { subcategories } = await loadReference();
    const sub = subcategories.find((s) => s.code === String(subcategoryCode || '').toUpperCase());
    if (!sub) return res.status(400).json({ message: 'Unknown subcategory.' });

    const sev = ['Low', 'Medium', 'High', 'Critical'].includes(severity) ? severity : 'Medium';
    const impact = IMPACT_KEYS.includes(businessImpact) ? businessImpact : 'moderate';

    const response = await Response.findOne({ assessment: assessment._id, subcategory: sub._id }).lean();
    const currentTier = response && !response.notApplicable ? response.tier : 0;
    const gap = Math.max(0, assessment.targetTier - currentTier);

    const finding = await Finding.create({
      assessment: assessment._id,
      subcategory: sub._id,
      subcategoryCode: sub.code,
      categoryCode: sub.categoryCode,
      functionCode: sub.functionCode,
      currentTier,
      targetTier: assessment.targetTier,
      gap,
      severity: sev,
      businessImpact: impact,
      // Manual findings are ranked alongside auto ones using the same formula,
      // but a manual flag always carries at least the weight of a one-tier gap
      // so a deliberate human call never sorts to the bottom.
      priorityScore: Math.max(gap, 1) * (IMPACT_LEVELS.find((i) => i.key === impact) || { weight: 1 }).weight,
      impactNote: impactNote || '',
      recommendation: recommendation || '',
      source: 'manual',
      status: 'open',
    });

    return res.status(201).json(finding);
  } catch (err) {
    console.error('createFinding error:', err);
    return res.status(500).json({ message: 'Could not create the finding.' });
  }
};

const updateFinding = async (req, res) => {
  try {
    const assessment = await ownedAssessment(req, res);
    if (!assessment) return undefined;

    const { findingId } = req.params;
    if (!mongoose.isValidObjectId(findingId)) {
      return res.status(400).json({ message: 'Invalid finding id.' });
    }

    const finding = await Finding.findOne({ _id: findingId, assessment: assessment._id });
    if (!finding) return res.status(404).json({ message: 'Finding not found.' });

    const { status, impactNote, recommendation } = req.body || {};
    if (status !== undefined) {
      if (!['open', 'accepted', 'remediated'].includes(status)) {
        return res.status(400).json({ message: 'status must be open, accepted or remediated.' });
      }
      finding.status = status;
    }
    if (impactNote !== undefined) finding.impactNote = impactNote;
    if (recommendation !== undefined) finding.recommendation = recommendation;

    await finding.save();
    return res.json(finding);
  } catch (err) {
    console.error('updateFinding error:', err);
    return res.status(500).json({ message: 'Could not update the finding.' });
  }
};

// --------------------------------------------------------------------- report

const getReport = async (req, res) => {
  try {
    const assessment = await ownedAssessment(req, res);
    if (!assessment) return undefined;

    const evaluation = await evaluate(assessment);
    const findings = await Finding.find({ assessment: assessment._id })
      .sort({ priorityScore: -1, gap: -1, subcategoryCode: 1 })
      .lean();

    const { subcategories } = await loadReference();
    const statements = new Map(subcategories.map((s) => [s.code, s.statement]));

    const { overall } = evaluation;
    const weakest = overall.weakestFunction;
    const strongest = overall.strongestFunction;

    const narrative = overall.answered === 0
      ? 'No subcategories have been assessed yet, so there is nothing to report on.'
      : [
          `${assessment.organizationName || 'The organization'} has assessed ${overall.answered} of ${overall.totalSubcategories} CSF 2.0 subcategories `,
          `(${overall.completion}% coverage), reaching an overall maturity of ${overall.mean} out of ${MAX_TIER} `,
          `against a target of ${overall.targetTier} ("${overall.targetLabel}").`,
          weakest ? ` ${weakest.name} is the weakest function at ${weakest.mean},` : '',
          strongest ? ` while ${strongest.name} is strongest at ${strongest.mean}.` : '',
          ` ${overall.openGaps} subcategories sit below target, of which ${overall.gapsBySeverity.Critical} are Critical and ${overall.gapsBySeverity.High} are High severity.`,
        ].join('');

    return res.json({
      generatedAt: new Date().toISOString(),
      assessment: {
        id: assessment._id,
        name: assessment.name,
        organizationName: assessment.organizationName,
        industry: assessment.industry,
        scope: assessment.scope,
        status: assessment.status,
        targetTier: assessment.targetTier,
        targetLabel: tierLabel(assessment.targetTier),
        createdAt: assessment.createdAt,
        completedAt: assessment.completedAt,
      },
      methodology: {
        scale: `0–${MAX_TIER} maturity tiers, ${tierLabel(0)} through ${tierLabel(MAX_TIER)}.`,
        rollUp:
          'Function and category scores are unweighted arithmetic means taken across subcategory leaves, so every subcategory carries equal weight regardless of how many sit in its category.',
        exclusions:
          'Unanswered subcategories are excluded from all means rather than counted as zero. Subcategories marked Not Applicable are excluded from means, denominators and findings.',
        prioritisation:
          'Findings are ranked by priority = gap (in tiers) × business-impact weight (Low 0.75, Moderate 1.0, High 1.5, Critical 2.0), not by severity alone.',
      },
      executiveSummary: narrative,
      overall,
      functions: evaluation.functions,
      categories: evaluation.categories,
      findings: findings.map((f) => ({ ...f, statement: statements.get(f.subcategoryCode) || '' })),
      responses: evaluation.subcategories
        .filter((s) => s.answered)
        .map((s) => ({
          code: s.code,
          statement: s.statement,
          functionCode: s.functionCode,
          categoryCode: s.categoryCode,
          tier: s.tier,
          tierLabel: s.notApplicable ? 'Not Applicable' : tierLabel(s.tier),
          notApplicable: s.notApplicable,
          businessImpact: s.impact,
          gap: s.gap,
          severity: s.severity,
          notes: s.notes,
        })),
    });
  } catch (err) {
    console.error('getReport error:', err);
    return res.status(500).json({ message: 'Could not generate the report.' });
  }
};

module.exports = {
  listAssessments,
  createAssessment,
  getAssessment,
  updateAssessment,
  deleteAssessment,
  getResponses,
  saveResponses,
  getScores,
  getFindings,
  createFinding,
  updateFinding,
  getReport,
};
