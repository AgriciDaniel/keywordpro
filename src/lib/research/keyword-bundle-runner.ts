/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  bundleEntriesForTargeting,
  type BundleEntry,
} from './keyword-bundle';
import { type BundleRunResult, mergeKeywordRuns, type MergedKeywordResult } from './keyword-merge';

/**
 * Runs the keyword bundle and streams the merged result as it fills in.
 *
 * Two waves, for a reason worth stating. `search_intent` and
 * `bulk_keyword_difficulty` accept up to a thousand keywords per call, but if
 * they run on the seed alone they only ever describe the one word the user
 * typed, which the expansion endpoints already described. Measured against the
 * fixtures, `bulk_keyword_difficulty` on the seed contributed exactly zero new
 * fields.
 *
 * So the expansion runs first, every keyword it surfaced is collected, and the
 * two bulk endpoints are then handed that whole list. The same two cents now
 * fill in intent and difficulty across hundreds of rows instead of one.
 */

/** DataForSEO caps both bulk endpoints at 1000 keywords per request. */
const BULK_KEYWORD_LIMIT = 1000;

const EXPANSION_TYPES = new Set([
  'labs.google.keyword_overview.live',
  'labs.google.related_keywords.live',
  'labs.google.keyword_suggestions.live',
  'labs.google.keyword_ideas.live',
]);

/**
 * Fed the collected keyword list rather than the seed.
 *
 * The two Labs endpoints are priced per result, so handing them the expanded
 * list costs proportionally more and buys intent and difficulty for every row.
 *
 * The two Keywords Data endpoints are billed per request rather than per
 * result. Sending them the seed alone would therefore pay the request price to
 * enrich exactly one row.
 */
const BULK_TYPES = new Set([
  'labs.google.search_intent.live',
  'labs.google.bulk_keyword_difficulty.live',
  'keyword.google_ads.search_volume.live',
  'keyword.bing.search_volume.live',
]);

export type BundleProgress = {
  /** Calls finished, successful or not. */
  done: number;
  total: number;
  /** The call currently in flight. */
  current: BundleEntry | null;
  /** Everything merged so far, safe to render. */
  merged: MergedKeywordResult;
};

export type BundleRunOptions = {
  seed: string;
  /** Targeting and any other params the endpoints share. */
  params: Record<string, unknown>;
  /** Performs one call. Supplied by the caller so this stays testable. */
  call: (type: string, params: Record<string, unknown>) => Promise<{
    response: unknown;
    error: string | null;
  }>;
  /** Called after every finished endpoint with the merge so far. */
  onProgress: (progress: BundleProgress) => void;
  /** Abort between calls. */
  shouldStop?: () => boolean;
};

export async function runKeywordBundle(
  options: BundleRunOptions,
): Promise<MergedKeywordResult> {
  const { call, onProgress, params, seed, shouldStop } = options;

  const country = typeof params.country === 'string' ? params.country : null;
  const language = typeof params.language === 'string' ? params.language : null;
  const entries = bundleEntriesForTargeting(country, language);
  if (entries.length === 0) {
    throw new Error(
      'The selected country and language are not a supported research pair.',
    );
  }

  const runs: BundleRunResult[] = [];
  const total = entries.length;

  // Ordered so the expansion lands first: the table appears within a couple of
  // seconds and everything after it only adds columns and panels.
  const ordered = [
    ...entries.filter((entry) => EXPANSION_TYPES.has(entry.type)),
    ...entries.filter(
      (entry) => !EXPANSION_TYPES.has(entry.type) && !BULK_TYPES.has(entry.type),
    ),
    // Second wave: everything that wants the whole keyword list.
    ...entries.filter((entry) => BULK_TYPES.has(entry.type)),
  ];

  const emit = (current: BundleEntry | null) => {
    onProgress({
      done: runs.length,
      total,
      current,
      merged: mergeKeywordRuns(runs, seed),
    });
  };

  for (const entry of ordered) {
    if (shouldStop?.()) break;
    emit(entry);

    // Sequential on purpose: the providers rate-limit per account, and
    // up to nineteen calls fired at once is the fastest way to get throttled.
    const callParams = BULK_TYPES.has(entry.type)
      ? { ...params, keywords: collectKeywords(runs, seed) }
      : params;

    try {
      const { response, error } = await call(entry.type, callParams);
      runs.push({ type: entry.type, response, error });
    } catch (caught) {
      // One endpoint failing must not lose the other eighteen.
      runs.push({
        type: entry.type,
        response: null,
        error: caught instanceof Error ? caught.message : String(caught),
      });
    }

    emit(null);
  }

  return mergeKeywordRuns(runs, seed);
}

/**
 * Every keyword the expansion surfaced, seed first, capped at the provider's
 * per-request limit.
 */
function collectKeywords(runs: BundleRunResult[], seed: string): string[] {
  const merged = mergeKeywordRuns(runs, seed);
  const keywords: string[] = [];
  const seen = new Set<string>();

  const add = (value: unknown) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) return;
    seen.add(key);
    keywords.push(trimmed);
  };

  add(seed);
  for (const row of merged.results) add(row.keyword);

  return keywords.slice(0, BULK_KEYWORD_LIMIT);
}

/** What the run will cost, for the button label, before it spends anything. */
export function bundleCallCount(
  country?: string | null,
  language?: string | null,
): number {
  return bundleEntriesForTargeting(country, language).length;
}
