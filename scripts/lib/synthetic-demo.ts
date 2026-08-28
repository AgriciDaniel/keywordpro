/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getProjectorOverride } from '@/lib/research/endpoint-overrides';
import { getEndpointByType } from '@/lib/research/endpoints';
import { runKeywordBundle } from '@/lib/research/keyword-bundle-runner';
import { trimBundleForStorage } from '@/lib/research/keyword-merge';
import type { ResearchRunResult } from '@/lib/research/console-types';
import { unwrapProviderResult } from '@/lib/research/unwrap';

export const SYNTHETIC_DEMO_SEED = 'keyword pro demo';
export const SYNTHETIC_DEMO_SESSION_ID = 'synthetic-demo-report';

const FIXTURE_ROOT = join(process.cwd(), 'scripts/fixtures/dataforseo');

const FIXTURES: Record<string, string> = {
  'labs.google.keyword_overview.live':
    'labs/fixtures/google-keyword-overview.json',
  'labs.google.related_keywords.live':
    'labs/fixtures/google-related-keywords.json',
  'labs.google.keyword_suggestions.live':
    'labs/fixtures/google-keyword-suggestions.json',
  'labs.google.keyword_ideas.live': 'labs/fixtures/google-keyword-ideas.json',
  'keyword.google_ads.search_volume.live':
    'keywords-data/fixtures/google-ads-search-volume.json',
  'keyword.bing.search_volume.live':
    'keywords-data/fixtures/bing-search-volume.json',
  'keyword.google_trends.explore.live':
    'keywords-data/fixtures/google-trends-explore.json',
  'serp.google.organic.live': 'serp/fixtures/google-organic.json',
  'labs.google.serp_competitors.live':
    'labs/fixtures/google-serp-competitors.json',
};

const DEMO_KEYWORDS = [
  'keyword pro demo',
  'keyword research workflow',
  'local keyword research',
  'keyword opportunity finder',
  'search intent analysis',
  'keyword difficulty checker',
  'serp research dashboard',
  'keyword trend analysis',
];

export async function buildSyntheticDemoResult(): Promise<ResearchRunResult> {
  const merged = await runKeywordBundle({
    seed: SYNTHETIC_DEMO_SEED,
    params: {
      country: 'US',
      language: 'en',
      keyword: SYNTHETIC_DEMO_SEED,
      keywords: [SYNTHETIC_DEMO_SEED],
    },
    onProgress: () => undefined,
    call: async (type, params) => {
      const fixture = FIXTURES[type];
      if (fixture) {
        const path = join(FIXTURE_ROOT, fixture);
        if (!existsSync(path)) {
          return { response: null, error: `Missing synthetic fixture: ${fixture}` };
        }

        const endpoint = getEndpointByType(type);
        if (!endpoint) {
          return { response: null, error: `Unknown endpoint: ${type}` };
        }

        const raw = JSON.parse(readFileSync(path, 'utf8'));
        const unwrapped = unwrapProviderResult(raw, endpoint);
        const override = getProjectorOverride(type);
        const data = override
          ? override(unwrapped, type, {})
          : endpoint.project(unwrapped, type, {});

        return { response: { ok: true, data, cost: 0 }, error: null };
      }

      const data = syntheticProjectedData(type, params);
      return data
        ? { response: { ok: true, data, cost: 0 }, error: null }
        : { response: null, error: `No synthetic demo data for ${type}` };
    },
  });

  return {
    type: 'keyword.bundle',
    label: `Keyword research: ${SYNTHETIC_DEMO_SEED}`,
    response: {
      ok: true,
      data: trimBundleForStorage(merged),
      cost: 0,
    },
    error: null,
  };
}

