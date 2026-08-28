/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

type MonthPoint = {
  month: number;
  search_volume: number;
  year: number;
};

const FIXTURE_ROOT = join(process.cwd(), 'scripts/fixtures/dataforseo');
const SYNTHETIC_DATE = '2026-08-28 00:00:00 +00:00';

function months(options: {
  count: number;
  endMonth?: number;
  endYear?: number;
  volume: (index: number) => number;
}): MonthPoint[] {
  const endMonth = options.endMonth ?? 8;
  const endYear = options.endYear ?? 2026;
  return Array.from({ length: options.count }, (_, index) => {
    const offset = options.count - index - 1;
    const date = new Date(Date.UTC(endYear, endMonth - 1 - offset, 1));
    return {
      month: date.getUTCMonth() + 1,
      search_volume: options.volume(index),
      year: date.getUTCFullYear(),
    };
  });
}

function percentChange(current: number, previous: number): number {
  return +(((current - previous) / previous) * 100).toFixed(4);
}

function trendFor(series: MonthPoint[]): {
  monthly: number | null;
  quarterly: number | null;
  yearly: number | null;
} {
  const windowChange = (size: number): number | null => {
    if (series.length < size * 2) return null;
    const current = series
      .slice(-size)
      .reduce((sum, point) => sum + point.search_volume, 0);
    const previous = series
      .slice(-size * 2, -size)
      .reduce((sum, point) => sum + point.search_volume, 0);
    return previous > 0 ? percentChange(current, previous) : null;
  };
  return {
    monthly: windowChange(1),
    quarterly: windowChange(3),
    yearly: windowChange(12),
  };
}

function keywordRow(options: {
  cpc: number;
  difficulty: number;
  intent: 'commercial' | 'informational' | 'navigational';
  keyword: string;
  monthly: MonthPoint[];
  volume: number;
}): Record<string, unknown> {
  return {
    keyword: options.keyword,
    location_code: 2840,
    language_code: 'en',
    keyword_info: {
      se_type: 'google',
      last_updated_time: SYNTHETIC_DATE,
      competition: +(options.difficulty / 100).toFixed(2),
      competition_level:
        options.difficulty >= 67
          ? 'HIGH'
          : options.difficulty >= 34
            ? 'MEDIUM'
            : 'LOW',
      cpc: options.cpc,
      search_volume: options.volume,
      low_top_of_page_bid: +(options.cpc * 0.55).toFixed(2),
      high_top_of_page_bid: +(options.cpc * 1.45).toFixed(2),
      categories: [10001],
      monthly_searches: options.monthly,
      search_volume_trend: trendFor(options.monthly),
    },
    keyword_properties: {
      se_type: 'google',
      core_keyword: options.keyword.split(' ').slice(0, 2).join(' '),
      keyword_difficulty: options.difficulty,
      detected_language: 'en',
      is_another_language: false,
    },
    search_intent_info: {
      se_type: 'google',
      main_intent: options.intent,
      foreign_intent: [],
    },
    avg_backlinks_info: {
      se_type: 'google',
      backlinks: 18 + options.difficulty,
      dofollow: 12 + options.difficulty,
      referring_domains: 5 + Math.round(options.difficulty / 3),
      rank: 120 + options.difficulty,
      main_domain_rank: 80 + options.difficulty,
    },
    clickstream_keyword_info: {
      search_volume: Math.round(options.volume * 1.1),
      gender_distribution: { female: 52, male: 48 },
      age_distribution: {
        '18-24': 16,
        '25-34': 31,
        '35-44': 28,
        '45-54': 15,
        '55-64': 10,
      },
    },
    keyword_info_normalized_with_clickstream: {
      search_volume: Math.round(options.volume * 1.08),
    },
    keyword_info_normalized_with_bing: {
      search_volume: Math.round(options.volume * 0.07),
    },
    serp_info: {
      se_type: 'google',
      check_url: 'https://search.example.invalid/synthetic',
      serp_item_types: ['organic', 'people_also_ask'],
      se_results_count: 125000,
      last_updated_time: SYNTHETIC_DATE,
    },
  };
}

function envelope(apiPath: string, result: unknown[]): Record<string, unknown> {
  return {
    version: 'synthetic-v1',
    status_code: 20000,
    status_message: 'Ok.',
    time: '0 sec.',
    cost: 0,
    tasks_count: 1,
    tasks_error: 0,
    tasks: [
      {
        id: 'synthetic-task-id',
        status_code: 20000,
        status_message: 'Ok.',
        time: '0 sec.',
        cost: 0,
        result_count: result.length,
        path: apiPath.split('/'),
        data: { synthetic: true },
        result,
      },
    ],
  };
}

