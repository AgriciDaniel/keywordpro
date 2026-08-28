/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  endpointTargetingCompatibility,
  isLanguageSupportedInCountry,
  type DfsSource,
} from './locations-languages';

/**
 * The keyword bundle: what "just type a keyword" actually runs.
 *
 * Simple mode asks the user for one thing and gives back one dashboard, so the
 * app has to decide on their behalf which endpoints to call. This is that
 * decision, written down.
 *
 * 66 endpoints in the catalog can be called from a keyword alone, but that is
 * the wrong target. 14 of them are duplicate serialisations (`.html`,
 * `.regular`) returning the same data, and 14 belong to unrelated verticals
 * (finance tickers, events, jobs, maps, app stores). Of the 38 that remain,
 * several re-buy fields another endpoint already returned: `keyword_overview`
 * alone carries volume, CPC, difficulty, intent, trend, backlinks, SERP info
 * and clickstream, so paying separately for `bulk_keyword_difficulty` and
 * `search_intent` on the same seed is spending twice for one number.
 *
 * What is left is up to 19 calls that each contribute something no other call
 * in the set does. Bing and Amazon are included only when the chosen market
 * and language support them. The calls run cheapest and most load-bearing
 * first, so the dashboard has a keyword table to draw within a couple of
 * seconds while the rest fills in behind it.
 */

export type BundleGroup = 'spine' | 'demand' | 'cross-engine' | 'serp';

export type BundleEntry = {
  type: string;
  group: BundleGroup;
  /** Shown in the progress line while it runs. */
  label: string;
  /** Why it earns its place, for the "what did this cost me" panel. */
  contributes: string;
  /**
   * The bundle is best-effort: a provider outage or an unactivated API on one
   * call must not lose the other eighteen. Only the spine's first entry is
   * required for the run to be considered a success.
   */
  required?: boolean;
  /** Omit this call when the selected market does not carry that engine. */
  requiresSource?: DfsSource;
};

export const KEYWORD_BUNDLE: BundleEntry[] = [
  // --- Spine: the keyword table itself -------------------------------------
  {
    type: 'labs.google.keyword_overview.live',
    group: 'spine',
    label: 'Keyword overview',
    contributes: 'The seed keyword in full: volume, CPC, difficulty, intent, trend, backlinks',
    required: true,
  },
  {
    type: 'labs.google.related_keywords.live',
    group: 'spine',
    label: 'Related keywords',
    contributes: 'The semantic neighbourhood, with the same metrics per keyword',
  },
  {
    type: 'labs.google.keyword_suggestions.live',
    group: 'spine',
    label: 'Keyword suggestions',
    contributes: 'Long-tail phrases containing the seed',
  },
  {
    type: 'labs.google.keyword_ideas.live',
    group: 'spine',
    label: 'Keyword ideas',
    contributes: 'Semantically related ideas that need not contain the seed',
  },
  {
    type: 'labs.google.search_intent.live',
    group: 'spine',
    label: 'Search intent',
    contributes: 'Intent for the keywords the expansion endpoints leave unlabelled',
  },
  {
    type: 'labs.google.bulk_keyword_difficulty.live',
    group: 'spine',
    label: 'Keyword difficulty',
    contributes: 'Difficulty for keywords the expansion endpoints return without one',
  },

  // --- Demand: how interest moves over time and who holds it ---------------
  {
    type: 'keyword.google_trends.explore.live',
    group: 'demand',
    label: 'Google Trends',
    contributes: 'Relative interest over time, plus rising and top related queries',
  },
  {
    type: 'keyword.dataforseo_trends.explore.live',
    group: 'demand',
    label: 'DataForSEO Trends',
    contributes: 'Clickstream-derived interest, independent of Google Trends sampling',
  },
  {
    type: 'keyword.dataforseo_trends.demography.live',
    group: 'demand',
    label: 'Demographics',
    contributes: 'Age and gender split of the people searching',
  },
  {
    type: 'keyword.dataforseo_trends.subregion_interests.live',
    group: 'demand',
    label: 'Regional interest',
    contributes: 'Where in the country the demand actually sits',
  },
  {
    type: 'labs.google.historical_keyword_data.live',
    group: 'demand',
    label: 'Historical data',
    contributes: 'How volume, CPC and competition looked in previous months',
  },

  // --- Cross-engine: the same keyword outside Google -----------------------
  {
    type: 'keyword.google_ads.search_volume.live',
    group: 'cross-engine',
    label: 'Google Ads volume',
    contributes:
      'The raw Ads figure behind the Labs estimate, for every keyword in the set',
  },
  {
    type: 'keyword.bing.search_volume.live',
    group: 'cross-engine',
    label: 'Bing volume',
    contributes:
      'Bing demand for every keyword, which diverges from Google on technical and B2B terms',
    requiresSource: 'bing',
  },
  {
    type: 'labs.amazon.related_keywords.live',
    group: 'cross-engine',
    label: 'Amazon keywords',
    contributes: 'Product-search phrasing, where commercial intent shows up first',
    requiresSource: 'amazon',
  },
  {
    type: 'labs.amazon.bulk_search_volume.live',
    group: 'cross-engine',
    label: 'Amazon volume',
    contributes: 'Search volume on Amazon for the same terms',
    requiresSource: 'amazon',
  },

  // --- SERP: what the result page actually looks like ----------------------
  {
    type: 'serp.google.organic.live',
    group: 'serp',
    label: 'Organic results',
    contributes: 'Who ranks today, and which SERP features are present',
  },
  {
    type: 'serp.google.autocomplete.live',
    group: 'serp',
    label: 'Autocomplete',
    contributes: 'What Google offers to finish the query with',
  },
  {
    type: 'labs.google.serp_competitors.live',
    group: 'serp',
    label: 'SERP competitors',
    contributes: 'Domains that rank across this keyword set, not just this query',
  },
  {
    type: 'labs.google.categories_for_keywords.live',
    group: 'serp',
    label: 'Categories',
    contributes: 'The product and topic categories Google files the keyword under',
  },
];

export const BUNDLE_GROUP_LABELS: Record<BundleGroup, string> = {
  spine: 'Keyword data',
  demand: 'Demand over time',
  'cross-engine': 'Other engines',
  serp: 'Search results',
};

export function bundleEntriesForTargeting(
  country?: string | null,
  language?: string | null,
): BundleEntry[] {
  if (!country || !language) return KEYWORD_BUNDLE;

  // Returning no calls for an invalid pair is safer than spending against a
  // locale the provider will reject.
  if (!isLanguageSupportedInCountry(country, language)) return [];

  return KEYWORD_BUNDLE.filter((entry) => {
    if (!entry.requiresSource) return true;
    return endpointTargetingCompatibility(
      {
        type: entry.type,
        required: ['country', 'language'],
        optional: [],
      },
      country,
      language,
    ).supported;
  });
}

export function bundleTypes(
  country?: string | null,
  language?: string | null,
): string[] {
  return bundleEntriesForTargeting(country, language).map((entry) => entry.type);
}

export function bundleEntry(type: string): BundleEntry | undefined {
  return KEYWORD_BUNDLE.find((entry) => entry.type === type);
}
