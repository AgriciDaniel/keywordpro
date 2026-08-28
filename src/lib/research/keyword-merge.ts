/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { bundleEntry, type BundleGroup } from './keyword-bundle';

/**
 * Fold up to nineteen endpoint responses into the one result the dashboard renders.
 *
 * The endpoints overlap deliberately but unevenly: four Labs calls all return
 * keyword rows with the same 34 fields, `search_intent` returns intent for
 * keywords the others left unlabelled, and Bing returns a volume for the same
 * word that is not the same number as Google's. Merging is therefore not a
 * concatenation. Two rules do the work:
 *
 *   1. Never overwrite a value that is already there. The endpoints run
 *      richest-first, so a later, thinner source can only fill gaps.
 *   2. Never let one engine's figure masquerade as another's. Bing and Amazon
 *      volumes land on their own keys rather than on `search_volume`, because
 *      "seo tools" is 550,000 on Google and 600 on Bing and averaging those
 *      would be nonsense.
 *
 * Everything that is not a keyword row keeps its own shape under `panels`, and
 * every untouched provider envelope is preserved, so nothing is lost.
 */

export type Row = Record<string, unknown>;

export type SourceReport = {
  type: string;
  label: string;
  group: BundleGroup | 'other';
  ok: boolean;
  error: string | null;
  /** Rows contributed after merging, not rows returned. */
  contributed: number;
  /** Records returned before deduplication. Optional for older saved reports. */
  returned?: number;
  cost: number | null;
};

export type MergedKeywordResult = {
  success: true;
  type: string;
  count: number;
  results: Row[];
  meta: {
    seed: string | null;
    bundle: true;
    panels: Record<string, unknown>;
    sources: SourceReport[];
    totalCost: number;
    /** True when the provider records were stripped before saving. */
    trimmed?: boolean;
  };
};

/** One finished call from the runner. */
export type BundleRunResult = {
  type: string;
  response: unknown;
  error: string | null;
};

/** Endpoints whose rows are keyed by keyword and belong in the main table. */
const ROW_SOURCES = new Set([
  'labs.google.keyword_overview.live',
  'labs.google.related_keywords.live',
  'labs.google.keyword_suggestions.live',
  'labs.google.keyword_ideas.live',
  'labs.google.search_intent.live',
  'labs.google.bulk_keyword_difficulty.live',
]);

/**
 * Engine-specific volumes. Namespaced rather than merged, so a Bing figure can
 * sit beside a Google one without either pretending to be the other.
 */
const NAMESPACED_SOURCES: Record<string, string> = {
  'keyword.google_ads.search_volume.live': 'google_ads',
  'keyword.bing.search_volume.live': 'bing',
  'labs.amazon.bulk_search_volume.live': 'amazon',
};

/** Non-row endpoints and the panel key their result is filed under. */
const PANEL_KEYS: Record<string, string> = {
  'keyword.google_trends.explore.live': 'googleTrends',
  'keyword.dataforseo_trends.explore.live': 'dataforseoTrends',
  'keyword.dataforseo_trends.demography.live': 'demography',
  'keyword.dataforseo_trends.subregion_interests.live': 'subregions',
  'labs.google.historical_keyword_data.live': 'historical',
  'labs.amazon.related_keywords.live': 'amazonKeywords',
  'serp.google.organic.live': 'serp',
  'serp.google.autocomplete.live': 'autocomplete',
  'labs.google.serp_competitors.live': 'competitors',
  'labs.google.categories_for_keywords.live': 'categories',
};

