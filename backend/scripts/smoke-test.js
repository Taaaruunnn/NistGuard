/**
 * End-to-end API smoke test.
 *
 *   node scripts/smoke-test.js [baseUrl]
 *
 * Exercises the full flow against a running server: register/login, create an
 * assessment, record responses across every tier and impact level, then verify
 * that scores, findings and the report all agree with the documented scoring
 * methodology. Creates a throwaway user each run and deletes its assessment at
 * the end.
 */
const BASE = (process.argv[2] || 'http://localhost:5000').replace(/\/$/, '') + '/api';

let token = null;
let passed = 0;
let failed = 0;

const call = async (method, path, body) => {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body: json };
};

const check = (label, condition, detail = '') => {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? ` -- ${detail}` : ''}`);
  }
};

const near = (a, b, tol = 0.001) => Math.abs(a - b) < tol;

(async () => {
  console.log(`\nNISTGuard API smoke test -> ${BASE}\n`);

  // -------------------------------------------------------------- reference
  console.log('Reference data');
  const health = await call('GET', '/health');
  check('health returns 200', health.status === 200);

  const core = await call('GET', '/nist/core');
  check('core has 6 functions', core.body.counts?.functions === 6, JSON.stringify(core.body.counts));
  check('core has 22 categories', core.body.counts?.categories === 22);
  check('core has 106 subcategories', core.body.counts?.subcategories === 106);

  const fns = await call('GET', '/nist/functions');
  check(
    'functions are in canonical NIST order',
    fns.body.map((f) => f.code).join(',') === 'GV,ID,PR,DE,RS,RC',
    fns.body.map((f) => f.code).join(',')
  );

  const filtered = await call('GET', '/nist/subcategories?function=DE');
  check('DE has 11 subcategories', filtered.body.length === 11, `got ${filtered.body.length}`);

  const meta = await call('GET', '/nist/meta');
  check('meta exposes 5 tiers', meta.body.tiers?.length === 5);
  check('default target tier is 3 (Repeatable)', meta.body.defaultTargetTier === 3);

  // ------------------------------------------------------------------- auth
  console.log('\nAuth');
  const email = `smoke-${Date.now()}@example.com`;
  const reg = await call('POST', '/auth/register', {
    name: 'Smoke Tester',
    email,
    password: 'password123',
    organizationName: 'Acme Corp',
  });
  check('register returns 201', reg.status === 201, JSON.stringify(reg.body).slice(0, 120));
  token = reg.body.token;
  check('register issues a token', !!token);

  const dup = await call('POST', '/auth/register', { name: 'x', email, password: 'password123' });
  check('duplicate email rejected with 409', dup.status === 409);

  const shortPw = await call('POST', '/auth/register', { name: 'x', email: `b${email}`, password: 'short' });
  check('short password rejected with 400', shortPw.status === 400);

  const me = await call('GET', '/auth/me');
  check('me returns the signed-in user', me.body.user?.email === email);

  const badLogin = await call('POST', '/auth/login', { email, password: 'wrongpassword' });
  check('wrong password rejected with 401', badLogin.status === 401);

  const login = await call('POST', '/auth/login', { email, password: 'password123' });
  check('login returns 200 + token', login.status === 200 && !!login.body.token);

  const saved = token;
  token = null;
  const unauth = await call('GET', '/assessments');
  check('assessments require auth', unauth.status === 401);
  token = saved;

  // ------------------------------------------------------------ assessments
  console.log('\nAssessments');
  const created = await call('POST', '/assessments', {
    name: 'FY26 Baseline',
    organizationName: 'Acme Corp',
    industry: 'Manufacturing',
    scope: 'Corporate IT and OT',
    targetTier: 3,
  });
  check('create returns 201', created.status === 201, JSON.stringify(created.body).slice(0, 120));
  const id = created.body._id;
  check('assessment starts in-progress', created.body.status === 'in-progress');
  check('assessment target tier is 3', created.body.targetTier === 3);

  const noName = await call('POST', '/assessments', { name: '   ' });
  check('blank name rejected with 400', noName.status === 400);

  const list = await call('GET', '/assessments');
  check('list includes the new assessment', list.body.some((a) => a._id === id));
  check('list carries progress counters', list.body[0]?.totalSubcategories === 106);

  // -------------------------------------------------------------- responses
  console.log('\nResponses');
  const responses = [
    { subcategoryCode: 'GV.OC-01', tier: 3, businessImpact: 'moderate' },
    { subcategoryCode: 'GV.OC-02', tier: 1, businessImpact: 'critical', notes: 'No stakeholder register.' },
    { subcategoryCode: 'GV.OC-03', tier: 0, businessImpact: 'high' },
    { subcategoryCode: 'ID.AM-01', tier: 2, businessImpact: 'high' },
    { subcategoryCode: 'ID.AM-02', tier: 4, businessImpact: 'low' },
    { subcategoryCode: 'PR.AA-01', tier: 1, businessImpact: 'low' },
    { subcategoryCode: 'PR.AA-03', tier: 0, businessImpact: 'critical' },
    { subcategoryCode: 'DE.CM-01', tier: 2, businessImpact: 'moderate' },
    { subcategoryCode: 'RS.MA-01', tier: 3, businessImpact: 'high' },
    { subcategoryCode: 'RC.RP-01', tier: 0, notApplicable: true },
  ];
  const saveRes = await call('PUT', `/assessments/${id}/responses`, { responses });
  check('bulk save returns 200', saveRes.status === 200, JSON.stringify(saveRes.body).slice(0, 150));
  check('all 10 responses saved', saveRes.body.saved === 10);

  const badTier = await call('PUT', `/assessments/${id}/responses`, {
    responses: [{ subcategoryCode: 'GV.OC-01', tier: 9 }],
  });
  check('out-of-range tier rejected with 400', badTier.status === 400);

  const badCode = await call('PUT', `/assessments/${id}/responses`, {
    responses: [{ subcategoryCode: 'ZZ.ZZ-99', tier: 2 }],
  });
  check('unknown subcategory rejected with 400', badCode.status === 400);

  // Idempotent re-save must update in place, not duplicate.
  await call('PUT', `/assessments/${id}/responses`, {
    responses: [{ subcategoryCode: 'GV.OC-01', tier: 4, businessImpact: 'moderate' }],
  });
  const fetched = await call('GET', `/assessments/${id}/responses`);
  check('re-saving upserts rather than duplicating', fetched.body.length === 10, `got ${fetched.body.length}`);
  check(
    'updated tier persisted',
    fetched.body.find((r) => r.subcategoryCode === 'GV.OC-01').tier === 4
  );

  // --------------------------------------------------------------- scoring
  console.log('\nScoring');
  const scores = await call('GET', `/assessments/${id}/scores`);
  check('scores return 200', scores.status === 200);

  const o = scores.body.overall;
  // 9 scorable responses (RC.RP-01 is N/A and excluded): 4,1,0,2,4,1,0,2,3 = 17/9
  check('overall mean excludes N/A and unanswered', near(o.mean, 17 / 9, 0.01), `got ${o.mean}`);
  check('overall score is the mean normalised to 0-100', near(o.score, (17 / 9 / 4) * 100, 0.1), `got ${o.score}`);
  check('answered counts all 10 recorded responses', o.answered === 10, `got ${o.answered}`);
  check('notApplicable counted separately', o.notApplicable === 1, `got ${o.notApplicable}`);
  check('completion is 10/106', near(o.completion, 9.4, 0.1), `got ${o.completion}`);

  const gv = scores.body.functions.find((f) => f.code === 'GV');
  // GV answered: 4, 1, 0 -> mean 5/3
  check('GV mean rolls up from leaves', near(gv.mean, 5 / 3, 0.01), `got ${gv.mean}`);
  check('GV reports 31 total subcategories', gv.total === 31, `got ${gv.total}`);
  check('GV has 2 open gaps', gv.openGaps === 2, `got ${gv.openGaps}`);

  const rc = scores.body.functions.find((f) => f.code === 'RC');
  check('a fully-N/A function has a null mean, not 0', rc.mean === null, `got ${rc.mean}`);
  check('N/A subcategory produces no gap', rc.openGaps === 0, `got ${rc.openGaps}`);

  check('weakest function identified', !!o.weakestFunction, JSON.stringify(o.weakestFunction));
  check(
    'unanswered subcategories are not scored as zero',
    scores.body.functions.every((f) => f.mean === null || f.mean > 0 || f.answered > 0)
  );

  // --------------------------------------------------------------- findings
  console.log('\nFindings');
  const findings = await call('GET', `/assessments/${id}/findings`);
  check('findings return 200', findings.status === 200);
  // Gaps against target 3: GV.OC-02(2,critical) GV.OC-03(3,high) ID.AM-01(1,high)
  //                        PR.AA-01(2,low) PR.AA-03(3,critical) DE.CM-01(1,moderate)
  check('6 gaps detected', findings.body.length === 6, `got ${findings.body.length}`);

  const top = findings.body[0];
  check('highest priority is PR.AA-03 (gap 3 x critical 2.0 = 6)', top.subcategoryCode === 'PR.AA-03', top.subcategoryCode);
  check('top finding severity is Critical', top.severity === 'Critical');
  check('priority score is gap x impact weight', near(top.priorityScore, 6), `got ${top.priorityScore}`);

  const sorted = findings.body.every(
    (f, i, arr) => i === 0 || arr[i - 1].priorityScore >= f.priorityScore
  );
  check('findings sorted by priority, not severity alone', sorted);

  const aa01 = findings.body.find((f) => f.subcategoryCode === 'PR.AA-01'); // gap 2 x low 0.75 = 1.5
  const cm01 = findings.body.find((f) => f.subcategoryCode === 'DE.CM-01'); // gap 1 x moderate 1.0 = 1.0
  check('impact weighting demotes a low-impact 2-tier gap', aa01.severity === 'Medium', aa01.severity);
  check('a 1-tier moderate gap is Low', cm01.severity === 'Low', cm01.severity);

  const am01 = findings.body.find((f) => f.subcategoryCode === 'ID.AM-01'); // gap 1 x high 1.5
  check('impact escalates a 1-tier high-impact gap above a 1-tier moderate one', am01.priorityScore > cm01.priorityScore);

  check('findings carry a recommendation', top.recommendation?.length > 40);
  check('recommendation cites NIST implementation example', top.recommendation.includes('implementation example'));
  check('findings carry an impact note', top.impactNote?.includes('business impact'));
  check('findings join the NIST statement', top.statement?.length > 10);

  check('no finding for an at-target subcategory', !findings.body.some((f) => f.subcategoryCode === 'GV.OC-01'));
  check('no finding for an above-target subcategory', !findings.body.some((f) => f.subcategoryCode === 'ID.AM-02'));
  check('no finding for an N/A subcategory', !findings.body.some((f) => f.subcategoryCode === 'RC.RP-01'));

  const critOnly = await call('GET', `/assessments/${id}/findings?severity=Critical`);
  check('findings filter by severity', critOnly.body.every((f) => f.severity === 'Critical') && critOnly.body.length > 0);

  const gvOnly = await call('GET', `/assessments/${id}/findings?function=GV`);
  check('findings filter by function', gvOnly.body.length === 2, `got ${gvOnly.body.length}`);

  // Regeneration: fixing a gap must remove its finding.
  await call('PUT', `/assessments/${id}/responses`, {
    responses: [{ subcategoryCode: 'PR.AA-03', tier: 3, businessImpact: 'critical' }],
  });
  const after = await call('GET', `/assessments/${id}/findings`);
  check('closing a gap removes its finding', !after.body.some((f) => f.subcategoryCode === 'PR.AA-03'));
  check('remaining findings recomputed', after.body.length === 5, `got ${after.body.length}`);

  // Manual findings survive regeneration.
  const manual = await call('POST', `/assessments/${id}/findings`, {
    subcategoryCode: 'ID.RA-01',
    severity: 'High',
    businessImpact: 'high',
    impactNote: 'Vulnerability scanning is unfunded for FY26.',
    recommendation: 'Budget for an authenticated scanner before Q2.',
  });
  check('manual finding created', manual.status === 201, JSON.stringify(manual.body).slice(0, 120));
  await call('PUT', `/assessments/${id}/responses`, {
    responses: [{ subcategoryCode: 'DE.CM-01', tier: 1, businessImpact: 'moderate' }],
  });
  const afterRegen = await call('GET', `/assessments/${id}/findings`);
  check(
    'manual finding survives auto-regeneration',
    afterRegen.body.some((f) => f._id === manual.body._id && f.source === 'manual')
  );

  const statusUpdate = await call('PATCH', `/assessments/${id}/findings/${manual.body._id}`, {
    status: 'accepted',
  });
  check('finding status can be updated', statusUpdate.body.status === 'accepted');

  // ------------------------------------------------------- target tier move
  console.log('\nConfigurable target tier');
  const retarget = await call('PATCH', `/assessments/${id}`, { targetTier: 2 });
  check('target tier updated', retarget.body.targetTier === 2);
  const lowered = await call('GET', `/assessments/${id}/findings`);
  check(
    'lowering the target closes gaps that met the new bar',
    !lowered.body.some((f) => f.subcategoryCode === 'ID.AM-01' && f.source === 'auto'),
    lowered.body.map((f) => f.subcategoryCode).join(',')
  );
  await call('PATCH', `/assessments/${id}`, { targetTier: 3 });

  const badTarget = await call('PATCH', `/assessments/${id}`, { targetTier: 12 });
  check('invalid target tier rejected with 400', badTarget.status === 400);

  // ----------------------------------------------------------------- report
  console.log('\nReport');
  const report = await call('GET', `/assessments/${id}/report`);
  check('report returns 200', report.status === 200);
  check('report has an executive summary', report.body.executiveSummary?.length > 80);
  check('report documents the roll-up methodology', report.body.methodology?.rollUp?.includes('unweighted'));
  check('report documents prioritisation', report.body.methodology?.prioritisation?.includes('business-impact'));
  check('report includes all 6 functions', report.body.functions?.length === 6);
  check('report includes findings', report.body.findings?.length > 0);
  check('report lists recorded responses', report.body.responses?.length === 10);
  check(
    'report labels N/A responses correctly',
    report.body.responses.find((r) => r.code === 'RC.RP-01')?.tierLabel === 'Not Applicable'
  );

  const completed = await call('PATCH', `/assessments/${id}`, { status: 'completed' });
  check('assessment can be completed', completed.body.status === 'completed' && !!completed.body.completedAt);

  // ------------------------------------------------------------- isolation
  console.log('\nOwnership isolation');
  const other = await call('POST', '/auth/register', {
    name: 'Other User',
    email: `other-${Date.now()}@example.com`,
    password: 'password123',
  });
  const mine = token;
  token = other.body.token;
  const peek = await call('GET', `/assessments/${id}`);
  check("another user cannot read someone else's assessment", peek.status === 404, `got ${peek.status}`);
  const peekScores = await call('GET', `/assessments/${id}/scores`);
  check("another user cannot read someone else's scores", peekScores.status === 404);
  token = mine;

  // ------------------------------------------------------------------ clean
  const del = await call('DELETE', `/assessments/${id}`);
  check('assessment deleted', del.status === 200);
  const gone = await call('GET', `/assessments/${id}`);
  check('deleted assessment is gone', gone.status === 404);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error('\nSmoke test crashed:', err);
  process.exit(1);
});
