/*
 * SPDX-License-Identifier: Apache-2.0
 */

import type { EndpointDef, EndpointInput, ResultEnvelope } from './types';

/**
 * Corrections to the generated endpoint table.
 *
 * `endpoints.ts` is machine-generated from the upstream catalog, so it is not
 * edited by hand: a regeneration would silently revert any fix made there.
 * Everything in this file is applied by the dispatcher on top of the generated
 * definition instead.
 *
 * IMPORTANT: if `endpoints.ts` is ever regenerated, re-check every override
 * below. Each one exists because the generated version reads a field the
 * provider does not send, or sends a flag that suppresses data we want. Both
 * classes of bug become invisible once fixed, so the public verification suite
 * replays deterministic provider-compatible fixtures against them.
 */

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

/**
 * The definition the dispatcher should actually run.
 *
 * DataForSEO definitions get the request, projector, and validation
 * corrections defined in this file.
 */
export function applyEndpointOverrides(endpoint: EndpointDef): EndpointDef {
  return applyDefinitionOverrides(endpoint);
}

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

/**
 * Labs keyword endpoints that accept `include_serp_info` and
 * `include_clickstream_data`.
 *
 * `bulk_keyword_difficulty` and `search_intent` are deliberately absent: the
 * API rejects both flags there.
 */
export const CLICKSTREAM_CAPABLE_ENDPOINTS = new Set([
  'labs.google.keyword_ideas.live',
  'labs.google.keyword_overview.live',
  'labs.google.keyword_suggestions.live',
  'labs.google.related_keywords.live',
]);

/**
 * `include_clickstream_data: true` doubles what DataForSEO charges. It is
 * always on, so this multiplier applies to every estimate for these endpoints.
 */
export const CLICKSTREAM_COST_MULTIPLIER = 2;

export function endpointSupportsClickstream(type: string): boolean {
  return CLICKSTREAM_CAPABLE_ENDPOINTS.has(type);
}

/**
 * Turn on the enrichment the generated bodies switch off.
 *
 * The generated bodies hardcode `include_serp_info: false` and
 * `include_clickstream_data: false`, so `serp_info`, `clickstream_keyword_info`
 * and `keyword_info_normalized_with_clickstream` come back null on every call.
 * `include_serp_info` is free. Clickstream doubles the price and is forced on
 * regardless, for the reason given at the assignment below.
 */
export function patchRequestBody(
  endpoint: EndpointDef,
  body: unknown,
  input: EndpointInput,
): unknown {
  if (!CLICKSTREAM_CAPABLE_ENDPOINTS.has(endpoint.type)) {
    return applyBodyOverride(endpoint, body, input);
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return body;
  }

  const patched: Record<string, unknown> = {
    ...(body as Record<string, unknown>),
    include_serp_info: true,
    // Always on for keyword work. It is the difference between Google's
    // 550,000 for "claude code" and the panel's 1.9 million, plus the age and
    // gender split, and no keyword result is worth having without it. The
    // doubled price is folded into every estimate rather than offered as a
    // switch nobody would sensibly turn off.
    include_clickstream_data: true,
  };

  // `limit` is hardcoded to 100 in the generated bodies. Honour an explicit
  // value when the UI supplies one; DataForSEO caps it at 1000.
  const limit = readNumber(input.limit);
  if (limit !== null && 'limit' in patched) {
    patched.limit = Math.min(Math.max(Math.trunc(limit), 1), 1000);
  }

  return patched;
}

// ---------------------------------------------------------------------------
// Projectors
// ---------------------------------------------------------------------------

type Projector = (
  unwrapped: unknown,
  type: string,
  input: EndpointInput,
) => ResultEnvelope;

/**
 * Replacement projectors, keyed by endpoint type.
 *
 * Every entry here replaces a generated projector that read the wrong response
 * fields during private development. The public suite validates the corrected
 * contract with repository-generated synthetic fixtures. Provider drift still
 * requires separate live acceptance.
 */
const PROJECTOR_OVERRIDES: Record<string, Projector> = {};

function registerProjector(types: string[], project: Projector): void {
  for (const type of types) PROJECTOR_OVERRIDES[type] = project;
}

export function getProjectorOverride(type: string): Projector | undefined {
  return PROJECTOR_OVERRIDES[type];
}

