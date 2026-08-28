/**
 * The one place the app answers "which countries and languages can we ask
 * DataForSEO about, and what do we send for them".
 *
 * Before this there were four hand-typed lists that had drifted apart: the
 * console dropdown offered 6 countries and 5 languages, the advanced form
 * offered the same 6 and 5, and the dispatcher and its param augmenter each
 * knew a different 10. DataForSEO Labs actually supports 94 locations and 46
 * languages, and it publishes them from a free endpoint, so the data is now
 * generated rather than typed. See `locations-languages.generated.ts`.
 *
 * Two rules from DataForSEO's own documentation shape this module:
 *
 * 1. Location codes change, and a stale one fails the task with status 40505
 *    rather than degrading, so codes are never hand-written.
 * 2. Language coverage is per location, not global. Romania supports only
 *    Romanian; the United States supports English and Spanish. Offering a flat
 *    language list lets a user build a pair the API rejects, which is exactly
 *    what the old UI did.
 */

import {
  BING_KEYWORD_PERFORMANCE_PAIRS,
  BING_KEYWORDS_LANGUAGE_CODES,
  BING_KEYWORDS_LOCATION_CODES,
  BING_SEARCH_VOLUME_HISTORY_PAIRS,
  BING_SERP_LANGUAGE_CODES,
  BING_SERP_LOCATION_CODES,
  DFS_LOCATION_CATALOG,
  type DfsCatalogLanguage,
  type DfsCatalogLocation,
  type DfsSource,
} from './locations-languages.generated';
import { targetingFieldsForEndpointType } from './endpoint-targeting';

export type { DfsCatalogLanguage, DfsCatalogLocation, DfsSource };

export const DEFAULT_COUNTRY = 'US';
export const DEFAULT_LANGUAGE = 'en';

export type SelectOption = { value: string; label: string };

export type LanguageOptionGroups = {
  /** Languages the selected country can send to DataForSEO Labs. */
  supported: SelectOption[];
  /** Languages available elsewhere, shown so the catalog never looks truncated. */
  other: SelectOption[];
};

export type EndpointTargetingDescriptor = {
  type: string;
  required: readonly string[];
  optional: readonly string[];
};

export type EndpointTargetingCompatibility = {
  supported: boolean;
  reason: string | null;
  source: DfsSource | null;
};

const BY_ISO = new Map(
  DFS_LOCATION_CATALOG.map((location) => [location.iso, location]),
);
const BY_NAME = new Map(
  DFS_LOCATION_CATALOG.map((location) => [location.name.toLowerCase(), location]),
);
const BY_CODE = new Map(
  DFS_LOCATION_CATALOG.map((location) => [location.code, location]),
);
const BING_KEYWORDS_LOCATIONS = new Set<number>(
  BING_KEYWORDS_LOCATION_CODES,
);
const BING_KEYWORDS_LANGUAGES = new Set<string>(
  BING_KEYWORDS_LANGUAGE_CODES,
);
const BING_SEARCH_VOLUME_HISTORY_TARGETS = new Set<string>(
  BING_SEARCH_VOLUME_HISTORY_PAIRS,
);
const BING_KEYWORD_PERFORMANCE_TARGETS = new Set<string>(
  BING_KEYWORD_PERFORMANCE_PAIRS,
);
const BING_SERP_LOCATIONS = new Set<number>(BING_SERP_LOCATION_CODES);
const BING_SERP_LANGUAGES = new Set<string>(BING_SERP_LANGUAGE_CODES);

/** Every language any location supports, deduped, sorted by name. */
const ALL_LANGUAGES: DfsCatalogLanguage[] = (() => {
  const merged = new Map<string, DfsCatalogLanguage>();
  for (const location of DFS_LOCATION_CATALOG) {
    for (const language of location.languages) {
      const existing = merged.get(language.code);
      if (!existing) {
        merged.set(language.code, { ...language, sources: [...language.sources] });
        continue;
      }
      for (const source of language.sources) {
        if (!existing.sources.includes(source)) existing.sources.push(source);
      }
    }
  }
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
})();

const LANGUAGE_BY_CODE = new Map(
  ALL_LANGUAGES.map((language) => [language.code.toLowerCase(), language]),
);
const LANGUAGE_BY_NAME = new Map(
  ALL_LANGUAGES.map((language) => [language.name.toLowerCase(), language]),
);

/** All supported countries, sorted by name, for a country picker. */
export const COUNTRY_OPTIONS: SelectOption[] = DFS_LOCATION_CATALOG.map(
  (location) => ({ value: location.iso, label: location.name }),
);

