/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CLICKSTREAM_CAPABLE_ENDPOINTS,
  CLICKSTREAM_COST_MULTIPLIER,
} from './endpoint-overrides';
import type { CostEstimate } from './types';

export const DEFAULT_RESEARCH_COST_CENTS = 5;

const DATAFORSEO_SERP_LIVE_CENTS = 0.2;
const DATAFORSEO_LABS_LIVE_CENTS = 1;
const DATAFORSEO_AI_OPTIMIZATION_CENTS = 10;

export const COST_TABLE: Record<string, CostEstimate> = {
  'ai.chat_gpt.llm_responses.live': {
    estimatedCents: DATAFORSEO_AI_OPTIMIZATION_CENTS,
    notes: 'DataForSEO AI Optimization request estimate; actual cost settles from provider response.',
  },
  'serp.google.organic.live': {
    estimatedCents: DATAFORSEO_SERP_LIVE_CENTS,
    notes: 'DataForSEO Google organic live base estimate.',
  },
};

/**
 * What these endpoints actually charged, in cents, on a real 298-keyword run.
 *
 * The generic estimates below are per-family guesses and were 68% too low for
 * the keyword bundle ($0.294 predicted against $0.495 charged). Two reasons:
 * DataForSEO Labs bills per result, so an expansion endpoint returning 100
 * rows costs three times what a one-row call costs, and the Keywords Data API
 * charges a flat $0.075-$0.09 per request regardless of size.
 *
 * These figures are measured, not derived, and already include the doubling
 * from `include_clickstream_data`, so the multiplier must not be applied on
 * top of them. They will drift as DataForSEO changes prices; they are a much
 * better starting point than the family guesses either way.
 */
const MEASURED_CENTS: Record<string, number> = {
  'labs.google.keyword_overview.live': 2.41,
  'labs.google.related_keywords.live': 3.6,
  'labs.google.keyword_suggestions.live': 3.6,
  'labs.google.keyword_ideas.live': 3.6,
  'labs.google.search_intent.live': 4.78,
  'labs.google.bulk_keyword_difficulty.live': 4.78,
  'labs.google.historical_keyword_data.live': 1.21,
  'labs.google.serp_competitors.live': 1.2,
  'labs.google.categories_for_keywords.live': 1.21,
  'labs.amazon.related_keywords.live': 1.2,
  'labs.amazon.bulk_search_volume.live': 1.21,
  'keyword.google_ads.search_volume.live': 9,
  'keyword.bing.search_volume.live': 9,
  'keyword.google_trends.explore.live': 1.1,
  'keyword.dataforseo_trends.explore.live': 0.12,
  'keyword.dataforseo_trends.demography.live': 0.24,
  'keyword.dataforseo_trends.subregion_interests.live': 0.24,
  'serp.google.organic.live': 0.8,
  'serp.google.autocomplete.live': 0.2,
  'content.summary.live': 2.4,
  'content.search.live': 2.47,
};

/** True when the figure already includes every surcharge. */
export function hasMeasuredCost(type: string): boolean {
  return type in MEASURED_CENTS;
}

/** True when a bundle-specific figure exists, measured or price-derived. */
export function hasCalibratedCost(type: string): boolean {
  return type in MEASURED_CENTS;
}

export function estimateEndpointCost(
  type: string,
  stubOrInput: boolean | Record<string, unknown> = false,
  context?: { endpoint?: { stub?: boolean } },
): CostEstimate {
  const stub = typeof stubOrInput === 'boolean'
    ? stubOrInput
    : Boolean(context?.endpoint?.stub);

  if (stub) {
    return { estimatedCents: 0, notes: 'Stub endpoint; no provider call.' };
  }

  const exact = COST_TABLE[type];
  if (exact) {
    return exact;
  }

  if (type.startsWith('serp.') && type.includes('.live')) {
    return {
      estimatedCents: DATAFORSEO_SERP_LIVE_CENTS,
      notes: 'Generic DataForSEO SERP live estimate; actual cost settles from provider response.',
    };
  }

  if (type.startsWith('labs.') && type.endsWith('.live')) {
    return {
      estimatedCents: DATAFORSEO_LABS_LIVE_CENTS,
      notes: 'Generic DataForSEO Labs live estimate; actual cost settles from provider response.',
    };
  }

  if (type.startsWith('keyword.google_trends.') || type.startsWith('keyword.dataforseo_trends.')) {
    return {
      estimatedCents: DATAFORSEO_LABS_LIVE_CENTS,
      notes: 'DataForSEO trends endpoint estimate; actual cost settles from provider response.',
    };
  }

  if (type.startsWith('ai.')) {
    return {
      estimatedCents: DATAFORSEO_AI_OPTIMIZATION_CENTS,
      notes: 'Generic DataForSEO AI Optimization estimate; actual cost settles from provider response.',
    };
  }

  return (
    {
      estimatedCents: DEFAULT_RESEARCH_COST_CENTS,
      notes: 'Conservative default pending endpoint-specific calibration.',
    }
  );
}

/**
 * What a multi-endpoint run will cost, so the Run button can say so before it
 * spends anything. Estimates only; the provider settles the real figure.
 */
export function estimateBatchCents(
  types: string[],
  lookup?: (type: string) => { stub?: boolean } | null,
): number {
  return types.reduce((total, type) => {
    const endpoint = lookup?.(type) ?? undefined;
    if (endpoint?.stub) return total;

    // A measured figure is what the provider actually billed, surcharges
    // included, so nothing further is applied to it.
    const measured = MEASURED_CENTS[type];
    if (measured !== undefined) return total + measured;

    const base = estimateEndpointCost(type, false).estimatedCents;
    // Clickstream is always requested on the Labs keyword endpoints, and
    // DataForSEO charges double for it, so the estimate always says so.
    const multiplier = CLICKSTREAM_CAPABLE_ENDPOINTS.has(type)
      ? CLICKSTREAM_COST_MULTIPLIER
      : 1;
    return total + base * multiplier;
  }, 0);
}

/** "~$0.04" / "<$0.01", for a button label. */
export function formatCents(cents: number): string {
  if (cents <= 0) return 'free';
  if (cents < 1) return '<$0.01';
  return `~$${(cents / 100).toFixed(2)}`;
}
