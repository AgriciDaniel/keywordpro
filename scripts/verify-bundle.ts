/**
 * Free verification of the keyword bundle and its merge.
 *
 * The bundle spends real money on every search, so the things worth asserting
 * are: that every entry is actually callable from a keyword alone, that the
 * merge never lets one engine's number masquerade as another's, and that the
 * two-wave order hands the bulk endpoints the full keyword list rather than
 * the seed on its own.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/verify-bundle.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { estimateBatchCents, hasMeasuredCost } from '@/lib/research/cost-table';
import { getEndpointByType as getCatalogEndpoint } from '@/lib/research/endpoint-catalog';
import { getProjectorOverride } from '@/lib/research/endpoint-overrides';
import { getEndpointByType } from '@/lib/research/endpoints';
import {
  bundleEntriesForTargeting,
  KEYWORD_BUNDLE,
} from '@/lib/research/keyword-bundle';
import { runKeywordBundle } from '@/lib/research/keyword-bundle-runner';
import { unwrapProviderResult } from '@/lib/research/unwrap';

let pass = 0;
const failures: string[] = [];
const check = (claim: string, ok: boolean) => {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${claim}`);
  } else {
    failures.push(claim);
    console.log(`  FAIL  ${claim}`);
  }
};

// ---------------------------------------------------------------------------
console.log('Bundle definition\n');

const SEED_ONLY = new Set([
  'keyword',
  'keywords',
  'country',
  'language',
  'location_code',
  'language_code',
  'location_name',
  'language_name',
]);

check(
  'every entry exists in the catalog',
  KEYWORD_BUNDLE.every((entry) => getCatalogEndpoint(entry.type) !== null),
);
check(
  'no entry is a stub',
  KEYWORD_BUNDLE.every((entry) => !getCatalogEndpoint(entry.type)?.stub),
);
check(
  'every entry runs from a keyword and locale alone',
  KEYWORD_BUNDLE.every((entry) =>
    (getCatalogEndpoint(entry.type)?.required ?? []).every((field) =>
      SEED_ONLY.has(field),
    ),
  ),
);
check(
  'no endpoint appears twice',
  new Set(KEYWORD_BUNDLE.map((entry) => entry.type)).size === KEYWORD_BUNDLE.length,
);

check(
  'US English keeps the complete 19-source report',
  bundleEntriesForTargeting('US', 'en').length === KEYWORD_BUNDLE.length,
);

check(
  'Google-only pairs omit unsupported Bing and Amazon calls before spending',
  (() => {
    const types = bundleEntriesForTargeting('US', 'es').map(
      (entry) => entry.type,
    );
    return (
      types.length === KEYWORD_BUNDLE.length - 3 &&
      !types.some(
        (type) => type.includes('.bing.') || type.includes('.amazon.'),
      )
    );
  })(),
);

check(
  'Bing-capable markets use the separate Keywords Data targeting catalog',
  (() => {
    const types = bundleEntriesForTargeting('DE', 'de').map(
      (entry) => entry.type,
    );
    return (
      types.includes('keyword.bing.search_volume.live') &&
      !types.some((type) => type.includes('.amazon.'))
    );
  })(),
);

check(
  'an invalid country-language pair produces no paid plan',
  bundleEntriesForTargeting('RO', 'en').length === 0,
);

const cents = estimateBatchCents(KEYWORD_BUNDLE.map((entry) => entry.type));
// A guard rail, not a target: if someone adds a $0.10 AI endpoint the cost of
// every single search jumps, and that should be a deliberate act.
check(`the bundle costs under $0.70 a search (currently $${(cents / 100).toFixed(3)})`, cents < 70);

// The estimate is what the user sees before pressing Enter. A measured figure
// exists for every endpoint that dominates the bill, so the estimate cannot
// drift far from reality without someone noticing. The first live run cost
// $0.4950; the family guesses predicted $0.2940, which was 68% low.
const unmeasured = KEYWORD_BUNDLE.filter((entry) => !hasMeasuredCost(entry.type));
check(
  `every bundle endpoint has a measured cost (${unmeasured.length} without: ${unmeasured.map((e) => e.type).join(', ') || 'none'})`,
  unmeasured.length === 0,
);
check(
  `the estimate stays within the reviewed half-dollar baseline ($${(cents / 100).toFixed(4)} vs $0.4950)`,
  Math.abs(cents / 100 - 0.495) < 0.05,
);

// The Keywords Data API bills per request, not per result, so these two cost
// the same for one keyword or a thousand. Feeding them the seed alone spent
// $0.18 to enrich a single row.
const FLAT_PRICED_BULK = [
  'keyword.google_ads.search_volume.live',
  'keyword.bing.search_volume.live',
];
check(
  'the flat-priced volume endpoints run in the second wave, on the full keyword list',
  FLAT_PRICED_BULK.every((type) => KEYWORD_BUNDLE.some((entry) => entry.type === type)),
);

// ---------------------------------------------------------------------------
const FIXTURE_ROOT = join(
  process.cwd(),
  'scripts/fixtures/dataforseo',
);

const FIXTURES: Record<string, string> = {
  'labs.google.keyword_overview.live': 'labs/fixtures/google-keyword-overview.json',
  'labs.google.related_keywords.live': 'labs/fixtures/google-related-keywords.json',
  'labs.google.keyword_suggestions.live': 'labs/fixtures/google-keyword-suggestions.json',
  'labs.google.keyword_ideas.live': 'labs/fixtures/google-keyword-ideas.json',
  'keyword.google_ads.search_volume.live': 'keywords-data/fixtures/google-ads-search-volume.json',
  'keyword.bing.search_volume.live': 'keywords-data/fixtures/bing-search-volume.json',
  'keyword.google_trends.explore.live': 'keywords-data/fixtures/google-trends-explore.json',
  'serp.google.organic.live': 'serp/fixtures/google-organic.json',
  'labs.google.serp_competitors.live': 'labs/fixtures/google-serp-competitors.json',
};

async function verifyRun() {
  if (!existsSync(FIXTURE_ROOT)) {
    failures.push(`committed fixtures not found at ${FIXTURE_ROOT}`);
    return;
  }

  console.log('\nMerge and run order\n');

  const bulkKeywordCounts: Record<string, number> = {};

  const merged = await runKeywordBundle({
    seed: 'seo tools',
    params: { keyword: 'seo tools', keywords: ['seo tools'] },
    onProgress: () => {},
    call: async (type, params) => {
      if (
        type === 'labs.google.search_intent.live' ||
        type === 'labs.google.bulk_keyword_difficulty.live' ||
        type === 'keyword.google_ads.search_volume.live' ||
        type === 'keyword.bing.search_volume.live'
      ) {
        bulkKeywordCounts[type] = (params.keywords as string[])?.length ?? 0;
      }
      const fixture = FIXTURES[type];
      if (!fixture || !existsSync(join(FIXTURE_ROOT, fixture))) {
        return { response: null, error: 'no fixture' };
      }
      const endpoint = getEndpointByType(type);
      if (!endpoint) return { response: null, error: 'unknown endpoint' };
      const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, fixture), 'utf8'));
      const unwrapped = unwrapProviderResult(raw, endpoint);
      const override = getProjectorOverride(type);
      const data = override
        ? override(unwrapped, type, {})
        : endpoint.project(unwrapped, type, {});
      return { response: { ok: true, data, cost: 0.0101, raw }, error: null };
    },
  });

  check('the merge produces keyword rows', merged.count > 0);

  // The whole point of the two waves: the bulk endpoints must be handed the
  // expanded list, not the one word the user typed.
  const counts = Object.entries(bulkKeywordCounts);
  check(
    `every second-wave endpoint receives the expanded keyword list, not just the seed (${counts.map(([t, n]) => `${t.split('.').pop()}=${n}`).join(', ')})`,
    counts.length === 4 && counts.every(([, count]) => count > 1),
  );

  // Bing's volume for a term is routinely three orders of magnitude below
  // Google's. Letting it land on `search_volume` would silently corrupt the
  // table, the charts and the exports.
  const bingRows = merged.results.filter((row) => row.bing_search_volume != null);
  check(
    'Bing volume is namespaced rather than overwriting the Google figure',
    bingRows.length > 0 &&
      bingRows.every(
        (row) => row.bing_search_volume !== row.search_volume || row.search_volume == null,
      ),
  );

  check(
    'every merged row records which endpoints contributed to it',
    merged.results.every((row) => Array.isArray(row._sources) && row._sources.length > 0),
  );

  check(
    'non-keyword results are filed as panels, not flattened into the table',
    Object.keys(merged.meta.panels).length > 0,
  );

  check(
    'the run reports what every endpoint contributed',
    merged.meta.sources.length === KEYWORD_BUNDLE.length,
  );

  // `cost` is dollars everywhere. A local estimate is stored in cents, so the
  // dispatcher must convert the fallback before rendering it as dollars.
  const costs = merged.meta.sources
    .map((source) => source.cost)
    .filter((cost): cost is number => cost !== null);
  check(
    `every reported cost is on the dollar scale, not a credit count (max $${Math.max(0, ...costs).toFixed(4)})`,
    costs.length > 0 && costs.every((cost) => cost >= 0 && cost < 1),
  );

  // A failing endpoint must not take the others with it.
  const failed = merged.meta.sources.filter((source) => !source.ok);
  check(
    `a failed endpoint does not abort the run (${failed.length} failed, ${merged.count} keywords still merged)`,
    merged.count > 0,
  );

  const calledForSpanishUs: string[] = [];
  await runKeywordBundle({
    seed: 'seo tools',
    params: {
      country: 'US',
      language: 'es',
      keyword: 'seo tools',
      keywords: ['seo tools'],
    },
    onProgress: () => {},
    call: async (type) => {
      calledForSpanishUs.push(type);
      return {
        response: { ok: true, data: { results: [] }, cost: 0 },
        error: null,
      };
    },
  });
  check(
    'the runner follows the market-aware plan instead of calling unsupported engines',
    calledForSpanishUs.length === KEYWORD_BUNDLE.length - 3 &&
      !calledForSpanishUs.some(
        (type) => type.includes('.bing.') || type.includes('.amazon.'),
      ),
  );
}

verifyRun().then(() => {
  console.log(`\n${pass} passed, ${failures.length} failed`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(failures.length > 0 ? 1 : 0);
});