/**
 * LLM responses (ChatGPT, Claude, Gemini, Perplexity).
 *
 * The generated projector reads `items[0].response_text` and
 * `items[0].annotations`. Neither exists. The real shape is
 * `result[0].items[].sections[]`, each section carrying `{type, text,
 * annotations}`, with `model_name` and the token counts on the result itself.
 * As written it returned an empty string and no citations on every single
 * call: the entire answer and every source were lost.
 */
registerProjector(
  [
    'ai.chat_gpt.llm_responses.live',
    'ai.claude.llm_responses.live',
    'ai.gemini.llm_responses.live',
    'ai.perplexity.llm_responses.live',
  ],
  (unwrapped, type) => {
    const r = asRecord(unwrapped);
    const items = asArray(r.items);

    const texts: string[] = [];
    const citations: Array<{ title: unknown; url: unknown; domain: string | null }> = [];
    const seenCitation = new Set<string>();

    for (const rawItem of items) {
      const item = asRecord(rawItem);
      for (const rawSection of asArray(item.sections)) {
        const section = asRecord(rawSection);
        const text = typeof section.text === 'string' ? section.text : '';
        if (text) texts.push(text);

        for (const rawAnnotation of asArray(section.annotations)) {
          const annotation = asRecord(rawAnnotation);
          const url = typeof annotation.url === 'string' ? annotation.url : '';
          // Perplexity repeats the same source across sections.
          if (url && seenCitation.has(url)) continue;
          if (url) seenCitation.add(url);
          citations.push({
            title: annotation.title ?? null,
            url: annotation.url ?? null,
            // The provider sends no `domain`; derive it so the UI can group.
            domain: hostnameOf(url),
          });
        }
      }
    }

    const responseText = texts.join('\n\n');

    return {
      success: true,
      type,
      count: 1,
      results: {
        response_text: responseText,
        citations,
        model: r.model_name ?? null,
        input_tokens: r.input_tokens ?? null,
        output_tokens: r.output_tokens ?? null,
        reasoning_tokens: r.reasoning_tokens ?? null,
        web_search: r.web_search ?? null,
        money_spent: r.money_spent ?? null,
        datetime: r.datetime ?? null,
        fan_out_queries: r.fan_out_queries ?? null,
        sections: items.flatMap((item) => asArray(asRecord(item).sections)),
      },
    };
  },
);

/**
 * Content search.
 *
 * The generated projector reads `x.meta.title`, `x.snippet` and `x.rank`. The
 * real keys are `content_info.title`, `content_info.snippet` and `url_rank`,
 * so three of the six columns were permanently blank.
 */
registerProjector(['content.search.live'], (unwrapped, type) => {
  const r = asRecord(unwrapped);
  const items = asArray(r.items);

  return {
    success: true,
    type,
    count: items.length,
    results: items.map((rawItem) => {
      const x = asRecord(rawItem);
      const content = asRecord(x.content_info);
      return {
        url: x.url ?? null,
        domain: x.domain ?? null,
        title: content.title ?? content.main_title ?? null,
        snippet: content.snippet ?? null,
        rank: x.url_rank ?? null,
        domain_rank: x.domain_rank ?? null,
        page_types: x.page_types ?? null,
        page_category: x.page_category ?? null,
        date_published: content.date_published ?? null,
        author: content.author ?? null,
        language: x.language ?? content.language ?? null,
        country: x.country ?? null,
        spam_score: x.spam_score ?? null,
        content_quality_score: content.content_quality_score ?? null,
        social_metrics: x.social_metrics ?? content.social_metrics ?? null,
      };
    }),
    meta: {
      total_count: r.total_count ?? null,
      offset_token: r.offset_token ?? null,
    },
  };
});

/**
 * Clickstream search volume.
 *
 * `resultIsArray` is true, so the projector receives the wrapper array
 * `[{location_code, language_code, items: [...]}]` and then maps the wrappers
 * rather than their `items`. Every row came out
 * `{keyword: undefined, search_volume: undefined, monthly_searches: []}`.
 */
