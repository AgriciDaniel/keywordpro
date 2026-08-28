/**
 * Regenerates the checked-in targeting catalogs from DataForSEO's free
 * reference endpoints.
 *
 *   pnpm --ignore-workspace exec tsx --tsconfig tsconfig.json scripts/generate-locations-languages.ts
 *
 * Labs defines the 94-market, 46-language product picker. Bing Keywords Data
 * and Bing SERP have separate location and language contracts, so their
 * capabilities are captured independently instead of inferred from Labs.
 * The script refuses to write if any response reports a non-zero cost.
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const API_ROOT = 'https://api.dataforseo.com/v3';
const SOURCE_URLS = {
  labs: `${API_ROOT}/dataforseo_labs/locations_and_languages`,
  bingKeywordsLocations: `${API_ROOT}/keywords_data/bing/locations`,
  bingKeywordsLanguages: `${API_ROOT}/keywords_data/bing/languages`,
  bingSearchVolumeHistory: `${API_ROOT}/keywords_data/bing/search_volume_history/locations_and_languages`,
  bingKeywordPerformance: `${API_ROOT}/keywords_data/bing/keyword_performance/locations_and_languages`,
  bingSerpLocations: `${API_ROOT}/serp/bing/locations`,
  bingSerpLanguages: `${API_ROOT}/serp/bing/languages`,
} as const;
const OUT_PATH = resolve(
  import.meta.dirname,
  '../src/lib/research/locations-languages.generated.ts',
);

type RawLanguage = {
  language_code: string;
  language_name: string;
  available_sources?: string[] | null;
};

type RawLocation = {
  location_code: number;
  location_name: string;
  country_iso_code: string;
  location_type: string;
  available_languages?: RawLanguage[] | null;
};

type RawLocationsForLanguage = RawLanguage & {
  available_locations?: RawLocation[] | null;
};

type ProviderPayload<T> = {
  status_code: number;
  status_message: string;
  cost: number;
  tasks: Array<{
    status_code: number;
    status_message: string;
    cost: number;
    result: T[] | null;
  }>;
};

async function fetchFreeCatalog<T>(url: string, auth: string): Promise<T[]> {
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }

  const payload = (await response.json()) as ProviderPayload<T>;
  const task = payload.tasks?.[0];
  const totalCost = (payload.cost ?? 0) + (task?.cost ?? 0);
  if (totalCost !== 0) {
    throw new Error(
      `Expected a free endpoint but ${url} reported cost ${totalCost}. Nothing written.`,
    );
  }
  if (
    payload.status_code !== 20000 ||
    !task ||
    task.status_code !== 20000 ||
    !task.result?.length
  ) {
    throw new Error(
      `Reference request failed: ${payload.status_code} ${payload.status_message}; ${task?.status_code} ${task?.status_message}`,
    );
  }
  return task.result;
}

function sortedUnique<T>(values: T[]): T[] {
  return [...new Set(values)].sort((left, right) =>
    String(left).localeCompare(String(right)),
  );
}

async function main() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new Error(
      'DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD must be set in .env or the process environment.',
    );
  }

  const auth = Buffer.from(`${login}:${password}`).toString('base64');
  const [
    labsRows,
    bingKeywordsLocations,
    bingKeywordsLanguages,
    bingSearchVolumeHistory,
    bingKeywordPerformance,
    bingSerpLocations,
    bingSerpLanguages,
  ] = await Promise.all([
    fetchFreeCatalog<RawLocation>(SOURCE_URLS.labs, auth),
    fetchFreeCatalog<RawLocation>(SOURCE_URLS.bingKeywordsLocations, auth),
    fetchFreeCatalog<RawLanguage>(SOURCE_URLS.bingKeywordsLanguages, auth),
    fetchFreeCatalog<RawLocationsForLanguage>(
      SOURCE_URLS.bingSearchVolumeHistory,
      auth,
    ),
    fetchFreeCatalog<RawLocationsForLanguage>(
      SOURCE_URLS.bingKeywordPerformance,
      auth,
    ),
    fetchFreeCatalog<RawLocation>(SOURCE_URLS.bingSerpLocations, auth),
    fetchFreeCatalog<RawLanguage>(SOURCE_URLS.bingSerpLanguages, auth),
  ]);

  const locations = labsRows
    .filter((row) => row.country_iso_code && row.available_languages?.length)
    .map((row) => ({
      code: Number(row.location_code),
      iso: row.country_iso_code.toUpperCase(),
      name: row.location_name,
      languages: (row.available_languages ?? [])
        .map((language) => ({
          code: language.language_code,
          name: language.language_name,
          sources: [...(language.available_sources ?? [])].sort(),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const seen = new Set<string>();
  for (const location of locations) {
    if (seen.has(location.iso)) {
      throw new Error(`Duplicate ISO code in the response: ${location.iso}`);
    }
    seen.add(location.iso);
  }

  const catalogByCode = new Map(
    locations.map((location) => [location.code, location]),
  );
  const catalogLanguageCodes = new Set(
    locations.flatMap((location) =>
      location.languages.map((language) => language.code),
    ),
  );
  const languageCount = catalogLanguageCodes.size;

  const supportedCatalogCodes = (rows: RawLocation[]) =>
    sortedUnique(
      rows
        .map((row) => Number(row.location_code))
        .filter((code) => catalogByCode.has(code)),
    );
  const languageCodes = (rows: RawLanguage[]) =>
    sortedUnique(rows.map((row) => row.language_code));
  const targetingPairs = (rows: RawLocationsForLanguage[]) =>
    sortedUnique(
      rows.flatMap((language) =>
        (language.available_locations ?? []).flatMap((location) => {
          const catalogLocation = catalogByCode.get(Number(location.location_code));
          return catalogLocation && catalogLanguageCodes.has(language.language_code)
            ? [`${catalogLocation.iso}:${language.language_code}`]
            : [];
        }),
      ),
    );

  const bingKeywordsLocationCodes = supportedCatalogCodes(
    bingKeywordsLocations,
  );
  const bingKeywordsLanguageCodes = languageCodes(bingKeywordsLanguages);
  const bingSearchVolumeHistoryPairs = targetingPairs(
    bingSearchVolumeHistory,
  );
  const bingKeywordPerformancePairs = targetingPairs(
    bingKeywordPerformance,
  );
  const bingSerpLocationCodes = supportedCatalogCodes(bingSerpLocations);
  const bingSerpLanguageCodes = languageCodes(bingSerpLanguages);

  const body = `/**
 * GENERATED FILE. Do not hand-edit.
 *
 * Sources: DataForSEO Labs, Bing Keywords Data, and Bing SERP free reference
 * endpoints. Regenerate with:
 * pnpm --ignore-workspace exec tsx --tsconfig tsconfig.json scripts/generate-locations-languages.ts
 *
 * ${locations.length} product locations and ${languageCount} distinct product languages.
 * Each provider family keeps its own targeting contract below.
 */

