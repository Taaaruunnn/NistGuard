/**
 * Seeds the CSF 2.0 reference taxonomy (functions, categories, subcategories).
 *
 *   npm run seed          upsert the taxonomy, leaving user data alone
 *   npm run seed -- --wipe   also delete every assessment/response/finding
 *
 * Upsert rather than delete-and-insert so that existing Responses, which hold
 * ObjectId references to subcategories, keep pointing at live documents.
 */
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const core = require('./data/csf20-core');
const NistFunction = require('./models/NistFunction');
const NistCategory = require('./models/NistCategory');
const NistSubcategory = require('./models/NistSubcategory');
const Assessment = require('./models/Assessment');
const Response = require('./models/Response');
const Finding = require('./models/Finding');

dotenv.config();

const run = async () => {
  await connectDB();

  const wipe = process.argv.includes('--wipe');
  if (wipe) {
    await Promise.all([Assessment.deleteMany({}), Response.deleteMany({}), Finding.deleteMany({})]);
    console.log('Wiped assessments, responses and findings.');
  }

  // ---- Functions ----------------------------------------------------------
  const fnIds = new Map();
  for (const [i, f] of core.functions.entries()) {
    const doc = await NistFunction.findOneAndUpdate(
      { code: f.code },
      { $set: { name: f.name, description: f.description, order: i } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    fnIds.set(f.code, doc._id);
  }
  console.log(`Functions:      ${core.functions.length}`);

  // ---- Categories ---------------------------------------------------------
  const catIds = new Map();
  for (const [i, c] of core.categories.entries()) {
    const doc = await NistCategory.findOneAndUpdate(
      { code: c.code },
      {
        $set: {
          functionCode: c.functionCode,
          function: fnIds.get(c.functionCode),
          name: c.name,
          description: c.description,
          order: i,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    catIds.set(c.code, doc._id);
  }
  console.log(`Categories:     ${core.categories.length}`);

  // ---- Subcategories ------------------------------------------------------
  const ops = core.subcategories.map((s, i) => ({
    updateOne: {
      filter: { code: s.code },
      update: {
        $set: {
          categoryCode: s.categoryCode,
          functionCode: s.functionCode,
          category: catIds.get(s.categoryCode),
          function: fnIds.get(s.functionCode),
          statement: s.statement,
          implementationExamples: s.implementationExamples,
          order: i,
        },
      },
      upsert: true,
    },
  }));
  await NistSubcategory.bulkWrite(ops);
  console.log(`Subcategories:  ${core.subcategories.length}`);

  // Remove anything left over from an older/partial taxonomy.
  const liveCodes = core.subcategories.map((s) => s.code);
  const stale = await NistSubcategory.deleteMany({ code: { $nin: liveCodes } });
  const staleCats = await NistCategory.deleteMany({ code: { $nin: core.categories.map((c) => c.code) } });
  if (stale.deletedCount || staleCats.deletedCount) {
    console.log(`Pruned ${stale.deletedCount} stale subcategories and ${staleCats.deletedCount} stale categories.`);
  }

  console.log('\nCSF 2.0 taxonomy seeded successfully.');
  await mongoose.connection.close();
  process.exit(0);
};

run().catch(async (err) => {
  console.error('Seed failed:', err.message);
  try {
    await mongoose.connection.close();
  } catch (_) {
    /* already closed */
  }
  process.exit(1);
});
