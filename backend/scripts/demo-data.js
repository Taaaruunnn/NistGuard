/**
 * Creates one demo account with a fully-scored assessment, so the dashboard
 * and report pages have something realistic to show without answering 106
 * questions by hand.
 *
 *   node scripts/demo-data.js                 # uses the defaults below
 *   node scripts/demo-data.js you@you.com pw  # attach the demo to your own login
 *
 * Re-running replaces that account's demo assessment rather than duplicating it.
 * Requires the taxonomy to be seeded first (npm run seed).
 */
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const User = require('../models/User');
const Assessment = require('../models/Assessment');
const Response = require('../models/Response');
const Finding = require('../models/Finding');
const NistSubcategory = require('../models/NistSubcategory');
const { computeAssessment, buildFindings } = require('../services/scoring');
const NistFunction = require('../models/NistFunction');
const NistCategory = require('../models/NistCategory');

dotenv.config();

const EMAIL = process.argv[2] || 'demo@nistguard.local';
const PASSWORD = process.argv[3] || 'demopassword';
const ASSESSMENT_NAME = 'FY26 Corporate Baseline';

/**
 * A believable mid-maturity manufacturer: governance and asset management are
 * reasonably mature, detection and response are thin. Each entry is the pool of
 * tiers drawn from for that function, so the profile varies within a function
 * instead of being flat.
 */
const PROFILE = {
  GV: [3, 3, 2, 2, 3, 1],
  ID: [3, 2, 3, 2, 2, 1],
  PR: [2, 3, 2, 1, 2, 2],
  DE: [1, 2, 1, 0, 1, 1],
  RS: [1, 1, 0, 2, 1, 0],
  RC: [2, 1, 1, 2, 0, 1],
};

const IMPACTS = ['moderate', 'high', 'moderate', 'critical', 'low', 'high', 'moderate'];

const NOTES = {
  'GV.OC-03': 'Tracked in the compliance register; GDPR and PCI DSS obligations mapped, state privacy laws are not.',
  'ID.AM-01': 'CMDB covers corporate IT. Plant OT assets are still on a spreadsheet maintained by engineering.',
  'PR.AA-03': 'MFA enforced for VPN and M365. Not yet enforced for the ERP or plant historian.',
  'DE.CM-01': 'Firewall and IDS logs land in the SIEM, but nobody owns triage outside business hours.',
  'RS.MA-01': 'IR plan exists and was last exercised in 2023. No tabletop run since the ERP migration.',
  'RC.RP-01': 'Backups are tested quarterly for IT. OT recovery has never been rehearsed end to end.',
};

const run = async () => {
  await connectDB();

  const subcategories = await NistSubcategory.find({}).sort({ order: 1 }).lean();
  if (!subcategories.length) {
    throw new Error('No CSF taxonomy found. Run `npm run seed` first.');
  }
  const [functions, categories] = await Promise.all([
    NistFunction.find({}).sort({ order: 1 }).lean(),
    NistCategory.find({}).sort({ order: 1 }).lean(),
  ]);

  // ---- user ---------------------------------------------------------------
  let user = await User.findOne({ email: EMAIL.toLowerCase() });
  if (!user) {
    user = new User({ name: 'Priya Raman', email: EMAIL.toLowerCase(), organizationName: 'Northwind Manufacturing' });
    await user.setPassword(PASSWORD);
    await user.save();
    console.log(`Created user ${EMAIL} (password: ${PASSWORD})`);
  } else {
    console.log(`Using existing user ${EMAIL}`);
  }

  // ---- assessment ---------------------------------------------------------
  const existing = await Assessment.findOne({ user: user._id, name: ASSESSMENT_NAME });
  if (existing) {
    await Promise.all([
      Response.deleteMany({ assessment: existing._id }),
      Finding.deleteMany({ assessment: existing._id }),
    ]);
    await existing.deleteOne();
    console.log('Replaced the previous demo assessment.');
  }

  const assessment = await Assessment.create({
    user: user._id,
    name: ASSESSMENT_NAME,
    organizationName: 'Northwind Manufacturing',
    industry: 'Discrete Manufacturing',
    scope: 'Corporate IT and plant OT',
    targetTier: 3,
    status: 'in-progress',
  });

  // ---- responses ----------------------------------------------------------
  const docs = subcategories.map((sub, i) => {
    const pool = PROFILE[sub.functionCode];
    // A couple of genuinely inapplicable controls, so the N/A path is exercised.
    const notApplicable = sub.code === 'GV.SC-10' || sub.code === 'PR.IR-02';
    return {
      assessment: assessment._id,
      subcategory: sub._id,
      subcategoryCode: sub.code,
      categoryCode: sub.categoryCode,
      functionCode: sub.functionCode,
      tier: pool[i % pool.length],
      notApplicable,
      businessImpact: IMPACTS[i % IMPACTS.length],
      notes: NOTES[sub.code] || '',
    };
  });
  await Response.insertMany(docs);

  // ---- derived findings ---------------------------------------------------
  const evaluation = computeAssessment({
    subcategories,
    responses: docs,
    targetTier: assessment.targetTier,
    categories,
    functions,
  });
  const findings = buildFindings(evaluation.subcategories, assessment._id, assessment.targetTier);
  if (findings.length) await Finding.insertMany(findings);

  const o = evaluation.overall;
  console.log(`\nSeeded "${ASSESSMENT_NAME}"`);
  console.log(`  responses     ${docs.length}`);
  console.log(`  overall mean  ${o.mean} / 4 (target ${o.targetTier})`);
  console.log(`  open gaps     ${o.openGaps}  (Critical ${o.gapsBySeverity.Critical}, High ${o.gapsBySeverity.High})`);
  console.log(`  weakest       ${o.weakestFunction.name} at ${o.weakestFunction.mean}`);
  console.log(`\nSign in at /login with ${EMAIL} / ${PASSWORD}`);

  await mongoose.connection.close();
  process.exit(0);
};

run().catch(async (err) => {
  console.error('Demo seed failed:', err.message);
  try {
    await mongoose.connection.close();
  } catch (_) {
    /* already closed */
  }
  process.exit(1);
});