function syntheticProjectedData(
  type: string,
  params: Record<string, unknown>,
): { results: unknown[] } | null {
  const keywords = readKeywords(params);

  switch (type) {
    case 'labs.google.search_intent.live':
      return {
        results: keywords.map((keyword, index) => ({
          keyword,
          main_intent: ['commercial', 'informational', 'navigational'][index % 3],
        })),
      };
    case 'labs.google.bulk_keyword_difficulty.live':
      return {
        results: keywords.map((keyword, index) => ({
          keyword,
          keyword_difficulty: 12 + ((index * 13) % 76),
        })),
      };
    case 'keyword.dataforseo_trends.explore.live':
      return {
        results: [
          {
            data: monthlyInterest(58, 11),
            keyword: SYNTHETIC_DEMO_SEED,
          },
        ],
      };
    case 'keyword.dataforseo_trends.demography.live':
      return {
        results: [
          {
            demography: {
              age: [
                {
                  values: [
                    { type: '18-24', value: 38 },
                    { type: '25-34', value: 72 },
                    { type: '35-44', value: 100 },
                    { type: '45-54', value: 63 },
                    { type: '55-64', value: 31 },
                  ],
                },
              ],
              gender: [
                {
                  values: [
                    { type: 'female', value: 83 },
                    { type: 'male', value: 68 },
                  ],
                },
              ],
            },
            keyword: SYNTHETIC_DEMO_SEED,
          },
        ],
      };
    case 'keyword.dataforseo_trends.subregion_interests.live':
      return {
        results: [
          {
            interests: [
              {
                values: [
                  { geo_name: 'Oregon', value: 100 },
                  { geo_name: 'Colorado', value: 91 },
                  { geo_name: 'Vermont', value: 86 },
                  { geo_name: 'Washington', value: 78 },
                  { geo_name: 'Maine', value: 74 },
                  { geo_name: 'Minnesota', value: 69 },
                  { geo_name: 'Utah', value: 64 },
                  { geo_name: 'Virginia', value: 59 },
                ],
              },
            ],
            keyword: SYNTHETIC_DEMO_SEED,
          },
        ],
      };
    case 'labs.google.historical_keyword_data.live':
      return {
        results: [
          {
            history: monthlyHistory(),
            keyword: SYNTHETIC_DEMO_SEED,
          },
        ],
      };
    case 'labs.amazon.related_keywords.live':
      return {
        results: DEMO_KEYWORDS.slice(1, 6).map((keyword, index) => ({
          keyword,
          search_volume: 520 - index * 63,
        })),
      };
    case 'labs.amazon.bulk_search_volume.live':
      return {
        results: keywords.map((keyword, index) => ({
          keyword,
          search_volume: Math.max(20, 340 - index * 17),
        })),
      };
    case 'serp.google.autocomplete.live':
      return {
        results: [
          'keyword research tool',
          'keyword research workflow',
          'keyword research for content',
          'keyword research dashboard',
          'keyword opportunity finder',
          'keyword trend analysis',
          'keyword research report',
          'local keyword research',
        ].map((suggestion) => ({ suggestion })),
      };
    case 'labs.google.categories_for_keywords.live':
      return {
        results: keywords.map((keyword) => ({
          categories: ['Business & Industrial', 'Advertising & Marketing'],
          keyword,
        })),
      };
    default:
      return null;
  }
}

function readKeywords(params: Record<string, unknown>): string[] {
  const values = Array.isArray(params.keywords)
    ? params.keywords.filter((value): value is string => typeof value === 'string')
    : [];
  return values.length > 0 ? values : DEMO_KEYWORDS;
}

function monthlyInterest(base: number, swing: number) {
  return Array.from({ length: 18 }, (_, index) => {
    const monthIndex = index % 12;
    const year = 2025 + Math.floor(index / 12);
    const month = monthIndex + 1;
    const value = Math.max(
      12,
      Math.min(100, base + ((index * 7) % 29) - 14 + (index % 4) * swing),
    );
    const date = `${year}-${String(month).padStart(2, '0')}-01`;
    return { date_from: date, date_to: date, values: [value] };
  });
}

function monthlyHistory() {
  return Array.from({ length: 36 }, (_, index) => {
    const monthIndex = index % 12;
    const year = 2023 + Math.floor(index / 12);
    return {
      year,
      month: monthIndex + 1,
      keyword_info: {
        search_volume: 1180 + index * 54 + (index % 5) * 95,
        cpc: Number((2.1 + (index % 8) * 0.23).toFixed(2)),
        competition: Number((0.28 + (index % 7) * 0.045).toFixed(3)),
      },
    };
  });
}