/**
 * Every language across every location. Use `languageOptionsForCountry` for a
 * picker that sits next to a country, so the pair is always one the API
 * supports; this flat list is for contexts with no country in hand.
 */
export const LANGUAGE_OPTIONS: SelectOption[] = ALL_LANGUAGES.map((language) => ({
  value: language.code,
  label: language.name,
}));

export function findLocationByIso(iso: string | null | undefined) {
  if (!iso) return null;
  return BY_ISO.get(iso.trim().toUpperCase()) ?? null;
}

export function findLocationByCode(code: number | null | undefined) {
  if (typeof code !== 'number') return null;
  return BY_CODE.get(code) ?? null;
}

/** Accepts an ISO code ("RO") or a DataForSEO location name ("Romania"). */
export function resolveLocation(
  input: string | null | undefined,
): DfsCatalogLocation | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;
  return (
    BY_ISO.get(trimmed.toUpperCase()) ?? BY_NAME.get(trimmed.toLowerCase()) ?? null
  );
}

/** Accepts a language code ("ro") or an English language name ("Romanian"). */
export function resolveLanguage(
  input: string | null | undefined,
): DfsCatalogLanguage | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;
  return (
    LANGUAGE_BY_CODE.get(trimmed.toLowerCase()) ??
    LANGUAGE_BY_NAME.get(trimmed.toLowerCase()) ??
    null
  );
}

/** The languages DataForSEO supports for one country, as picker options. */
export function languageOptionsForCountry(
  iso: string | null | undefined,
): SelectOption[] {
  const location = findLocationByIso(iso);
  if (!location) return LANGUAGE_OPTIONS;
  return location.languages.map((language) => ({
    value: language.code,
    label: language.name,
  }));
}

/**
 * Split the complete language catalog for the targeting picker.
 *
 * A country/language pair is a provider constraint, not a UI preference. The
 * picker therefore exposes every known language while keeping invalid pairs
 * disabled. This makes the full 46-language coverage visible without letting
 * the browser submit a combination the provider will reject.
 */
export function languageOptionGroupsForCountry(
  iso: string | null | undefined,
): LanguageOptionGroups {
  const location = findLocationByIso(iso);
  if (!location) return { supported: LANGUAGE_OPTIONS, other: [] };

  const supported = languageOptionsForCountry(iso);
  const supportedCodes = new Set(supported.map((option) => option.value));
  return {
    supported,
    other: LANGUAGE_OPTIONS.filter(
      (option) => !supportedCodes.has(option.value),
    ),
  };
}

export function isLanguageSupportedInCountry(
  iso: string | null | undefined,
  languageCode: string | null | undefined,
): boolean {
  const location = findLocationByIso(iso);
  const code = languageCode?.trim().toLowerCase();
  if (!location || !code) return false;
  return location.languages.some(
    (language) => language.code.toLowerCase() === code,
  );
}

/** Search engines available for one valid country/language pair. */
export function sourcesForTargeting(
  iso: string | null | undefined,
  languageCode: string | null | undefined,
): DfsSource[] {
  const location = findLocationByIso(iso);
  const code = languageCode?.trim().toLowerCase();
  if (!location || !code) return [];
  const language = location.languages.find(
    (entry) => entry.code.toLowerCase() === code,
  );
  return language ? [...language.sources] : [];
}

const LOCATION_TARGET_FIELDS = new Set([
  'country',
  'country_iso_code',
  'location',
  'location_code',
  'location_name',
]);
const LANGUAGE_TARGET_FIELDS = new Set([
  'language',
  'language_code',
  'language_name',
]);

/** The search engine named by an endpoint type, when the catalog covers it. */
export function sourceForEndpointType(type: string): DfsSource | null {
  const segments = type.toLowerCase().split('.');
  if (segments.includes('amazon')) return 'amazon';
  if (segments.includes('bing')) return 'bing';
  if (segments.includes('google') || segments.includes('google_ads')) {
    return 'google';
  }
  return null;
}

function endpointTargetingFields(
  endpoint: EndpointTargetingDescriptor,
): { country: boolean; language: boolean } {
  const generated = targetingFieldsForEndpointType(endpoint.type);
  if (generated) return generated;

  const fields = [...endpoint.required, ...endpoint.optional];
  return {
    country: fields.some((field) => LOCATION_TARGET_FIELDS.has(field)),
    language: fields.some((field) => LANGUAGE_TARGET_FIELDS.has(field)),
  };
}