export type DfsSource = 'google' | 'bing' | 'amazon';

export type DfsCatalogLanguage = {
  code: string;
  name: string;
  /** Which Labs search engines carry data for this location/language pair. */
  sources: DfsSource[];
};

export type DfsCatalogLocation = {
  /** DataForSEO numeric location_code. */
  code: number;
  /** ISO 3166-1 alpha-2, the value the UI stores. */
  iso: string;
  /** DataForSEO location_name, sent alongside the code. */
  name: string;
  languages: DfsCatalogLanguage[];
};

export const DFS_TARGETING_SOURCE_URLS = ${JSON.stringify(SOURCE_URLS, null, 2)} as const;

export const DFS_CATALOG_SOURCE_URL = DFS_TARGETING_SOURCE_URLS.labs;

export const BING_KEYWORDS_LOCATION_CODES = ${JSON.stringify(bingKeywordsLocationCodes)} as const;
export const BING_KEYWORDS_LANGUAGE_CODES = ${JSON.stringify(bingKeywordsLanguageCodes)} as const;
export const BING_SEARCH_VOLUME_HISTORY_PAIRS = ${JSON.stringify(bingSearchVolumeHistoryPairs)} as const;
export const BING_KEYWORD_PERFORMANCE_PAIRS = ${JSON.stringify(bingKeywordPerformancePairs)} as const;
export const BING_SERP_LOCATION_CODES = ${JSON.stringify(bingSerpLocationCodes)} as const;
export const BING_SERP_LANGUAGE_CODES = ${JSON.stringify(bingSerpLanguageCodes)} as const;

export const DFS_LOCATION_CATALOG: DfsCatalogLocation[] = ${JSON.stringify(
    locations,
    null,
    2,
  )};
`;

  writeFileSync(OUT_PATH, body, 'utf8');
  process.stdout.write(
    `Wrote ${locations.length} locations, ${languageCount} languages, and separate Bing capability catalogs.\nReported cost: $0.00\n`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