registerProjector(
  ['keyword.clickstream.dataforseo_search_volume.live'],
  (unwrapped, type) => {
    const wrappers = Array.isArray(unwrapped) ? unwrapped : [unwrapped];
    const rows = wrappers.flatMap((wrapper) => {
      const w = asRecord(wrapper);
      // Tolerate both the wrapped and already-flat shapes.
      const items = asArray(w.items);
      const source = items.length > 0 ? items : [w];
      return source.map((rawItem) => {
        const x = asRecord(rawItem);
        return {
          keyword: x.keyword ?? null,
          search_volume: numberOrNull(x.search_volume),
          monthly_searches: asArray(x.monthly_searches),
        };
      });
    });

    return { success: true, type, count: rows.length, results: rows };
  },
);

/**
 * Google Ads and Bing keyword volume.
 *
 * `competition_level` was bucketed from `competition_index`, which Bing does
 * not return, so every Bing row read `LOW` regardless of the real figure. The
 * two providers also disagree on `competition` itself: Google Ads sends the
 * string `'LOW' | 'MEDIUM' | 'HIGH'` alongside a 0-100 `competition_index`,
 * while Bing sends a 0-1 float and no index at all. Normalise both into a
 * numeric `competition_index` plus a bucket that means the same thing either
 * way, and keep the provider's own value in `competition_raw`.
 */
registerProjector(
  [
    'keyword.bing.keywords_for_keywords.live',
    'keyword.bing.search_volume.live',
    'keyword.google_ads.keywords_for_keywords.live',
    'keyword.google_ads.search_volume.live',
  ],
  (unwrapped, type) => {
    const rows = Array.isArray(unwrapped)
      ? unwrapped
      : asArray(asRecord(unwrapped).items);

    return {
      success: true,
      type,
      count: rows.length,
      results: rows.map((rawItem) => {
        const x = asRecord(rawItem);
        const index = competitionIndex(x);
        return {
          keyword: x.keyword ?? null,
          search_volume: numberOrNull(x.search_volume),
          cpc: roundOrNull(x.cpc),
          competition_index: index,
          competition_level: bucketCompetition(index),
          competition_raw: x.competition ?? null,
          low_top_of_page_bid: roundOrNull(x.low_top_of_page_bid),
          high_top_of_page_bid: roundOrNull(x.high_top_of_page_bid),
          categories: x.categories ?? null,
          monthly_searches: asArray(x.monthly_searches),
        };
      }),
    };
  },
);

/**
 * Labs keyword endpoints: the main keyword table.
 *
 * The generated projector kept 11 fields and dropped everything else,
 * including `monthly_searches` (up to 92 points), the raw `competition`
 * float, `avg_backlinks_info`, `serp_info`, `categories`, and, for
 * `related_keywords`, both `depth` and the `related_keywords[]` cluster that
 * is the whole point of the endpoint. It also collapsed missing trends, cpc
 * and bids to `0`, making "no data" indistinguishable from a real zero.
 */
registerProjector(
  [
    'labs.google.keyword_ideas.live',
    'labs.google.keyword_overview.live',
    'labs.google.keyword_suggestions.live',
    'labs.google.related_keywords.live',
  ],
  (unwrapped, type) => {
    const r = asRecord(unwrapped);
    const items = asArray(r.items);

    return {
      success: true,
      type,
      count: items.length,
      results: items.map((rawItem) => projectKeywordRow(rawItem)),
      meta: {
        seed_keyword: r.seed_keyword ?? null,
        total_count: numberOrNull(r.total_count),
        items_count: numberOrNull(r.items_count),
        offset: numberOrNull(r.offset),
        // Without this, paging past the first 100 rows is impossible.
        offset_token: r.offset_token ?? null,
        location_code: r.location_code ?? null,
        language_code: r.language_code ?? null,
        seed_keyword_data: r.seed_keyword_data
          ? projectKeywordRow(r.seed_keyword_data)
          : null,
      },
    };
  },
);

/**
 * One keyword row, shaped for the table but carrying the untouched source
 * object on `_full` so nothing in the response is unreachable from the UI.
 *
 * `related_keywords` nests the metrics under `keyword_data`; the other three
 * endpoints put them on the item directly.
 */