function unsupported(
  reason: string,
  source: DfsSource | null,
): EndpointTargetingCompatibility {
  return { supported: false, reason, source };
}

/**
 * Validate the target before a paid endpoint can run.
 *
 * The check applies only to endpoints that actually declare both a location
 * and a language input. This avoids treating reference and account endpoints
 * as targeted calls merely because the console also has global filters.
 */
export function endpointTargetingCompatibility(
  endpoint: EndpointTargetingDescriptor,
  country: string | null | undefined,
  languageCode: string | null | undefined,
): EndpointTargetingCompatibility {
  const source = sourceForEndpointType(endpoint.type);
  const fields = endpointTargetingFields(endpoint);
  if (!fields.country && !fields.language) {
    return { supported: true, reason: null, source };
  }

  const location = fields.country ? resolveLocation(country) : null;
  const language = fields.language ? resolveLanguage(languageCode) : null;
  if (fields.country && !location) {
    return unsupported('Choose a valid country.', source);
  }
  if (fields.language && !language) {
    return unsupported('Choose a valid language.', source);
  }

  if (
    fields.country &&
    fields.language &&
    location &&
    language &&
    !isLanguageSupportedInCountry(location.iso, language.code)
  ) {
    return unsupported(
      `${language.name} is not available for ${location.name}.`,
      source,
    );
  }

  if (endpoint.type.startsWith('keyword.bing.')) {
    if (!location) return unsupported('Choose a valid country.', source);

    const pair = language ? `${location.iso}:${language.code}` : null;
    if (endpoint.type.includes('.search_volume_history.')) {
      if (!pair || !BING_SEARCH_VOLUME_HISTORY_TARGETS.has(pair)) {
        return unsupported(
          `Bing Search Volume History is not available for ${language?.name ?? 'this language'} in ${location.name}.`,
          source,
        );
      }
    } else if (endpoint.type.includes('.keyword_performance.')) {
      if (!pair || !BING_KEYWORD_PERFORMANCE_TARGETS.has(pair)) {
        return unsupported(
          `Bing Keyword Performance is not available for ${language?.name ?? 'this language'} in ${location.name}.`,
          source,
        );
      }
    } else {
      if (!BING_KEYWORDS_LOCATIONS.has(location.code)) {
        return unsupported(
          `Bing Keywords Data is not available for ${location.name}.`,
          source,
        );
      }
      if (fields.language && language && !BING_KEYWORDS_LANGUAGES.has(language.code)) {
        return unsupported(
          `Bing Keywords Data does not support ${language.name}.`,
          source,
        );
      }
    }
  } else if (endpoint.type.startsWith('serp.bing.')) {
    if (location && !BING_SERP_LOCATIONS.has(location.code)) {
      return unsupported(`Bing SERP is not available for ${location.name}.`, source);
    }
    if (language && !BING_SERP_LANGUAGES.has(language.code)) {
      return unsupported(`Bing SERP does not support ${language.name}.`, source);
    }
  } else if (
    fields.country &&
    fields.language &&
    location &&
    language &&
    source
  ) {
    const availableSources = sourcesForTargeting(location.iso, language.code);
    if (!availableSources.includes(source)) {
      const label = source === 'amazon' ? 'Amazon' : source === 'bing' ? 'Bing' : 'Google';
      return unsupported(
        `${label} is not available for ${language.name} in ${location.name}.`,
        source,
      );
    }
  }

  return { supported: true, reason: null, source };
}

/**
 * The language to select for a country, preferring one the user already had.
 * Falls back to English where the country supports it, then to the country's
 * first language, so the pair is never one the API would reject.
 */
export function defaultLanguageForCountry(
  iso: string | null | undefined,
  preferred?: string | null,
): string {
  const location = findLocationByIso(iso);
  if (!location || location.languages.length === 0) {
    return preferred?.trim() || DEFAULT_LANGUAGE;
  }
  if (isLanguageSupportedInCountry(iso, preferred)) {
    return preferred?.trim().toLowerCase() as string;
  }
  const english = location.languages.find(
    (language) => language.code.toLowerCase() === DEFAULT_LANGUAGE,
  );
  return (english ?? location.languages[0]).code;
}

/** Countries carrying data for one Labs search engine (google, bing, amazon). */
export function countriesForSource(source: DfsSource): SelectOption[] {
  return DFS_LOCATION_CATALOG.filter((location) =>
    location.languages.some((language) => language.sources.includes(source)),
  ).map((location) => ({ value: location.iso, label: location.name }));
}
