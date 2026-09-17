/**
 * Shared vocabulary for maturity tiers, business impact and finding severity.
 * Kept in one place because the scoring engine, the Mongoose enums and the
 * Angular client all have to agree on these exact numbers and labels.
 */

/**
 * Implementation/maturity tiers. The labels borrow CSF 2.0's own Organizational
 * Profile tiering language (Partial / Risk Informed / Repeatable / Adaptive) and
 * add tier 0 for "we do not do this at all", which CSF leaves implicit.
 */
const TIERS = [
  { value: 0, key: 'not-performed', label: 'Not Performed', blurb: 'No activity. Nobody owns this and it is not happening.' },
  { value: 1, key: 'partial',       label: 'Partial',       blurb: 'Ad hoc and reactive. Done inconsistently, often by one person.' },
  { value: 2, key: 'risk-informed', label: 'Risk Informed', blurb: 'Risk-aware practice exists, but it is not policy and not consistently applied.' },
  { value: 3, key: 'repeatable',    label: 'Repeatable',    blurb: 'Formalised as policy, applied consistently, and reviewed on a schedule.' },
  { value: 4, key: 'adaptive',      label: 'Adaptive',      blurb: 'Continuously improved from lessons learned and predictive indicators.' },
];

const MIN_TIER = 0;
const MAX_TIER = 4;

/** Default target every subcategory is measured against unless overridden. */
const DEFAULT_TARGET_TIER = 3; // Repeatable

/**
 * Business impact weighting. Multiplies the raw gap when prioritising findings,
 * so a one-tier gap on a business-critical subcategory outranks a two-tier gap
 * on something peripheral.
 */
const IMPACT_LEVELS = [
  { key: 'low',      label: 'Low',      weight: 0.75 },
  { key: 'moderate', label: 'Moderate', weight: 1.0 },
  { key: 'high',     label: 'High',     weight: 1.5 },
  { key: 'critical', label: 'Critical', weight: 2.0 },
];

const DEFAULT_IMPACT = 'moderate';

const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

const tierLabel = (v) => (TIERS.find((t) => t.value === v) || {}).label || 'Unknown';
const impactWeight = (key) =>
  (IMPACT_LEVELS.find((i) => i.key === key) || { weight: 1.0 }).weight;

module.exports = {
  TIERS,
  MIN_TIER,
  MAX_TIER,
  DEFAULT_TARGET_TIER,
  IMPACT_LEVELS,
  DEFAULT_IMPACT,
  SEVERITIES,
  tierLabel,
  impactWeight,
};