function projectKeywordRow(rawItem: unknown): Record<string, unknown> {
  const item = asRecord(rawItem);
  const kd = item.keyword_data ? asRecord(item.keyword_data) : item;

  const info = asRecord(kd.keyword_info);
  const props = asRecord(kd.keyword_properties);
  const intent = asRecord(kd.search_intent_info);
  const trend = asRecord(info.search_volume_trend);
  const backlinks = asRecord(kd.avg_backlinks_info);
  const clickstream = asRecord(kd.clickstream_keyword_info);
  const normalizedClickstream = asRecord(
    kd.keyword_info_normalized_with_clickstream,
  );
  const normalizedBing = asRecord(kd.keyword_info_normalized_with_bing);
  const serp = asRecord(kd.serp_info);

  return {
    keyword: kd.keyword ?? null,
    search_volume: numberOrNull(info.search_volume),
    main_intent: intent.main_intent ?? null,
    foreign_intent: intent.foreign_intent ?? null,
    difficulty: numberOrNull(props.keyword_difficulty),
    competition_level: info.competition_level ?? null,
    competition: numberOrNull(info.competition),
    cpc: roundOrNull(info.cpc),
    low_top_of_page_bid: roundOrNull(info.low_top_of_page_bid),
    high_top_of_page_bid: roundOrNull(info.high_top_of_page_bid),

    // Signed percentages, unbounded in both directions. Preserved as null when
    // absent so a genuine flat 0 stays distinguishable.
    monthly_trend: numberOrNull(trend.monthly),
    quarterly_trend: numberOrNull(trend.quarterly),
    yearly_trend: numberOrNull(trend.yearly),

    // The series the three percentages above were computed from.
    monthly_searches: asArray(info.monthly_searches),

    categories: info.categories ?? null,
    core_keyword: props.core_keyword ?? null,
    detected_language: props.detected_language ?? null,
    is_another_language: props.is_another_language ?? null,
    last_updated_time: info.last_updated_time ?? null,

    // Link difficulty, dropped entirely by the generated projector.
    backlinks: numberOrNull(backlinks.backlinks),
    referring_domains: numberOrNull(backlinks.referring_domains),
    dofollow: numberOrNull(backlinks.dofollow),
    rank: numberOrNull(backlinks.rank),
    main_domain_rank: numberOrNull(backlinks.main_domain_rank),

    // Present only when include_clickstream_data is on.
    clickstream_search_volume: numberOrNull(clickstream.search_volume),
    clickstream_gender_distribution: clickstream.gender_distribution ?? null,
    clickstream_age_distribution: clickstream.age_distribution ?? null,
    normalized_with_clickstream_volume: numberOrNull(
      normalizedClickstream.search_volume,
    ),
    normalized_with_bing_volume: numberOrNull(normalizedBing.search_volume),

    // Present only when include_serp_info is on.
    serp_item_types: serp.serp_item_types ?? null,
    serp_results_count: numberOrNull(serp.se_results_count),
    serp_last_updated_time: serp.last_updated_time ?? null,

    // related_keywords only.
    depth: numberOrNull(item.depth),
    related_keywords: item.related_keywords ?? null,

    // Nothing is lost: the complete source row travels with the shaped one.
    _full: rawItem,
  };
}

/**
 * Google organic SERP.
 *
 * The generated projector maps every item through one organic-shaped
 * template, so a `related_searches` or `people_also_ask` block arrived
 * carrying nothing but its `type` and `position`: the questions people
 * actually ask and the searches Google suggests alongside were dropped on the
 * floor, while the raw payload had them under `items`.
 */
registerProjector(
  [
    'serp.google.organic.live',
    'serp.google.organic.live.regular',
  ],
  (unwrapped, type) => {
    const r = asRecord(unwrapped);
    const items = asArray(r.items);

    return {
      success: true,
      type,
      count: items.length,
      results: items.map((rawItem) => {
        const x = asRecord(rawItem);
        const kind = typeof x.type === 'string' ? x.type : 'unknown';
        const base = {
          position: numberOrNull(x.rank_absolute),
          type: kind,
          rank_group: numberOrNull(x.rank_group),
        };

        if (kind === 'organic') {
          return {
            ...base,
            title: x.title ?? null,
            url: x.url ?? null,
            domain: x.domain ?? null,
            snippet: x.description ?? null,
            breadcrumb: x.breadcrumb ?? null,
            rating: x.rating ?? null,
            is_image: x.is_image ?? false,
            is_featured_snippet: x.is_featured_snippet ?? false,
          };
        }

        // Feature blocks: keep the payload rather than an empty husk.
        return {
          ...base,
          title: x.title ?? null,
          items: x.items ?? null,
          text: x.text ?? null,
          asynchronous_ai_overview: x.asynchronous_ai_overview ?? null,
        };
      }),
      meta: {
        se_results_count: numberOrNull(r.se_results_count),
        items_count: numberOrNull(r.items_count),
        check_url: r.check_url ?? null,
      },
    };
  },
);