export function mergeKeywordRuns(
  runs: BundleRunResult[],
  seed: string | null,
): MergedKeywordResult {
  // Insertion-ordered, so the seed keyword stays first and the expansion
  // endpoints append in the order they were called.
  const merged = new Map<string, Row>();
  const panels: Record<string, unknown> = {};
  const sources: SourceReport[] = [];
  let totalCost = 0;

  for (const run of runs) {
    const entry = bundleEntry(run.type);
    const envelope = asRecord(run.response);
    const data = asRecord(envelope?.data);
    const cost = typeof envelope?.cost === 'number' ? envelope.cost : null;
    if (cost !== null) totalCost += cost;

    const report: SourceReport = {
      type: run.type,
      label: entry?.label ?? run.type,
      group: entry?.group ?? 'other',
      ok: !run.error,
      error: run.error,
      contributed: 0,
      returned: 0,
      cost,
    };

    if (run.error || !data) {
      sources.push(report);
      continue;
    }

    const returnedResults = data.results;
    report.returned = Array.isArray(returnedResults)
      ? returnedResults.length
      : returnedResults == null
        ? 0
        : 1;

    if (ROW_SOURCES.has(run.type)) {
      report.contributed = absorbRows(merged, data.results, run.type);
    } else if (NAMESPACED_SOURCES[run.type]) {
      report.contributed = absorbNamespaced(
        merged,
        data.results,
        NAMESPACED_SOURCES[run.type],
        run.type,
      );
    } else {
      const key = PANEL_KEYS[run.type] ?? run.type;
      panels[key] = data.results ?? null;
      report.contributed = Array.isArray(data.results) ? data.results.length : 1;
    }

    // The seed keyword's own metadata, kept for the header.
    if (run.type === 'labs.google.keyword_overview.live' && isRecord(data.meta)) {
      panels.overviewMeta = data.meta;
    }

    sources.push(report);
  }

  return {
    success: true,
    type: 'keyword.bundle',
    count: merged.size,
    results: [...merged.values()],
    meta: { seed, bundle: true, panels, sources, totalCost },
  };
}

/**
 * Fold keyword rows in, filling gaps only.
 *
 * Returns how many rows this source added or filled in, which is the honest
 * measure of what a call was worth: a second expansion endpoint returning 500
 * keywords the first already covered, with nothing new on any of them,
 * contributes zero.
 */
function absorbRows(
  merged: Map<string, Row>,
  results: unknown,
  sourceType: string,
): number {
  if (!Array.isArray(results)) return 0;
  let added = 0;

  for (const raw of results) {
    if (!isRecord(raw)) continue;
    const key = keywordKey(raw.keyword);
    if (!key) continue;

    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...raw, _sources: [sourceType] });
      added += 1;
      continue;
    }

    let filled = false;
    for (const [field, value] of Object.entries(raw)) {
      if (field === '_sources') continue;
      if (isBlank(existing[field]) && !isBlank(value)) {
        existing[field] = value;
        filled = true;
      }
    }
    const seen = Array.isArray(existing._sources) ? existing._sources : [];
    existing._sources = [...seen, sourceType];
    if (filled) added += 1;
  }

  return added;
}

/**
 * Attach another engine's figures under a prefix.
 *
 * Only keywords already in the table are enriched: Bing returning volume for a
 * word no Google endpoint surfaced would add a row with nothing else in it.
 */
function absorbNamespaced(
  merged: Map<string, Row>,
  results: unknown,
  prefix: string,
  sourceType: string,
): number {
  if (!Array.isArray(results)) return 0;
  let added = 0;

  for (const raw of results) {
    if (!isRecord(raw)) continue;
    const key = keywordKey(raw.keyword);
    if (!key) continue;
    const existing = merged.get(key);
    if (!existing) continue;

    let filled = false;
    for (const [field, value] of Object.entries(raw)) {
      if (field === 'keyword' || field === '_full' || field === '_sources') continue;
      if (isBlank(value)) continue;
      const namespaced = `${prefix}_${field}`;
      if (isBlank(existing[namespaced])) {
        existing[namespaced] = value;
        filled = true;
      }
    }
    if (filled) {
      const seen = Array.isArray(existing._sources) ? existing._sources : [];
      existing._sources = [...seen, sourceType];
      added += 1;
    }
  }

  return added;
}

function keywordKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

/**
 * The version of a merged bundle that is worth persisting.
 *
 * A finished run holds three things: the shaped rows (around 512KB for 285
 * keywords), the untouched provider record attached to every row as `_full`
 * (another 1.2MB), and the raw envelopes of the full call set (1.7MB more).
 * Storing all of it means three and a half megabytes of jsonb per search, and
 * it blows past the server-action body limit before it ever reaches the
 * database.
 *
 * The shaped rows and the panels are what the table, the charts and all four
 * exports actually read, so those are kept. `_full` is dropped: it powers only
 * the row expander's "complete provider record", which stays available for the
 * rest of the live session and is a fair thing to lose on a reopened one. The
 * count of what was dropped is recorded so the UI can say so rather than
 * silently showing an empty panel.
 */
export function trimBundleForStorage(
  merged: MergedKeywordResult,
): MergedKeywordResult {
  let dropped = 0;
  const results = merged.results.map((row) => {
    if (row._full === undefined) return row;
    dropped += 1;
    const { _full, ...rest } = row;
    return rest;
  });

  return {
    ...merged,
    results,
    meta: { ...merged.meta, trimmed: dropped > 0 },
  };
}