function llmFixture(vendor: string): Record<string, unknown> {
  return envelope(`ai_optimization/${vendor}/llm_responses/live`, [
    {
      model_name: `synthetic-${vendor}-model`,
      input_tokens: 24,
      output_tokens: 96,
      reasoning_tokens: 12,
      web_search: true,
      money_spent: 0,
      datetime: SYNTHETIC_DATE,
      fan_out_queries: ['synthetic keyword research workflow'],
      items: [
        {
          sections: [
            {
              type: 'text',
              text:
                'This fully synthetic answer explains a demo keyword workflow. It exists only to exercise rendering, citations, exports, and response-shape handling without reproducing any provider response.',
              annotations: [
                {
                  title: 'Synthetic documentation',
                  url: 'https://docs.example.invalid/keyword-research',
                },
              ],
            },
            {
              type: 'text',
              text:
                'Use the example values to verify the interface, then connect your own account for live research.',
              annotations: [],
            },
          ],
        },
      ],
    },
  ]);
}

const overviewSeries = months({
  count: 92,
  volume: (index) => 900 + index * 17 + (index % 6) * 11,
});

const relatedRows = Array.from({ length: 16 }, (_, index) => {
  const core = months({
    count: 12,
    endMonth: 7,
    volume: (monthIndex) => 180 + index * 45 + monthIndex * 9,
  });
  const early = { month: 7, search_volume: 120 + index * 5, year: 2025 };
  const late = { month: 8, search_volume: 320 + index * 25, year: 2026 };
  const series = [
    ...(index < 5 ? [early] : []),
    ...core,
    ...(index < 8 ? [late] : []),
  ];
  const row = keywordRow({
    cpc: 1.25 + index * 0.18,
    difficulty: 8 + ((index * 7) % 82),
    intent:
      index % 3 === 0
        ? 'commercial'
        : index % 3 === 1
          ? 'informational'
          : 'navigational',
    keyword: `keyword pro demo ${String(index + 1).padStart(2, '0')}`,
    monthly: series,
    volume: 600 + index * 420,
  });
  return {
    depth: index % 4,
    related_keywords: [`synthetic cluster ${index + 1}`],
    keyword_data: row,
  };
});

const compactKeywordRows = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) =>
    keywordRow({
      cpc: 1.4 + index * 0.35,
      difficulty: 12 + index * 11,
      intent: index % 2 === 0 ? 'commercial' : 'informational',
      keyword: `${prefix} ${index + 1}`,
      monthly: months({
        count: 12,
        volume: (monthIndex) => 240 + index * 70 + monthIndex * 13,
      }),
      volume: 900 + index * 650,
    }),
  );

