const {
  MAX_TIER,
  SEVERITIES,
  tierLabel,
  impactWeight,
} = require('../config/tiers');

/**
 * ============================================================================
 * NISTGuard scoring & gap analysis
 * ============================================================================
 *
 * ROLL-UP METHODOLOGY (one choice, applied everywhere):
 *
 *   Every score is an UNWEIGHTED ARITHMETIC MEAN COMPUTED FROM THE SUBCATEGORY
 *   LEAVES, not a mean-of-means.
 *
 *   A function's score is the mean of all its answered subcategory tiers --
 *   NOT the mean of its category averages. This matters: GV.SC has 10
 *   subcategories and GV.PO has 2. Averaging the two category means would give
 *   the 2-subcategory category five times the per-question influence of the
 *   10-subcategory one, which would let an organisation paper over a broad
 *   supply-chain weakness by writing a good policy. Leaf-level averaging keeps
 *   every subcategory worth exactly the same, which is also how NIST presents
 *   the Core: 106 peers, with no stated weighting between them.
 *
 *   Business impact deliberately does NOT influence the maturity score. Impact
 *   describes consequence, maturity describes practice; mixing them produces a
 *   score that cannot be compared against another organisation's. Impact is
 *   applied only when PRIORITISING findings (see severityFor / priorityFor).
 *
 * EXCLUSIONS:
 *   - Unanswered subcategories are excluded from means entirely (they are not
 *     zeros). They surface separately as coverage/completion.
 *   - Subcategories marked Not Applicable are excluded from the means and the
 *     denominators, and never produce a finding.
 *
 * SCALES:
 *   - `mean`  is on the native 0-4 tier scale.
 *   - `score` is that mean normalised to 0-100 for display (mean / 4 * 100).
 * ============================================================================
 */

const round = (n, dp = 2) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

const mean = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);

/** A 0-4 tier mean expressed as a 0-100 posture score. */
const toScore = (m) => (m === null ? null : round((m / MAX_TIER) * 100, 1));

/**
 * Severity of a single gap, escalated by business impact.
 *
 *   weighted   = gap x impactWeight        (gap in tiers, weight 0.75 - 2.0)
 *   severityIx = clamp(round(weighted) - 1, 0, 3)
 *
 * So a 1-tier gap on a Moderate-impact subcategory is Low, the same 1-tier gap
 * on a Critical-impact one is Medium, and a 3-tier gap on anything rated High
 * or above lands on Critical.
 */
const severityFor = (gap, impact) => {
  const weighted = gap * impactWeight(impact);
  const ix = Math.min(SEVERITIES.length - 1, Math.max(0, Math.round(weighted) - 1));
  return SEVERITIES[ix];
};

const priorityFor = (gap, impact) => round(gap * impactWeight(impact), 3);

/**
 * Human-readable recommendation for closing one gap.
 *
 * Built from NIST's own published Implementation Example for that subcategory
 * rather than invented advice -- the first example is the most concrete next
 * step NIST itself suggests.
 */
const recommendationFor = (sub, currentTier, targetTier) => {
  const from = tierLabel(currentTier);
  const to = tierLabel(targetTier);
  const lead =
    currentTier === 0
      ? `Stand up ${sub.code} from scratch and drive it to "${to}".`
      : `Raise ${sub.code} from "${from}" to "${to}".`;

  const example = (sub.implementationExamples || [])[0];
  const step = example
    ? ` NIST's implementation example for this subcategory: ${example.replace(/\.$/, '')}.`
    : '';

  const habit =
    targetTier >= 3
      ? ' Reaching "Repeatable" or better means the practice is written down as policy, has a named owner, and is reviewed on a fixed schedule — not merely performed once.'
      : '';

  return `${lead}${step}${habit}`;
};

const impactNoteFor = (sub, gap, impact) => {
  const scale = {
    low: 'limited',
    moderate: 'material',
    high: 'serious',
    critical: 'severe',
  }[impact] || 'material';
  const where = sub.categoryName || sub.categoryCode;
  return `Rated ${impact} business impact with a ${gap}-tier shortfall, so failure here carries ${scale} consequences for "${where}".`;
};

/**
 * Compute the full picture for one assessment.
 *
 * @param {Object[]} subcategories Every CSF subcategory (lean docs).
 * @param {Object[]} responses     Responses recorded so far (lean docs).
 * @param {number}   targetTier    Tier each subcategory is measured against.
 * @param {Object[]} categories    Category reference docs (for names/order).
 * @param {Object[]} functions     Function reference docs (for names/order).
 */
