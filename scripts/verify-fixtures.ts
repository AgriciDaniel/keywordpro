/**
 * Free verification against deterministic synthetic contract fixtures.
 *
 * `scripts/verify-projectors.ts` proves the envelope unwrap using synthetic
 * payloads. This script goes further and replays field-realistic synthetic
 * envelopes through the actual endpoint definitions plus the corrections in
 * `src/lib/research/endpoint-overrides.ts`.
 *
 * It exists because four generated projectors read fields the provider never
 * sends. Those bugs are invisible at runtime, since a projector reading a
 * missing key returns an empty string or undefined rather than throwing, so
 * only a replay against real data catches them.
 *
 * No network, no cost.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/verify-fixtures.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEndpointByType } from '@/lib/research/endpoints';
import {
  getProjectorOverride,
  patchRequestBody,
} from '@/lib/research/endpoint-overrides';
import { unwrapProviderResult } from '@/lib/research/unwrap';
import type { ResultEnvelope } from '@/lib/research/types';

const FIXTURE_ROOT = join(
  process.cwd(),
  'scripts/fixtures/dataforseo',
);

type Check = {
  /** Human-readable claim this assertion defends. */
  claim: string;
  run: (envelope: ResultEnvelope) => boolean;
};

type Case = {
  type: string;
  fixture: string;
  /** What the generated projector got wrong, for the report. */
  wasBroken?: string;
  checks: Check[];
};

const rows = (e: ResultEnvelope): Array<Record<string, unknown>> =>
  Array.isArray(e.results) ? (e.results as Array<Record<string, unknown>>) : [];
const one = (e: ResultEnvelope): Record<string, unknown> =>
  (e.results ?? {}) as Record<string, unknown>;

