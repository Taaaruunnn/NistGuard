const NistFunction = require('../models/NistFunction');
const NistCategory = require('../models/NistCategory');
const NistSubcategory = require('../models/NistSubcategory');
const { TIERS, IMPACT_LEVELS, DEFAULT_TARGET_TIER, SEVERITIES } = require('../config/tiers');

/** Read-only CSF 2.0 reference data. No auth required -- it is public NIST material. */

const getFunctions = async (req, res) => {
  try {
    const functions = await NistFunction.find({}).sort({ order: 1 }).lean();
    return res.json(functions);
  } catch (err) {
    console.error('getFunctions error:', err);
    return res.status(500).json({ message: 'Could not load CSF functions.' });
  }
};

const getCategories = async (req, res) => {
  try {
    const filter = {};
    if (req.query.function) filter.functionCode = String(req.query.function).toUpperCase();
    const categories = await NistCategory.find(filter).sort({ order: 1 }).lean();
    return res.json(categories);
  } catch (err) {
    console.error('getCategories error:', err);
    return res.status(500).json({ message: 'Could not load CSF categories.' });
  }
};

const getSubcategories = async (req, res) => {
  try {
    const filter = {};
    if (req.query.function) filter.functionCode = String(req.query.function).toUpperCase();
    if (req.query.category) filter.categoryCode = String(req.query.category).toUpperCase();
    const subcategories = await NistSubcategory.find(filter).sort({ order: 1 }).lean();
    return res.json(subcategories);
  } catch (err) {
    console.error('getSubcategories error:', err);
    return res.status(500).json({ message: 'Could not load CSF subcategories.' });
  }
};

/**
 * The whole Core in one payload, nested function -> category -> subcategory.
 * The assessment walkthrough needs all 106 subcategories anyway, so one request
 * beats 22.
 */
const getCore = async (req, res) => {
  try {
    const [functions, categories, subcategories] = await Promise.all([
      NistFunction.find({}).sort({ order: 1 }).lean(),
      NistCategory.find({}).sort({ order: 1 }).lean(),
      NistSubcategory.find({}).sort({ order: 1 }).lean(),
    ]);

    const subsByCat = new Map();
    for (const s of subcategories) {
      if (!subsByCat.has(s.categoryCode)) subsByCat.set(s.categoryCode, []);
      subsByCat.get(s.categoryCode).push(s);
    }

    const catsByFn = new Map();
    for (const c of categories) {
      if (!catsByFn.has(c.functionCode)) catsByFn.set(c.functionCode, []);
      catsByFn.get(c.functionCode).push({ ...c, subcategories: subsByCat.get(c.code) || [] });
    }

    return res.json({
      functions: functions.map((f) => ({ ...f, categories: catsByFn.get(f.code) || [] })),
      counts: {
        functions: functions.length,
        categories: categories.length,
        subcategories: subcategories.length,
      },
    });
  } catch (err) {
    console.error('getCore error:', err);
    return res.status(500).json({ message: 'Could not load the CSF core.' });
  }
};

/** Scoring vocabulary, so the client never hardcodes tier labels. */
const getMeta = async (req, res) =>
  res.json({
    tiers: TIERS,
    impactLevels: IMPACT_LEVELS,
    severities: SEVERITIES,
    defaultTargetTier: DEFAULT_TARGET_TIER,
  });

module.exports = { getFunctions, getCategories, getSubcategories, getCore, getMeta };
