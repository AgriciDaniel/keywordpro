/**
 * Free verification of country and language targeting.
 *
 * Targeting is the quietest way this app can be wrong. A stale location code
 * fails the task with DataForSEO status 40505, and a country/language pair the
 * API does not support returns an empty or misleading result rather than an
 * error, so nothing on screen says the market was wrong. These assertions
 * guard the catalog, the two resolvers, and the pair the UI can build.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/verify-targeting.ts
 */
import { augmentParamsForDispatcher } from '@/components/research-console/dfs-params';
import {
  RESEARCH_ENDPOINT_CATALOG,
  getEndpointByType as getCatalogEndpoint,
} from '@/lib/research/endpoint-catalog';
import { ENDPOINTS, getEndpointByType as getExecutableEndpoint } from '@/lib/research/endpoints';
import { targetingFieldsForEndpointType } from '@/lib/research/endpoint-targeting';
import {
  COUNTRY_OPTIONS,
  DEFAULT_COUNTRY,
  DEFAULT_LANGUAGE,
  LANGUAGE_OPTIONS,
  defaultLanguageForCountry,
  endpointTargetingCompatibility,
  findLocationByIso,
  isLanguageSupportedInCountry,
  languageOptionGroupsForCountry,
  languageOptionsForCountry,
  resolveLanguage,
  resolveLocation,
  sourceForEndpointType,
  sourcesForTargeting,
} from '@/lib/research/locations-languages';
import { DFS_LOCATION_CATALOG } from '@/lib/research/locations-languages.generated';