const CASES: Case[] = [
  // -------------------------------------------------------------------------
  // The four genuine bugs.
  // -------------------------------------------------------------------------
  ...(['chat_gpt', 'claude', 'gemini', 'perplexity'] as const).map((vendor) => ({
    type: `ai.${vendor}.llm_responses.live`,
    fixture: `ai-optimization/fixtures/llm-responses-${vendor}.json`,
    wasBroken: 'read items[0].response_text; answer and citations always empty',
    checks: [
      {
        claim: 'answer text is non-empty',
        run: (e: ResultEnvelope) =>
          typeof one(e).response_text === 'string' &&
          (one(e).response_text as string).length > 50,
      },
      {
        claim: 'model name is reported',
        run: (e: ResultEnvelope) => Boolean(one(e).model),
      },
      {
        claim: 'citations carry a resolved domain when present',
        run: (e: ResultEnvelope) => {
          const citations = one(e).citations as Array<Record<string, unknown>>;
          if (!Array.isArray(citations)) return false;
          if (citations.length === 0) return true; // not every model cites
          return citations.every((c) => c.url && c.domain);
        },
      },
    ],
  })),
  {
    type: 'content.search.live',
    fixture: 'content-analysis/fixtures/search.json',
    wasBroken: 'read x.meta.title / x.snippet / x.rank; 3 of 6 columns blank',
    checks: [
      {
        claim: 'every row has a title',
        run: (e) => rows(e).length > 0 && rows(e).every((r) => Boolean(r.title)),
      },
      {
        claim: 'rank is populated from url_rank',
        run: (e) => rows(e).every((r) => typeof r.rank === 'number'),
      },
      {
        claim: 'offset_token is preserved for pagination',
        run: (e) => 'offset_token' in (e.meta ?? {}),
      },
    ],
  },
  {
    type: 'keyword.clickstream.dataforseo_search_volume.live',
    fixture: 'keywords-data/fixtures/clickstream-dfs-search-volume.json',
    wasBroken: 'mapped the wrapper array; every row was all-undefined',
    checks: [
      {
        claim: 'rows carry a keyword',
        run: (e) => rows(e).length > 0 && rows(e).every((r) => Boolean(r.keyword)),
      },
      {
        claim: 'rows carry a numeric search volume',
        run: (e) => rows(e).every((r) => typeof r.search_volume === 'number'),
      },
      {
        claim: 'the monthly series survives',
        run: (e) =>
          rows(e).every((r) => Array.isArray(r.monthly_searches) && r.monthly_searches.length > 0),
      },
    ],
  },
  {
    type: 'keyword.bing.search_volume.live',
    fixture: 'keywords-data/fixtures/bing-search-volume.json',
    wasBroken: "bucketed from competition_index, absent on Bing; every row read 'LOW'",
    checks: [
      {
        claim: 'Bing competition 0.9 is not reported as LOW',
        run: (e) =>
          rows(e).every(
            (r) => !(Number(r.competition_raw) >= 0.67 && r.competition_level === 'LOW'),
          ),
      },
      {
        claim: 'competition is normalised onto a 0-100 index',
        run: (e) =>
          rows(e).every(
            (r) => r.competition_index === null || (Number(r.competition_index) >= 0 && Number(r.competition_index) <= 100),
          ),
      },
    ],
  },
  {
    type: 'keyword.google_ads.search_volume.live',
    fixture: 'keywords-data/fixtures/google-ads-search-volume.json',
    wasBroken: 'shared the Bing defect; competition string vs index disagreement',
    checks: [
      {
        claim: 'rows carry a keyword and volume',
        run: (e) =>
          rows(e).length > 0 &&
          rows(e).every((r) => Boolean(r.keyword) && typeof r.search_volume === 'number'),
      },
      {
        claim: 'the monthly series survives',
        run: (e) => rows(e).every((r) => Array.isArray(r.monthly_searches)),
      },
    ],
  },
  {
    type: 'content.sentiment_analysis.live',
    fixture: 'content-analysis/fixtures/summary.json',
    wasBroken: 'scored positive-negative over the wrong object; always exactly 0',
    checks: [
      {
        claim: 'overall_score is not stuck at zero',
        run: (e) => typeof one(e).overall_score === 'number' && one(e).overall_score !== 0,
      },
      {
        claim: 'positive and negative counts are real',
        run: (e) => Number(one(e).positive) > 0 && Number(one(e).negative) > 0,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // The keyword table: everything the generated projector threw away.
  // -------------------------------------------------------------------------
  ...(
    [
      ['labs.google.keyword_overview.live', 'google-keyword-overview'],
      ['labs.google.keyword_ideas.live', 'google-keyword-ideas'],
      ['labs.google.keyword_suggestions.live', 'google-keyword-suggestions'],
      ['labs.google.related_keywords.live', 'google-related-keywords'],
    ] as const
  ).map(([type, name]) => ({
    type,
    fixture: `labs/fixtures/${name}.json`,
    wasBroken: 'kept 11 fields; dropped monthly_searches, backlinks, competition, offset_token',
    checks: [
      {
        claim: 'the monthly series is kept, not just its percentages',
        run: (e: ResultEnvelope) =>
          rows(e).some(
            (r) => Array.isArray(r.monthly_searches) && r.monthly_searches.length > 0,
          ),
      },
      {
        claim: 'trends stay signed and are null rather than 0 when absent',
        run: (e: ResultEnvelope) =>
          rows(e).every(
            (r) => r.monthly_trend === null || typeof r.monthly_trend === 'number',
          ),
      },
      {
        claim: 'the raw competition float survives alongside the bucket',
        run: (e: ResultEnvelope) =>
          rows(e).every((r) => r.competition === null || typeof r.competition === 'number'),
      },
      {
        claim: 'avg_backlinks_info is no longer discarded',
        run: (e: ResultEnvelope) =>
          rows(e).some((r) => typeof r.referring_domains === 'number'),
      },
      {
        claim: 'the untouched source row travels on _full',
        run: (e: ResultEnvelope) => rows(e).every((r) => r._full && typeof r._full === 'object'),
      },
      {
        claim: 'keyword difficulty is present',
        run: (e: ResultEnvelope) =>
          rows(e).some((r) => typeof r.difficulty === 'number'),
      },
    ],
  })),
];

// ---------------------------------------------------------------------------

let pass = 0;
const failures: string[] = [];

if (!existsSync(FIXTURE_ROOT)) {
  console.error(`Committed fixtures not found at ${FIXTURE_ROOT}.`);
  process.exit(1);
}

console.log('Replaying synthetic DataForSEO contract fixtures through the fixed projectors.\n');

for (const testCase of CASES) {
  const path = join(FIXTURE_ROOT, testCase.fixture);
  if (!existsSync(path)) {
    failures.push(`${testCase.type}: missing ${testCase.fixture}`);
    continue;
  }

  const endpoint = getEndpointByType(testCase.type);
  if (!endpoint) {
    failures.push(`${testCase.type}: endpoint not in the catalog`);
    continue;
  }

  const raw = JSON.parse(readFileSync(path, 'utf8'));

  let projected: ResultEnvelope;
  try {
    const unwrapped = unwrapProviderResult(raw, endpoint);
    const override = getProjectorOverride(endpoint.type);
    projected = (
      override
        ? override(unwrapped, endpoint.type, {})
        : endpoint.project(unwrapped, endpoint.type, {})
    ) as ResultEnvelope;
  } catch (error) {
    failures.push(`${testCase.type}: threw ${(error as Error).message}`);
    console.log(`  THREW  ${testCase.type}`);
    continue;
  }

  console.log(`  ${testCase.type}  (count=${projected.count})`);
  if (testCase.wasBroken) console.log(`    was: ${testCase.wasBroken}`);

  for (const check of testCase.checks) {
    let ok = false;
    try {
      ok = check.run(projected);
    } catch {
      ok = false;
    }
    if (ok) {
      pass += 1;
      console.log(`    PASS  ${check.claim}`);
    } else {
      failures.push(`${testCase.type}: ${check.claim}`);
      console.log(`    FAIL  ${check.claim}`);
    }
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// Phase 2: the request bodies must stop suppressing the enrichment fields.
// ---------------------------------------------------------------------------

console.log('Request bodies:\n');
for (const type of [
  'labs.google.keyword_ideas.live',
  'labs.google.keyword_overview.live',
  'labs.google.keyword_suggestions.live',
  'labs.google.related_keywords.live',
]) {
  const endpoint = getEndpointByType(type);
  if (!endpoint) continue;

  const params = { keyword: 'seo tools', keywords: ['seo tools'], location_code: 2840, language_code: 'en' };
  const body = patchRequestBody(endpoint, endpoint.buildBody(params), params) as Record<string, unknown>;

  const serpOn = body.include_serp_info === true;
  const clickstreamOn = body.include_clickstream_data === true;
  if (serpOn && clickstreamOn) {
    pass += 1;
    console.log(`  PASS  ${type} requests serp_info and clickstream`);
  } else {
    failures.push(`${type}: include_serp_info=${body.include_serp_info}, include_clickstream_data=${body.include_clickstream_data}`);
    console.log(`  FAIL  ${type} serp=${body.include_serp_info} clickstream=${body.include_clickstream_data}`);
  }

  // Clickstream is unconditional now: it is the difference between Google's
  // figure and the panel's, and no stale stored input may switch it back off.
  const stale = patchRequestBody(endpoint, endpoint.buildBody(params), {
    ...params,
    include_clickstream_data: false,
  }) as Record<string, unknown>;
  if (stale.include_clickstream_data === true) {
    pass += 1;
  } else {
    failures.push(`${type}: a stale input turned clickstream off`);
    console.log(`  FAIL  ${type} clickstream can still be switched off`);
  }
}

console.log(`\n${pass} passed, ${failures.length} failed`);
for (const f of failures) console.log(`  - ${f}`);
process.exit(failures.length > 0 ? 1 : 0);