const fixtures: Record<string, Record<string, unknown>> = {
  'ai-optimization/fixtures/llm-responses-chat_gpt.json': llmFixture('chat_gpt'),
  'ai-optimization/fixtures/llm-responses-claude.json': llmFixture('claude'),
  'ai-optimization/fixtures/llm-responses-gemini.json': llmFixture('gemini'),
  'ai-optimization/fixtures/llm-responses-perplexity.json':
    llmFixture('perplexity'),
  'content-analysis/fixtures/search.json': envelope(
    'content_analysis/search/live',
    [
      {
        offset_token: 'synthetic-offset-token',
        total_count: 5,
        items_count: 5,
        items: Array.from({ length: 5 }, (_, index) => ({
          url: `https://result-${index + 1}.example.invalid/guide`,
          domain: `result-${index + 1}.example.invalid`,
          url_rank: index + 1,
          domain_rank: 80 - index * 4,
          page_types: ['html'],
          page_category: ['synthetic'],
          language: 'en',
          country: 'US',
          spam_score: 0,
          content_info: {
            title: `Synthetic keyword guide ${index + 1}`,
            snippet:
              'Synthetic search result used only for deterministic interface verification.',
            date_published: `2026-0${index + 1}-01`,
            author: 'Example Author',
            content_quality_score: 80 + index,
          },
        })),
      },
    ],
  ),
  'content-analysis/fixtures/summary.json': envelope(
    'content_analysis/sentiment_analysis/live',
    [
      {
        type: 'sentiment_analysis',
        total_count: 100,
        rank: 1,
        top_domains: [
          { domain: 'positive.example.invalid', count: 40 },
          { domain: 'neutral.example.invalid', count: 30 },
        ],
        sentiment_connotations: {
          happiness: 45,
          trust: 32,
          concern: 8,
        },
        connotation_types: { positive: 62, negative: 18, neutral: 20 },
        text_categories: [{ category: 'synthetic research', count: 100 }],
        page_categories: [{ category: 'guides', count: 70 }],
        page_types: [{ type: 'article', count: 100 }],
        countries: [{ country: 'US', count: 100 }],
        languages: [{ language: 'en', count: 100 }],
      },
    ],
  ),
  'keywords-data/fixtures/bing-search-volume.json': envelope(
    'keywords_data/bing/search_volume/live',
    [
      {
        keyword: 'keyword pro demo',
        location_code: 2840,
        language_code: 'en',
        search_partners: false,
        device: 'desktop',
        competition: 0.9,
        cpc: 2.45,
        search_volume: 140,
        categories: [10001],
        monthly_searches: months({
          count: 12,
          volume: (index) => 90 + index * 5,
        }),
      },
    ],
  ),
  'keywords-data/fixtures/clickstream-dfs-search-volume.json': envelope(
    'keywords_data/clickstream_data/dataforseo_search_volume/live',
    [
      {
        location_code: 2840,
        language_code: 'en',
        use_clickstream: true,
        items_count: 1,
        items: [
          {
            keyword: 'keyword pro demo',
            search_volume: 1750,
            monthly_searches: months({
              count: 12,
              volume: (index) => 1200 + index * 50,
            }),
          },
        ],
      },
    ],
  ),
  'keywords-data/fixtures/google-ads-search-volume.json': envelope(
    'keywords_data/google_ads/search_volume/live',
    [
      {
        keyword: 'keyword pro demo',
        location_code: 2840,
        language_code: 'en',
        search_partners: false,
        competition: 'MEDIUM',
        competition_index: 54,
        search_volume: 1900,
        low_top_of_page_bid: 1.8,
        high_top_of_page_bid: 4.7,
        cpc: 3.25,
        monthly_searches: months({
          count: 12,
          volume: (index) => 1400 + index * 45,
        }),
      },
      {
        keyword: 'synthetic keyword workflow',
        location_code: 2840,
        language_code: 'en',
        search_partners: false,
        competition: 'LOW',
        competition_index: 24,
        search_volume: 720,
        low_top_of_page_bid: 0.9,
        high_top_of_page_bid: 2.1,
        cpc: 1.35,
        monthly_searches: months({
          count: 12,
          volume: (index) => 500 + index * 20,
        }),
      },
    ],
  ),
  'keywords-data/fixtures/google-trends-explore.json': envelope(
    'keywords_data/google_trends/explore/live',
    [
      {
        keywords: ['keyword pro demo'],
        type: 'web',
        location_code: 2840,
        language_code: 'en',
        check_url: 'https://trends.example.invalid/synthetic',
        datetime: SYNTHETIC_DATE,
        items_count: 2,
        items: [
          {
            type: 'google_trends_graph',
            data: Array.from({ length: 12 }, (_, index) => ({
              date_from: `2025-${String(index + 1).padStart(2, '0')}-01`,
              date_to: `2025-${String(index + 1).padStart(2, '0')}-28`,
              values: [{ keyword: 'keyword pro demo', value: 35 + index * 4 }],
            })),
          },
          {
            type: 'google_trends_queries_list',
            data: {
              top: Array.from({ length: 5 }, (_, index) => ({
                query: `synthetic top query ${index + 1}`,
                value: 100 - index * 8,
              })),
              rising: Array.from({ length: 5 }, (_, index) => ({
                query: `synthetic rising query ${index + 1}`,
                value: 120 + index * 15,
              })),
            },
          },
        ],
      },
    ],
  ),
  'labs/fixtures/google-keyword-ideas.json': envelope(
    'dataforseo_labs/google/keyword_ideas/live',
    [
      {
        se_type: 'google',
        seed_keywords: ['keyword pro demo'],
        location_code: 2840,
        language_code: 'en',
        total_count: 5,
        items_count: 5,
        offset: 0,
        offset_token: 'synthetic-ideas-offset',
        items: compactKeywordRows('synthetic keyword idea', 5),
      },
    ],
  ),
  'labs/fixtures/google-keyword-overview.json': envelope(
    'dataforseo_labs/google/keyword_overview/live',
    [
      {
        se_type: 'google',
        location_code: 2840,
        language_code: 'en',
        items_count: 1,
        items: [
          keywordRow({
            cpc: 3.2,
            difficulty: 38,
            intent: 'commercial',
            keyword: 'keyword pro demo',
            monthly: overviewSeries,
            volume: overviewSeries.at(-1)?.search_volume ?? 0,
          }),
        ],
      },
    ],
  ),
  'labs/fixtures/google-keyword-suggestions.json': envelope(
    'dataforseo_labs/google/keyword_suggestions/live',
    [
      {
        se_type: 'google',
        seed_keyword: 'keyword pro demo',
        seed_keyword_data: compactKeywordRows('keyword pro demo', 1)[0],
        location_code: 2840,
        language_code: 'en',
        total_count: 5,
        items_count: 5,
        offset: 0,
        offset_token: 'synthetic-suggestions-offset',
        items: compactKeywordRows('keyword pro demo suggestion', 5),
      },
    ],
  ),
  'labs/fixtures/google-related-keywords.json': envelope(
    'dataforseo_labs/google/related_keywords/live',
    [
      {
        se_type: 'google',
        seed_keyword: 'keyword pro demo',
        seed_keyword_data: compactKeywordRows('keyword pro demo', 1)[0],
        location_code: 2840,
        language_code: 'en',
        total_count: relatedRows.length,
        items_count: relatedRows.length,
        items: relatedRows,
      },
    ],
  ),
  'labs/fixtures/google-serp-competitors.json': envelope(
    'dataforseo_labs/google/serp_competitors/live',
    [
      {
        se_type: 'google',
        seed_keywords: ['keyword pro demo'],
        location_code: 2840,
        language_code: 'en',
        total_count: 3,
        items_count: 3,
        items: Array.from({ length: 3 }, (_, index) => ({
          domain: `competitor-${index + 1}.example.invalid`,
          avg_position: 2.5 + index * 3.1,
          intersections: 8 - index,
          total_count: 12 + index * 4,
          full_domain_metrics: {
            organic: { etv: 1200 - index * 150, count: 80 - index * 10 },
          },
        })),
      },
    ],
  ),
  'serp/fixtures/google-organic.json': envelope(
    'serp/google/organic/live/advanced',
    [
      {
        keyword: 'keyword pro demo',
        type: 'organic',
        se_domain: 'search.example.invalid',
        location_code: 2840,
        language_code: 'en',
        check_url: 'https://search.example.invalid/synthetic-results',
        datetime: SYNTHETIC_DATE,
        item_types: ['organic', 'people_also_ask', 'related_searches'],
        se_results_count: 125000,
        pages_count: 1,
        items_count: 10,
        items: [
          ...Array.from({ length: 8 }, (_, index) => ({
            type: 'organic',
            rank_group: index + 1,
            rank_absolute: index + 1,
            title: `Synthetic search result ${index + 1}`,
            description:
              'A synthetic result used to verify SERP rendering without redistributing search content.',
            breadcrumb: `Example > Guide ${index + 1}`,
            url: `https://organic-${index + 1}.example.invalid/guide`,
            domain: `organic-${index + 1}.example.invalid`,
            is_image: false,
            is_featured_snippet: index === 0,
            rating: index === 1 ? { value: 4.5, votes_count: 24 } : null,
          })),
          {
            type: 'people_also_ask',
            rank_group: 9,
            rank_absolute: 9,
            title: 'Synthetic questions',
            items: [
              { title: 'How does the synthetic keyword demo work?' },
              { title: 'Can the demo make paid calls?' },
            ],
          },
          {
            type: 'related_searches',
            rank_group: 10,
            rank_absolute: 10,
            title: 'Synthetic related searches',
            items: [
              { title: 'synthetic keyword workflow' },
              { title: 'local keyword demo' },
            ],
          },
        ],
      },
    ],
  ),
};

function serialized(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function main(): void {
  const checkOnly = process.argv.includes('--check');
  const mismatches: string[] = [];

  for (const [relativePath, fixture] of Object.entries(fixtures).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const path = join(FIXTURE_ROOT, relativePath);
    const expected = serialized(fixture);
    if (checkOnly) {
      if (!existsSync(path) || readFileSync(path, 'utf8') !== expected) {
        mismatches.push(relativePath);
      }
      continue;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, expected, { encoding: 'utf8', mode: 0o644 });
  }

  if (mismatches.length > 0) {
    process.stderr.write(
      `Synthetic fixtures are stale or missing: ${mismatches.join(', ')}\n`,
    );
    process.exit(1);
  }
  process.stdout.write(
    `synthetic-fixtures: ${Object.keys(fixtures).length} files ${checkOnly ? 'verified' : 'generated'}\n`,
  );
}

main();
