const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename);

const {
  getMaleWeightReferences,
  getWhoMaleWeightAssessment,
  getChinaMaleWeightAssessment,
  getMaleWeightAssessments,
} = require('../src/lib/growth-standards.ts');

const birthday = '2026-08-12';
const noReferences = { WHO: null, CN: null };
const atDay = (days) => new Date(Date.parse(`${birthday}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const closeTo = (actual, expected, tolerance = 1e-9) => assert.ok(
  Math.abs(actual - expected) <= tolerance,
  `expected ${actual} to be within ${tolerance} of ${expected}`,
);

// WHO boys' daily weight-for-age LMS data, birth / 7 / 28 days.
// https://www.who.int/toolkits/child-growth-standards/standards/weight-for-age
// The P3/P97 values use z=±1.8807936081512509, not the supplied ±2 SD columns.
const WHO_CASES = [
  { days: 0, l: 0.3487, m: 3.3464, s: 0.14602, p3: 2.5072754839276676, p97: 4.349896497336354 },
  { days: 7, l: 0.2776, m: 3.4879, s: 0.14483, p3: 2.6275585896844693, p97: 4.5352841223493465 },
  { days: 28, l: 0.2331, m: 4.3671, s: 0.13497, p3: 3.3616363881440434, p97: 5.588568124963293 },
];

test('WHO P3/P50/P97 match birth, 7-day, and 28-day LMS reference values', () => {
  for (const expected of WHO_CASES) {
    const { WHO } = getMaleWeightReferences(birthday, atDay(expected.days));
    assert.ok(WHO);
    closeTo(WHO.p3, expected.p3);
    assert.equal(WHO.p50, expected.m);
    closeTo(WHO.p97, expected.p97);
    // An independent reverse LMS transform verifies each tail's z score.
    closeTo((Math.pow(WHO.p3 / expected.m, expected.l) - 1) / (expected.l * expected.s), -1.8807936081512509);
    closeTo((Math.pow(WHO.p97 / expected.m, expected.l) - 1) / (expected.l * expected.s), 1.8807936081512509);
    assert.ok(WHO.p3 < WHO.p50 && WHO.p50 < WHO.p97);
  }
});

test('WHO reference percentiles round-trip through assessments for positive and negative LMS L', () => {
  // L is positive at birth and negative in the existing day-655/day-731 rows.
  for (const days of [0, 7, 28, 655, 731]) {
    const measuredAt = atDay(days);
    const { WHO } = getMaleWeightReferences(birthday, measuredAt);
    for (const [key, percentile] of [['p3', 3], ['p50', 50], ['p97', 97]]) {
      closeTo(getWhoMaleWeightAssessment(birthday, measuredAt, WHO[key]).percentile, percentile, 0.00001);
    }
  }
});

test('existing WHO assessment keeps its rounded median and ±2 SD interval', () => {
  const assessment = getWhoMaleWeightAssessment(birthday, birthday, 3.3464);
  const { WHO } = getMaleWeightReferences(birthday, birthday);
  assert.equal(assessment.low, 2.459);
  assert.equal(assessment.median, 3.346);
  assert.equal(assessment.high, 4.419);
  assert.ok(WHO.p3 > assessment.low);
  assert.ok(WHO.p97 < assessment.high);
  assert.equal(WHO.p50, 3.3464);
  closeTo(assessment.percentile, 50, 0.00001);
});

test('China references retain birth values and approximate-month interpolation', () => {
  assert.deepEqual(getMaleWeightReferences(birthday, birthday).CN, { p3: 2.8, p50: 3.5, p97: 4.2 });
  // 15 and 30 days lie below one approximate month; 31 and 45 lie above it.
  for (const [days, expected] of [
    [15, { p3: 3.244, p50: 4.042, p97: 4.89 }],
    [30, { p3: 3.687, p50: 4.584, p97: 5.58 }],
    [31, { p3: 3.718, p50: 4.622, p97: 5.628 }],
    [45, { p3: 4.178, p50: 5.174, p97: 6.318 }],
    // 487 / 30.4375 is exactly 16 months, an existing table row.
    [487, { p3: 9, p50: 10.9, p97: 13.3 }],
  ]) {
    const measuredAt = atDay(days);
    const { CN } = getMaleWeightReferences(birthday, measuredAt);
    assert.deepEqual(CN, expected);
    const assessment = getChinaMaleWeightAssessment(birthday, measuredAt, CN.p50);
    assert.equal(assessment.low, CN.p3);
    assert.equal(assessment.median, CN.p50);
    assert.equal(assessment.high, CN.p97);
    assert.equal(assessment.percentile, 50);
  }
});

test('each source stops at its own available age range without extrapolating', () => {
  const lastWhoDay = getMaleWeightReferences(birthday, atDay(731));
  assert.ok(lastWhoDay.WHO && lastWhoDay.CN);
  assert.equal(lastWhoDay.WHO.p50, 12.1548);
  const afterWho = getMaleWeightReferences(birthday, atDay(732));
  assert.equal(afterWho.WHO, null);
  assert.ok(afterWho.CN);
  assert.equal(getWhoMaleWeightAssessment(birthday, atDay(732), 12), null);
  // 81 * 30.4375 = 2465.4375 days; day 2465 is inside, day 2466 outside.
  assert.deepEqual(getMaleWeightReferences(birthday, atDay(2465)), {
    WHO: null,
    CN: { p3: 18.198, p50: 23.397, p97: 30.596 },
  });
  assert.deepEqual(getMaleWeightReferences(birthday, atDay(2466)), noReferences);
  assert.equal(getChinaMaleWeightAssessment(birthday, atDay(2466), 20), null);
  assert.deepEqual(getMaleWeightReferences(birthday, atDay(-1)), noReferences);
  assert.deepEqual(getMaleWeightAssessments(birthday, atDay(-1), 3), []);
});

test('invalid or rolled-over dates return no references or assessments and never throw', () => {
  for (const invalid of [
    '', 'today', '2026-8-12', '2026-08-1', '2026-00-12', '2026-13-12',
    '2026-02-29', '2026-04-31', '2026-08-00', '2026-08-32',
    '2026-08-12T00:00:00Z', ' 2026-08-12', '2026-08-12 ',
    '1900-02-29', null, undefined, 20260812, {}, [], true,
  ]) {
    for (const [birth, measuredAt] of [[invalid, birthday], [birthday, invalid]]) {
      assert.deepEqual(getMaleWeightReferences(birth, measuredAt), noReferences);
      assert.equal(getWhoMaleWeightAssessment(birth, measuredAt, 3.5), null);
      assert.equal(getChinaMaleWeightAssessment(birth, measuredAt, 3.5), null);
      assert.deepEqual(getMaleWeightAssessments(birth, measuredAt, 3.5), []);
    }
  }
});

test('age uses real UTC calendar days through leap years and daylight-saving boundaries', () => {
  const dayOne = getMaleWeightReferences(birthday, atDay(1));
  const dayTwo = getMaleWeightReferences(birthday, atDay(2));
  assert.deepEqual(getMaleWeightReferences('2028-02-28', '2028-02-29'), dayOne);
  assert.deepEqual(getMaleWeightReferences('2028-02-28', '2028-03-01'), dayTwo);
  assert.deepEqual(getMaleWeightReferences('2000-02-28', '2000-03-01'), dayTwo);
  assert.deepEqual(getMaleWeightReferences('2026-02-28', '2026-03-01'), dayOne);
  assert.deepEqual(getMaleWeightReferences('1900-02-28', '1900-03-01'), dayOne);
  assert.deepEqual(getMaleWeightReferences('2026-03-07', '2026-03-09'), dayTwo);
});

test('invalid weights still produce no assessments', () => {
  for (const weight of [0, -1, NaN, Infinity, -Infinity, '3.5', null, undefined]) {
    assert.deepEqual(getMaleWeightAssessments(birthday, birthday, weight), []);
  }
});

test('WHO displayed ±2 SD bounds are included, even when the percentile rounds past P2.3 or P97.7', () => {
  const measuredAt = atDay(60);
  const lower = getWhoMaleWeightAssessment(birthday, measuredAt, 4.296);
  const upper = getWhoMaleWeightAssessment(birthday, measuredAt, 7.060);
  assert.equal(lower.low, 4.296);
  assert.equal(upper.high, 7.060);
  assert.ok(lower.percentile < 2.3);
  assert.ok(upper.percentile > 97.7);
  assert.equal(lower.position, '偏低位置');
  assert.equal(upper.position, '偏高位置');
  assert.equal(getWhoMaleWeightAssessment(birthday, measuredAt, 4.295).position, '低于参考区间');
  assert.equal(getWhoMaleWeightAssessment(birthday, measuredAt, 7.061).position, '高于参考区间');
  assert.equal(getWhoMaleWeightAssessment(birthday, measuredAt, 5.565).position, '中间位置');
});

test('China labels show table limits outside P3/P97 and estimated percentiles inside', () => {
  for (const days of [0, 15, 60, 487, 2465]) {
    const measuredAt = atDay(days);
    const { CN } = getMaleWeightReferences(birthday, measuredAt);
    assert.equal(getChinaMaleWeightAssessment(birthday, measuredAt, CN.p3 - 0.001).percentileLabel, 'P<3');
    assert.equal(getChinaMaleWeightAssessment(birthday, measuredAt, CN.p97 + 0.001).percentileLabel, 'P>97');
    assert.equal(getChinaMaleWeightAssessment(birthday, measuredAt, CN.p3).percentileLabel, '约P3');
    assert.equal(getChinaMaleWeightAssessment(birthday, measuredAt, CN.p50).percentileLabel, '约P50');
    assert.equal(getChinaMaleWeightAssessment(birthday, measuredAt, CN.p97).percentileLabel, '约P97');
  }
  const betweenTablePercentiles = getChinaMaleWeightAssessment(birthday, birthday, 3.26);
  assert.equal(betweenTablePercentiles.percentileLabel, '约P30');
  closeTo(betweenTablePercentiles.percentile, 30);
});

test('China age labels identify the day-based month approximation instead of completed calendar months', () => {
  assert.equal(getChinaMaleWeightAssessment(birthday, atDay(59), 5).ageLabel, '59 天');
  assert.equal(getChinaMaleWeightAssessment(birthday, atDay(60), 5).ageLabel, '约2.0月龄');
  // These dates are exactly three calendar months apart but only 90 days.
  assert.equal(getChinaMaleWeightAssessment('2026-01-01', '2026-04-01', 6).ageLabel, '约3.0月龄');
  assert.equal(getChinaMaleWeightAssessment('2026-01-01', '2026-04-15', 6).ageLabel, '约3.4月龄');
});