function computeAssessment({ subcategories, responses, targetTier, categories = [], functions = [] }) {
  const byCode = new Map(responses.map((r) => [r.subcategoryCode, r]));
  const catMeta = new Map(categories.map((c) => [c.code, c]));
  const fnMeta = new Map(functions.map((f) => [f.code, f]));

  // ---- Per-subcategory evaluation -----------------------------------------
  const evaluated = subcategories.map((sub) => {
    const r = byCode.get(sub.code);
    const answered = !!r;
    const notApplicable = !!(r && r.notApplicable);
    const tier = answered && !notApplicable ? r.tier : null;
    const impact = (r && r.businessImpact) || 'moderate';
    // Gap is floored at 0: exceeding the target is not a negative gap, it is
    // simply no gap. Over-achievement shows up in the score, not as a credit.
    const gap = tier === null ? null : Math.max(0, targetTier - tier);
    const hasGap = gap !== null && gap > 0;

    return {
      code: sub.code,
      categoryCode: sub.categoryCode,
      functionCode: sub.functionCode,
      statement: sub.statement,
      subcategoryId: sub._id,
      implementationExamples: sub.implementationExamples || [],
      categoryName: (catMeta.get(sub.categoryCode) || {}).name,
      answered,
      notApplicable,
      tier,
      impact,
      gap,
      notes: (r && r.notes) || '',
      severity: hasGap ? severityFor(gap, impact) : null,
      priorityScore: hasGap ? priorityFor(gap, impact) : 0,
      order: sub.order,
    };
  });

  const scorable = evaluated.filter((e) => e.tier !== null);

  // ---- Category roll-up ----------------------------------------------------
  const catGroups = new Map();
  for (const e of evaluated) {
    if (!catGroups.has(e.categoryCode)) catGroups.set(e.categoryCode, []);
    catGroups.get(e.categoryCode).push(e);
  }

  const categoryScores = [];
  for (const [code, items] of catGroups) {
    const scored = items.filter((i) => i.tier !== null);
    const m = mean(scored.map((i) => i.tier));
    const meta = catMeta.get(code) || {};
    categoryScores.push({
      code,
      name: meta.name || code,
      description: meta.description || '',
      functionCode: items[0].functionCode,
      mean: m === null ? null : round(m),
      score: toScore(m),
      gapToTarget: m === null ? null : round(Math.max(0, targetTier - m)),
      answered: scored.length,
      applicable: items.filter((i) => !i.notApplicable).length,
      total: items.length,
      notApplicable: items.filter((i) => i.notApplicable).length,
      openGaps: items.filter((i) => i.gap > 0).length,
      order: meta.order ?? 0,
    });
  }
  categoryScores.sort((a, b) => a.order - b.order);

  // ---- Function roll-up (from leaves, NOT from category means) -------------
  const fnGroups = new Map();
  for (const e of evaluated) {
    if (!fnGroups.has(e.functionCode)) fnGroups.set(e.functionCode, []);
    fnGroups.get(e.functionCode).push(e);
  }

  const functionScores = [];
  for (const [code, items] of fnGroups) {
    const scored = items.filter((i) => i.tier !== null);
    const m = mean(scored.map((i) => i.tier));
    const meta = fnMeta.get(code) || {};
    const bySeverity = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    items.forEach((i) => {
      if (i.severity) bySeverity[i.severity] += 1;
    });

    functionScores.push({
      code,
      name: meta.name || code,
      description: meta.description || '',
      mean: m === null ? null : round(m),
      score: toScore(m),
      gapToTarget: m === null ? null : round(Math.max(0, targetTier - m)),
      answered: scored.length,
      applicable: items.filter((i) => !i.notApplicable).length,
      total: items.length,
      notApplicable: items.filter((i) => i.notApplicable).length,
      openGaps: items.filter((i) => i.gap > 0).length,
      gapsBySeverity: bySeverity,
      categories: categoryScores.filter((c) => c.functionCode === code),
      order: meta.order ?? 0,
    });
  }
  functionScores.sort((a, b) => a.order - b.order);

  // ---- Overall -------------------------------------------------------------
  const overallMean = mean(scorable.map((e) => e.tier));

  const gapsBySeverity = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  evaluated.forEach((e) => {
    if (e.severity) gapsBySeverity[e.severity] += 1;
  });

  const applicableTotal = evaluated.filter((e) => !e.notApplicable).length;
  const answeredTotal = evaluated.filter((e) => e.answered).length;

  const overall = {
    mean: overallMean === null ? null : round(overallMean),
    score: toScore(overallMean),
    targetTier,
    targetLabel: tierLabel(targetTier),
    gapToTarget: overallMean === null ? null : round(Math.max(0, targetTier - overallMean)),
    totalSubcategories: evaluated.length,
    answered: answeredTotal,
    applicable: applicableTotal,
    notApplicable: evaluated.length - applicableTotal,
    // Completion counts every recorded response, including Not Applicable ones,
    // so marking something N/A moves the bar forward rather than stalling it.
    completion: evaluated.length ? round((answeredTotal / evaluated.length) * 100, 1) : 0,
    openGaps: evaluated.filter((e) => e.gap > 0).length,
    atOrAboveTarget: scorable.filter((e) => e.tier >= targetTier).length,
    gapsBySeverity,
    strongestFunction: null,
    weakestFunction: null,
  };

  const ranked = functionScores.filter((f) => f.mean !== null);
  if (ranked.length) {
    const sorted = [...ranked].sort((a, b) => b.mean - a.mean);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    overall.strongestFunction = { code: best.code, name: best.name, mean: best.mean };
    overall.weakestFunction = { code: worst.code, name: worst.name, mean: worst.mean };
  }

  return { overall, functions: functionScores, categories: categoryScores, subcategories: evaluated };
}

/**
 * Turn the evaluation into finding documents.
 *
 * Sorted by priorityScore (gap x impact) descending -- explicitly NOT by
 * severity alone, so a Medium finding on a business-critical subcategory can
 * and does outrank a High finding on a peripheral one. Ties fall back to the
 * raw gap, then to canonical NIST ordering so the list is stable.
 */
function buildFindings(evaluated, assessmentId, targetTier) {
  return evaluated
    .filter((e) => e.gap > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore || b.gap - a.gap || a.order - b.order)
    .map((e) => ({
      assessment: assessmentId,
      subcategory: e.subcategoryId,
      subcategoryCode: e.code,
      categoryCode: e.categoryCode,
      functionCode: e.functionCode,
      currentTier: e.tier,
      targetTier,
      gap: e.gap,
      severity: e.severity,
      businessImpact: e.impact,
      priorityScore: e.priorityScore,
      impactNote: impactNoteFor(e, e.gap, e.impact),
      recommendation: recommendationFor(e, e.tier, targetTier),
      source: 'auto',
      status: 'open',
    }));
}

module.exports = {
  computeAssessment,
  buildFindings,
  severityFor,
  priorityFor,
  toScore,
  round,
};