let pass = 0;
const failures: string[] = [];
const check = (claim: string, ok: boolean) => {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${claim}`);
  } else {
    failures.push(claim);
    console.log(`  FAIL  ${claim}`);
  }
};

// ---------------------------------------------------------------------------
console.log('Catalog integrity\n');

check(
  `the catalog carries every location DataForSEO Labs returned (${DFS_LOCATION_CATALOG.length})`,
  DFS_LOCATION_CATALOG.length >= 90,
);

check(
  'every location has a numeric code, an ISO code and a name',
  DFS_LOCATION_CATALOG.every(
    (location) =>
      Number.isInteger(location.code) &&
      location.code > 0 &&
      /^[A-Z]{2}$/.test(location.iso) &&
      location.name.trim().length > 0,
  ),
);

check(
  'no location is offered without at least one language',
  DFS_LOCATION_CATALOG.every((location) => location.languages.length > 0),
);

check(
  'ISO codes are unique, so a country can never resolve two ways',
  new Set(DFS_LOCATION_CATALOG.map((l) => l.iso)).size ===
    DFS_LOCATION_CATALOG.length,
);

check(
  'location codes are unique',
  new Set(DFS_LOCATION_CATALOG.map((l) => l.code)).size ===
    DFS_LOCATION_CATALOG.length,
);

check(
  'every language carries an ISO 639-1 style code and a name',
  DFS_LOCATION_CATALOG.every((location) =>
    location.languages.every(
      (language) =>
        /^[a-z]{2,3}(-[a-zA-Z]{2,4})?$/.test(language.code) &&
        language.name.trim().length > 0,
    ),
  ),
);

check(
  'the four location codes the app used to hard-code still match the catalog',
  findLocationByIso('US')?.code === 2840 &&
    findLocationByIso('GB')?.code === 2826 &&
    findLocationByIso('DE')?.code === 2276 &&
    findLocationByIso('RO')?.code === 2642,
);

// ---------------------------------------------------------------------------
console.log('\nPicker options\n');

check(
  `the country picker offers the whole catalog, not a hand-picked six (${COUNTRY_OPTIONS.length})`,
  COUNTRY_OPTIONS.length === DFS_LOCATION_CATALOG.length &&
    COUNTRY_OPTIONS.length > 50,
);

check(
  `the flat language list covers every language in the catalog (${LANGUAGE_OPTIONS.length})`,
  LANGUAGE_OPTIONS.length ===
    new Set(
      DFS_LOCATION_CATALOG.flatMap((l) => l.languages.map((x) => x.code)),
    ).size,
);

check(
  'countries are sorted by name so the picker is scannable',
  COUNTRY_OPTIONS.every(
    (option, index) =>
      index === 0 ||
      COUNTRY_OPTIONS[index - 1].label.localeCompare(option.label) <= 0,
  ),
);

check(
  'the defaults are a pair the API supports',
  isLanguageSupportedInCountry(DEFAULT_COUNTRY, DEFAULT_LANGUAGE),
);

// ---------------------------------------------------------------------------
console.log('\nPer-country language coverage\n');

check(
  'Romania offers Romanian only, so the old Romania + English pair is unbuildable',
  languageOptionsForCountry('RO').every((option) => option.value === 'ro') &&
    !isLanguageSupportedInCountry('RO', 'en'),
);

check(
  'the United States offers English and Spanish',
  ['en', 'es'].every((code) => isLanguageSupportedInCountry('US', code)),
);

check(
  'a multilingual country offers each of its languages (Switzerland)',
  languageOptionsForCountry('CH').length >= 3,
);

check(
  'every option a country picker can produce is supported by that country',
  DFS_LOCATION_CATALOG.every((location) =>
    languageOptionsForCountry(location.iso).every((option) =>
      isLanguageSupportedInCountry(location.iso, option.value),
    ),
  ),
);

check(
  'an unknown country falls back to the full language list rather than an empty picker',
  languageOptionsForCountry('ZZ').length === LANGUAGE_OPTIONS.length,
);

check(
  'the picker exposes every known language while enabling only valid US pairs',
  (() => {
    const groups = languageOptionGroupsForCountry('US');
    return (
      groups.supported.length === 2 &&
      groups.supported.length + groups.other.length === LANGUAGE_OPTIONS.length &&
      groups.other.some((option) => option.value === 'ro')
    );
  })(),
);

check(
  'every country splits the complete language catalog without duplicates',
  DFS_LOCATION_CATALOG.every((location) => {
    const groups = languageOptionGroupsForCountry(location.iso);
    const codes = [...groups.supported, ...groups.other].map(
      (option) => option.value,
    );
    return (
      codes.length === LANGUAGE_OPTIONS.length &&
      new Set(codes).size === LANGUAGE_OPTIONS.length
    );
  }),
);

check(
  'source availability is specific to the selected country and language',
  sourcesForTargeting('US', 'en').sort().join(',') ===
    'amazon,bing,google' &&
    sourcesForTargeting('US', 'es').join(',') === 'google' &&
    sourcesForTargeting('RO', 'en').length === 0,
);

// ---------------------------------------------------------------------------
console.log('\nAdvanced endpoint compatibility\n');

const targetedEndpoint = (type: string) => ({
  type,
  required: ['country', 'language'],
  optional: [],
});

check(
  'Bing runs only where the selected pair carries Bing data',
  endpointTargetingCompatibility(
    targetedEndpoint('keyword.bing.search_volume.live'),
    'US',
    'en',
  ).supported &&
    !endpointTargetingCompatibility(
      targetedEndpoint('keyword.bing.search_volume.live'),
      'US',
      'es',
    ).supported,
);

check(
  'Amazon runs only where the selected pair carries Amazon data',
  !endpointTargetingCompatibility(
    targetedEndpoint('labs.amazon.related_keywords.live'),
    'US',
    'es',
  ).supported,
);

check(
  'Google endpoints still reject a globally invalid country-language pair',
  !endpointTargetingCompatibility(
    targetedEndpoint('labs.google.keyword_overview.live'),
    'RO',
    'en',
  ).supported,
);

check(
  'reference endpoints are not blocked by unrelated global filters',
  endpointTargetingCompatibility(
    {
      type: 'ref.serp.bing.locations',
      required: [],
      optional: [],
    },
    'RO',
    'ro',
  ).supported,
);

check(
  'engine detection uses endpoint path segments',
  sourceForEndpointType('labs.amazon.related_keywords.live') === 'amazon' &&
    sourceForEndpointType('serp.bing.organic.live') === 'bing' &&
    sourceForEndpointType('keyword.google_ads.search_volume.live') === 'google' &&
    sourceForEndpointType('content.search.live') === null,
);

// ---------------------------------------------------------------------------
console.log('\nExecutable targeting metadata\n');

const LOCATION_BODY_FIELD =
  /\bi\.(?:country|country_iso_code|location|location_code|location_name|location_coordinate)\b/;
const LANGUAGE_BODY_FIELD =
  /\bi\.(?:language|language_code|language_name)\b/;

check(
  'every generated targeting record matches the executable request body',
  ENDPOINTS.every((endpoint) => {
    if (endpoint.method !== 'POST') {
      return targetingFieldsForEndpointType(endpoint.type) === null;
    }
    const bodySource = endpoint.bodySource ?? '';
    const country = LOCATION_BODY_FIELD.test(bodySource);
    const language = LANGUAGE_BODY_FIELD.test(bodySource);
    const generated = targetingFieldsForEndpointType(endpoint.type);
    return country || language
      ? generated?.country === country && generated.language === language
      : generated === null;
  }),
);

check(
  'every keyword request that reads targeting exposes matching UI fields',
  RESEARCH_ENDPOINT_CATALOG.filter((endpoint) => endpoint.mode === 'keyword').every(
    (endpoint) => {
      const generated = targetingFieldsForEndpointType(endpoint.type);
      if (!generated) return true;
      const fields = new Set([...endpoint.required, ...endpoint.optional]);
      return (
        (!generated.country || fields.has('country')) &&
        (!generated.language || fields.has('language'))
      );
    },
  ),
);

const realAmazon = getCatalogEndpoint('labs.amazon.related_keywords.live');
const realBingTask = getCatalogEndpoint('keyword.bing.search_volume.task_post');
check(
  'real Amazon and Bing definitions no longer fall back to hidden US-English defaults',
  Boolean(
    realAmazon?.optional.includes('country') &&
      realAmazon.optional.includes('language') &&
      realBingTask?.optional.includes('country') &&
      realBingTask.optional.includes('language'),
  ),
);

const compatibilityFor = (type: string, country: string, language: string) => {
  const endpoint = getExecutableEndpoint(type);
  if (!endpoint) return false;
  return endpointTargetingCompatibility(endpoint, country, language).supported;
};

check(
  'Bing Search Volume uses its own six-country, three-language catalog',
  compatibilityFor('keyword.bing.search_volume.live', 'DE', 'de') &&
    !compatibilityFor('keyword.bing.search_volume.live', 'US', 'es') &&
    !compatibilityFor('keyword.bing.search_volume.live', 'RO', 'ro'),
);

check(
  'Bing history and performance use their endpoint-specific targeting pairs',
  compatibilityFor('keyword.bing.search_volume_history.live', 'AR', 'es') &&
    compatibilityFor('keyword.bing.keyword_performance.live', 'CA', 'fr') &&
    !compatibilityFor('keyword.bing.keyword_performance.live', 'US', 'es'),
);

check(
  'Bing SERP uses the separate SERP language catalog',
  compatibilityFor('serp.bing.organic.live', 'US', 'es') &&
    !compatibilityFor('serp.bing.organic.live', 'AL', 'sq'),
);

check(
  'Amazon Labs keeps its own country-language pair contract',
  compatibilityFor('labs.amazon.related_keywords.live', 'US', 'en') &&
    !compatibilityFor('labs.amazon.related_keywords.live', 'US', 'es'),
);

// ---------------------------------------------------------------------------
console.log('\nSwitching country repairs the language\n');

check(
  'a supported language survives the switch',
  defaultLanguageForCountry('US', 'es') === 'es',
);

check(
  'an unsupported language is replaced, never carried into the request',
  defaultLanguageForCountry('RO', 'es') === 'ro',
);

check(
  'English is preferred when the new country supports it',
  defaultLanguageForCountry('GB', 'ro') === 'en',
);

check(
  'every country produces a language it actually supports, from any starting point',
  DFS_LOCATION_CATALOG.every((location) =>
    ['en', 'es', 'ro', 'zz', null].every((preferred) =>
      isLanguageSupportedInCountry(
        location.iso,
        defaultLanguageForCountry(location.iso, preferred),
      ),
    ),
  ),
);

// ---------------------------------------------------------------------------
console.log('\nResolvers accept what the UI and saved sessions hold\n');

check(
  'an ISO code resolves',
  resolveLocation('RO')?.code === 2642 && resolveLocation('ro')?.code === 2642,
);

check(
  'a DataForSEO location name resolves, so saved sessions keep working',
  resolveLocation('Romania')?.code === 2642 &&
    resolveLocation('united states')?.code === 2840,
);

check(
  'a language code and an English language name both resolve',
  resolveLanguage('ro')?.name === 'Romanian' &&
    resolveLanguage('Romanian')?.code === 'ro',
);

check(
  'an unknown country resolves to null rather than a wrong market',
  resolveLocation('ZZ') === null && resolveLocation('Atlantis') === null,
);

check(
  'blank input resolves to null',
  resolveLocation('  ') === null && resolveLanguage('') === null,
);

// ---------------------------------------------------------------------------
console.log('\nWhat reaches the request body\n');

check(
  'a country becomes both location_code and location_name',
  (() => {
    const out = augmentParamsForDispatcher({ country: 'DE', language: 'de' });
    return out.location_code === 2276 && out.location_name === 'Germany';
  })(),
);

check(
  'a lowercase country still maps',
  augmentParamsForDispatcher({ country: 'ro' }).location_code === 2642,
);

check(
  'an unknown country sends no location at all, rather than silently using the US',
  (() => {
    const out = augmentParamsForDispatcher({ country: 'ZZ' });
    return out.location_code === undefined && out.location_name === undefined;
  })(),
);

check(
  'an explicit location_code is never overwritten',
  augmentParamsForDispatcher({ country: 'DE', location_code: 2840 })
    .location_code === 2840,
);

check(
  'the language code passes through',
  augmentParamsForDispatcher({ country: 'US', language: 'es' })
    .language_code === 'es',
);

// ---------------------------------------------------------------------------
console.log('');
if (failures.length > 0) {
  console.log(`${pass} passed, ${failures.length} failed`);
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
console.log(`${pass} passed, 0 failed`);
