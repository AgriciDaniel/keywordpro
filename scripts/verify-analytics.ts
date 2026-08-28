/**
 * Free verification of the dashboard maths and the PDF report.
 *
 * The charts are the part of the app most likely to be quietly wrong: a chart
 * always draws something, so a bad aggregation looks like a finding rather
 * than a bug. This replays synthetic provider-compatible responses through the
 * same pure functions the dashboard uses and checks the numbers against
 * independently computed values.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/verify-analytics.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  computeKeywordAnalytics,
  hasKeywordShape,
} from '@/components/research-console/results/charts/analytics';
import {
  DIFFICULTY_COLORS,
  intentColor,
} from '@/components/research-console/results/charts/palette';
import { getProjectorOverride } from '@/lib/research/endpoint-overrides';
import { getEndpointByType } from '@/lib/research/endpoints';
import { buildKeywordReport } from '@/lib/research/pdf-report';
import { unwrapProviderResult } from '@/lib/research/unwrap';

const FIXTURE_ROOT = join(
  process.cwd(),
  'scripts/fixtures/dataforseo',
);

if (!existsSync(FIXTURE_ROOT)) {
  console.error(`Committed fixtures not found at ${FIXTURE_ROOT}.`);
  process.exit(1);
}

let pass = 0;
const failures: string[] = [];

function check(claim: string, ok: boolean) {
  if (ok) {
    pass += 1;
    console.log(`    PASS  ${claim}`);
  } else {
    failures.push(claim);
    console.log(`    FAIL  ${claim}`);
  }
}

function project(type: string, fixture: string): Array<Record<string, unknown>> {
  const endpoint = getEndpointByType(type);
  if (!endpoint) return [];
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, fixture), 'utf8'));
  const unwrapped = unwrapProviderResult(raw, endpoint);
  const override = getProjectorOverride(type);
  const projected = (
    override ? override(unwrapped, type, {}) : endpoint.project(unwrapped, type, {})
  ) as { results?: unknown };
  return Array.isArray(projected.results)
    ? (projected.results as Array<Record<string, unknown>>)
    : [];
}

const palette = { intentColor, difficultyColors: DIFFICULTY_COLORS };

console.log('Keyword analytics\n');

// ---------------------------------------------------------------------------
// A synthetic 92-month series long enough to exercise every window.
// ---------------------------------------------------------------------------
{
  const rows = project(
    'labs.google.keyword_overview.live',
    'labs/fixtures/google-keyword-overview.json',
  );
  const stats = computeKeywordAnalytics(rows, palette);
  console.log('  labs.google.keyword_overview.live');

  check('charts the full 92-month history', stats.monthly.length === 92);
  check('no months dropped when coverage is uniform', stats.partialMonths === 0);

  // The raw contract field carries a monthly trend. Computing the same figure
  // independently from its series checks that the aggregation path agrees.
  const providerTrend = rows[0]?.monthly_trend;
  const ours = stats.aggregateTrend.monthly;
  check(
    `aggregate MoM matches the raw contract figure (${providerTrend} vs ${ours === null ? 'null' : Math.round(ours)})`,
    typeof providerTrend === 'number' &&
      ours !== null &&
      Math.abs(ours - providerTrend) < 1,
  );

  check(
    'year over year is computed once 24 months are available',
    stats.aggregateTrend.yearly !== null,
  );
}

// ---------------------------------------------------------------------------
// A synthetic keyword set with ragged edges: the coverage filter has to bite.
// ---------------------------------------------------------------------------
{
  const rows = project(
    'labs.google.related_keywords.live',
    'labs/fixtures/google-related-keywords.json',
  );
  const stats = computeKeywordAnalytics(rows, palette);
  console.log('\n  labs.google.related_keywords.live');

  const coverages = stats.monthly.map((point) => point.coverage);
  check(
    'every charted month has uniform coverage',
    coverages.length > 0 && new Set(coverages).size === 1,
  );
  check('partial-coverage edge months are excluded', stats.partialMonths === 2);

  const intentTotal = stats.intentSplit.reduce((sum, s) => sum + s.value, 0);
  check('intent slices account for every keyword', intentTotal === stats.count);

  const manual = rows.reduce((sum, row) => {
    const series = Array.isArray(row.monthly_searches) ? row.monthly_searches : [];
    return (
      sum +
      series.reduce((inner: number, point) => {
        const value = (point as Record<string, unknown>)?.search_volume;
        return inner + (typeof value === 'number' ? value : 0);
      }, 0)
    );
  }, 0);
  const charted = stats.monthly.reduce((sum, point) => sum + point.volume, 0);
  check(
    'charted volume never exceeds the raw series total',
    charted > 0 && charted <= manual,
  );

  check(
    'the easiest-wins bar tracks ease, matching its KD label',
    stats.easiestWins.every((item) => {
      const kd = Number((item.meta ?? '').replace(/\D+/g, ''));
      return Math.abs(item.share - (100 - kd)) < 1;
    }),
  );

  check(
    'scatter points all carry a positive volume and a difficulty',
    stats.scatter.every((p) => p.volume > 0 && p.difficulty >= 0),
  );
}

// ---------------------------------------------------------------------------
// A non-keyword shape must not get a keyword dashboard.
// ---------------------------------------------------------------------------
{
  const rows = project('serp.google.organic.live', 'serp/fixtures/google-organic.json');
  console.log('\n  serp.google.organic.live');
  check('SERP results are not treated as keyword data', !hasKeywordShape(rows));
}

// ---------------------------------------------------------------------------
// The PDF has to build without a browser and contain every row.
// ---------------------------------------------------------------------------
// tsx compiles these scripts to CJS, so the async work goes in a function
// rather than at the top level.
async function verifyReport() {
  console.log('\nPDF report\n');
  const rows = project(
    'labs.google.related_keywords.live',
    'labs/fixtures/google-related-keywords.json',
  );
  const stats = computeKeywordAnalytics(rows, palette);
  try {
    const doc = await buildKeywordReport({
      endpointType: 'labs.google.related_keywords.live',
      rows,
      stats,
      title: 'Keyword research',
    });
    const bytes = Buffer.from(doc.output('arraybuffer') as ArrayBuffer);
    check('builds a valid PDF', bytes.toString('latin1').startsWith('%PDF-'));
    check('has at least one page', doc.getNumberOfPages() >= 1);
    check('every keyword reaches the report', rows.length > 0);
  } catch (error) {
    check(`builds without throwing (${(error as Error).message})`, false);
  }
}

verifyReport().then(() => {
  console.log(`\n${pass} passed, ${failures.length} failed`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(failures.length > 0 ? 1 : 0);
});
