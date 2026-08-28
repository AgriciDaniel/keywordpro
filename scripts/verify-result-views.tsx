/**
 * Free verification that every result shape renders.
 *
 * `verify-fixtures.ts` proves the projectors return the right data. This one
 * proves the view layer can draw it: it server-renders the real result panel
 * against synthetic provider-compatible responses and asserts the table is not
 * empty.
 *
 * It exists because the failure mode here is silent. A column that resolves to
 * nothing, or a result shape with no matching view, renders as a blank card
 * rather than an error, which is exactly how the old panel hid most of the
 * payload behind an 8-row, 6-column cap.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/verify-result-views.tsx
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';

import { ResultPanel } from '@/components/research-console/results/ResultPanel';
import { getBatchSimpleField } from '@/components/research-console/simple-endpoint';
import {
  getEndpointByType,
  getEndpointsForSubcategory,
} from '@/lib/research/endpoint-catalog';
import { getProjectorOverride } from '@/lib/research/endpoint-overrides';
import { getEndpointByType as getGeneratedEndpoint } from '@/lib/research/endpoints';
import { toCsv } from '@/lib/research/export';
import { unwrapProviderResult } from '@/lib/research/unwrap';

const FIXTURE_ROOT = join(
  process.cwd(),
  'scripts/fixtures/dataforseo',
);

type Expect = 'table' | 'detail';

const CASES: Array<{ type: string; fixture: string; expect: Expect; minColumns?: number }> = [
  { type: 'labs.google.keyword_overview.live', fixture: 'labs/fixtures/google-keyword-overview.json', expect: 'table', minColumns: 10 },
  { type: 'labs.google.related_keywords.live', fixture: 'labs/fixtures/google-related-keywords.json', expect: 'table', minColumns: 10 },
  { type: 'labs.google.keyword_ideas.live', fixture: 'labs/fixtures/google-keyword-ideas.json', expect: 'table', minColumns: 10 },
  { type: 'labs.google.keyword_suggestions.live', fixture: 'labs/fixtures/google-keyword-suggestions.json', expect: 'table', minColumns: 10 },
  { type: 'keyword.bing.search_volume.live', fixture: 'keywords-data/fixtures/bing-search-volume.json', expect: 'table', minColumns: 5 },
  { type: 'keyword.google_ads.search_volume.live', fixture: 'keywords-data/fixtures/google-ads-search-volume.json', expect: 'table', minColumns: 5 },
  { type: 'keyword.clickstream.dataforseo_search_volume.live', fixture: 'keywords-data/fixtures/clickstream-dfs-search-volume.json', expect: 'table', minColumns: 3 },
  { type: 'content.search.live', fixture: 'content-analysis/fixtures/search.json', expect: 'table', minColumns: 6 },
  { type: 'serp.google.organic.live', fixture: 'serp/fixtures/google-organic.json', expect: 'table', minColumns: 5 },
  { type: 'ai.perplexity.llm_responses.live', fixture: 'ai-optimization/fixtures/llm-responses-perplexity.json', expect: 'detail' },
  { type: 'ai.chat_gpt.llm_responses.live', fixture: 'ai-optimization/fixtures/llm-responses-chat_gpt.json', expect: 'detail' },
  { type: 'content.sentiment_analysis.live', fixture: 'content-analysis/fixtures/summary.json', expect: 'detail' },
  { type: 'keyword.google_trends.explore.live', fixture: 'keywords-data/fixtures/google-trends-explore.json', expect: 'detail' },
];

if (!existsSync(FIXTURE_ROOT)) {
  console.error(`Committed fixtures not found at ${FIXTURE_ROOT}.`);
  process.exit(1);
}

let pass = 0;
const failures: string[] = [];

console.log('Server-rendering the result panel against synthetic responses.\n');

for (const testCase of CASES) {
  const path = join(FIXTURE_ROOT, testCase.fixture);
  const endpoint = getGeneratedEndpoint(testCase.type);
  if (!endpoint) {
    failures.push(`${testCase.type}: endpoint not in the catalog`);
    console.log(`  FAIL  ${testCase.type} endpoint missing`);
    continue;
  }
  if (!existsSync(path)) {
    failures.push(`${testCase.type}: missing ${testCase.fixture}`);
    console.log(`  FAIL  ${testCase.type} fixture missing`);
    continue;
  }

  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const unwrapped = unwrapProviderResult(raw, endpoint);
  const override = getProjectorOverride(endpoint.type);
  const projected = override
    ? override(unwrapped, endpoint.type, {})
    : (endpoint.project(unwrapped, endpoint.type, {}) as { results?: unknown });

  const response = { ok: true, data: projected, cost: 0.0101, raw };

  let html: string;
  try {
    html = renderToStaticMarkup(<ResultPanel response={response} />);
  } catch (error) {
    failures.push(`${testCase.type}: render threw ${(error as Error).message}`);
    console.log(`  FAIL  ${testCase.type} threw`);
    continue;
  }

  // One <th> is the row-expander column, so subtract it.
  const headers = Math.max(0, (html.match(/<th/g) ?? []).length - 1);
  const bodyRows = (html.match(/<tr/g) ?? []).length;

  if (testCase.expect === 'table') {
    const minimum = testCase.minColumns ?? 3;
    if (headers >= minimum && bodyRows > 1) {
      pass += 1;
      const csv = Array.isArray(projected.results)
        ? toCsv(
            (projected.results as Array<Record<string, unknown>>).map(
              ({ _full, ...rest }) => rest,
            ),
          )
        : '';
      console.log(
        `  PASS  ${testCase.type.padEnd(46)} ${headers} columns, ${bodyRows - 1} rows, csv ${csv.split('\r\n').length - 1} rows`,
      );
    } else {
      failures.push(
        `${testCase.type}: expected a table with >=${minimum} columns, got ${headers} columns and ${bodyRows - 1} rows`,
      );
      console.log(`  FAIL  ${testCase.type} rendered ${headers} columns`);
    }
    continue;
  }

  // A detail view: no table, but it must not be an empty card.
  if (headers === 0 && html.length > 2000) {
    pass += 1;
    console.log(`  PASS  ${testCase.type.padEnd(46)} detail view, ${html.length}b`);
  } else {
    failures.push(`${testCase.type}: detail view rendered ${html.length}b`);
    console.log(`  FAIL  ${testCase.type} detail view too thin`);
  }
}

// ---------------------------------------------------------------------------
// The composer and the parameter form must never both own the same input.
// ---------------------------------------------------------------------------

console.log('\nComposer field ownership:\n');
{
  const batch = getEndpointsForSubcategory('keyword-research');
  const resolved = getBatchSimpleField(batch);

  // These four disagree on spelling: related_keywords wants `keyword`, the
  // rest want `keywords`. They are one input to the person typing, so the
  // composer has to own both shapes. When it did not, the parameter form drew
  // a second keyword box under a composer that already held the value.
  if (
    resolved?.covered.includes('keyword') &&
    resolved.covered.includes('keywords')
  ) {
    pass += 1;
    console.log(
      `  PASS  the keyword batch resolves to one composer field covering ${resolved.covered.join(' + ')}`,
    );
  } else {
    failures.push(
      `keyword batch did not resolve to a shared composer field (got ${JSON.stringify(resolved)})`,
    );
    console.log('  FAIL  keyword batch did not resolve to a shared composer field');
  }

  // Endpoints whose identifying inputs genuinely differ must NOT be merged,
  // or the composer would silently drop one of them.
  const mixed = [
    getEndpointByType('labs.google.related_keywords.live'),
    getEndpointByType('serp.google.organic.live'),
    getEndpointByType('serp.youtube.video_info.live'),
  ].filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (mixed.length < 2 || getBatchSimpleField(mixed) === null) {
    pass += 1;
    console.log('  PASS  endpoints with different identifying inputs are not merged');
  } else {
    failures.push('a mixed batch was wrongly collapsed onto one composer field');
    console.log('  FAIL  a mixed batch was wrongly collapsed onto one composer field');
  }
}

console.log(`\n${pass} passed, ${failures.length} failed`);
for (const f of failures) console.log(`  - ${f}`);
process.exit(failures.length > 0 ? 1 : 0);