/**
 * Content sentiment analysis.
 *
 * `overall_score` was computed as `positive - negative` over
 * `sentiment_connotations`, which holds anger, happiness, love, sadness, share
 * and fun. Neither key exists there, so the score was always exactly 0.
 * `connotation_types` is the object that actually carries the three.
 */
registerProjector(['content.sentiment_analysis.live'], (unwrapped, type) => {
  const r = asRecord(unwrapped);
  const types = asRecord(r.connotation_types);
  const positive = numberOrNull(types.positive) ?? 0;
  const negative = numberOrNull(types.negative) ?? 0;
  const neutral = numberOrNull(types.neutral);
  const total = positive + negative + (neutral ?? 0);

  return {
    success: true,
    type,
    count: 1,
    results: {
      // Share of non-neutral sentiment that is positive, -1 to 1.
      overall_score:
        positive + negative > 0
          ? +((positive - negative) / (positive + negative)).toFixed(4)
          : null,
      positive,
      negative,
      neutral,
      total_mentions: total || null,
      connotation_types: r.connotation_types ?? null,
      sentiment_connotations: r.sentiment_connotations ?? null,
      rank: r.rank ?? null,
      top_domains: r.top_domains ?? null,
      _full: unwrapped,
    },
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function roundOrNull(value: unknown): number | null {
  const n = numberOrNull(value);
  return n === null ? null : +n.toFixed(2);
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Normalise the two providers' competition signals onto one 0-100 scale.
 * Google Ads sends `competition_index` directly; Bing sends only a 0-1
 * `competition` float.
 */
function competitionIndex(x: Record<string, unknown>): number | null {
  const index = numberOrNull(x.competition_index);
  if (index !== null) return index;

  const raw = numberOrNull(x.competition);
  if (raw === null) return null;
  return raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
}

function bucketCompetition(index: number | null): string | null {
  if (index === null) return null;
  if (index >= 67) return 'HIGH';
  if (index >= 34) return 'MEDIUM';
  return 'LOW';
}

function hostnameOf(url: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Definition overrides
// ---------------------------------------------------------------------------

export type DefinitionPatch = Partial<
  Pick<EndpointDef, 'stub' | 'stubReason' | 'required' | 'optional'>
>;

/** Keyword-only definition corrections, keyed by allowlisted endpoint type. */
export const DEFINITION_OVERRIDES: Record<string, DefinitionPatch> = {};

export function applyDefinitionOverrides<T extends { type: string }>(
  definition: T,
): T {
  const patch = DEFINITION_OVERRIDES[definition.type];
  return patch ? { ...definition, ...patch } : definition;
}

// ---------------------------------------------------------------------------
// Request-body overrides
// ---------------------------------------------------------------------------

type BodyPatch = (
  body: Record<string, unknown>,
  input: EndpointInput,
) => Record<string, unknown>;

function limitOf(input: EndpointInput, fallback: number): number {
  const explicit = readNumber(input.limit);
  return explicit === null
    ? fallback
    : Math.min(Math.max(Math.trunc(explicit), 1), 1000);
}

const BODY_OVERRIDES: Record<string, BodyPatch> = {
  // Ordered by the mentioning domain's rank. The source index can contain
  // impossible publish dates, so newest-first ordering is not reliable.
  'content.search.live': (body, input) => ({
    ...body,
    limit: limitOf(input, 20),
    order_by: ['domain_rank,desc'],
  }),
};

/** Apply a reviewed body correction when one is registered. */
export function applyBodyOverride(
  endpoint: EndpointDef,
  body: unknown,
  input: EndpointInput,
): unknown {
  const patch = BODY_OVERRIDES[endpoint.type];
  if (!patch) return body;
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return body;
  }
  return patch(body as Record<string, unknown>, input);
}

/** Keyword endpoint request budgets that exceed the client's default. */
export const TIMEOUT_OVERRIDES_MS: Record<string, number> = {};

export function endpointTimeoutMs(type: string): number | undefined {
  return TIMEOUT_OVERRIDES_MS[type];
}
