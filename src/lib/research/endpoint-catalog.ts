import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from './locations-languages';
import { ENDPOINT_METADATA_BY_TYPE } from '@/lib/research/endpoint-metadata';
import { DEFINITION_OVERRIDES } from '@/lib/research/endpoint-overrides';
import { targetingFieldsForEndpointType } from '@/lib/research/endpoint-targeting';
import type {
  EndpointMethod,
  EndpointProvider,
} from '@/lib/research/types';

export type EndpointConsoleMode = 'keyword';

export type EndpointCatalogMode = EndpointConsoleMode;

export type EndpointInputValue = string | number | boolean | string[];

export type EndpointInputs = Record<string, EndpointInputValue>;

export interface EndpointCatalogEntry {
  type: string;
  category: string;
  mode: EndpointCatalogMode;
  provider: EndpointProvider;
  description: string;
  required: string[];
  optional: string[];
  method: EndpointMethod;
  stub: boolean;
}

export interface EndpointSubcategory {
  id: string;
  label: string;
  mode: EndpointConsoleMode;
  description: string;
  patterns: string[];
  primaryType?: string;
  /**
   * Hand-written groupings with human labels. Simple mode shows only these;
   * Advanced adds the ones derived from the provider's own path segments.
   */
  curated?: boolean;
}

export interface EndpointFieldConfig {
  label: string;
  input:
    | 'text'
    | 'textarea'
    | 'number'
    | 'date'
    | 'select'
    | 'chips'
    | 'toggle'
    | 'hidden';
  placeholder?: string;
  helper?: string;
  defaultValue?: EndpointInputValue;
  options?: Array<{ value: string; label: string }>;
  /** Short warning shown beside a toggle when it is on, e.g. a price change. */
  activeBadge?: string;
}

// Both lists come from DataForSEO's own free locations endpoint rather than
// being typed here; see `locations-languages.ts` for why. Re-exported because
// callers have always imported them from this module.
export { COUNTRY_OPTIONS, LANGUAGE_OPTIONS };

export const ENDPOINT_FIELD_CONFIGS: Record<string, EndpointFieldConfig> = {
  app_id: {
    label: 'App ID',
    input: 'text',
    placeholder: 'Paste an app ID, e.g. com.anthropic.claude or 6473753684',
  },
  app_ids: {
    label: 'App IDs',
    input: 'chips',
    placeholder: 'Type app IDs, e.g. com.openai.chatgpt, com.anthropic.claude',
  },
  asin: {
    label: 'ASIN',
    input: 'text',
    placeholder: 'Paste an Amazon ASIN, e.g. B08N5WRWNW',
  },
  asins: {
    label: 'ASINs',
    input: 'chips',
    placeholder: 'Type Amazon ASINs, e.g. B08N5WRWNW, B09B8V1LZ3',
  },
  bid: {
    label: 'Bid',
    input: 'number',
    placeholder: '2.50',
    helper: 'Max cost-per-click used for the traffic estimate.',
  },
  category_code: {
    label: 'Category code',
    input: 'text',
    placeholder: 'Paste a numeric category code, e.g. 10021',
  },
  category_codes: {
    label: 'Category codes',
    input: 'chips',
    placeholder: 'Type numeric category codes, e.g. 10021, 13424',
  },
  country: {
    label: 'Country',
    input: 'select',
    defaultValue: 'US',
    options: COUNTRY_OPTIONS,
  },
  dataset_id: {
    label: 'Dataset ID',
    input: 'text',
    placeholder: 'Paste the dataset ID',
  },
  depth: {
    label: 'Depth',
    input: 'number',
    defaultValue: 100,
    placeholder: '100',
  },
  device: {
    label: 'Device',
    input: 'select',
    defaultValue: 'desktop',
    options: [
      { value: 'desktop', label: 'Desktop' },
      { value: 'mobile', label: 'Mobile' },
    ],
  },
  image_url: {
    label: 'Image URL',
    input: 'text',
    placeholder: 'Paste an image URL',
  },
  keyword: {
    label: 'Keyword',
    input: 'text',
    placeholder: 'Type a keyword, e.g. best ai coding tools',
  },
  keywords: {
    label: 'Keywords',
    input: 'chips',
    placeholder: 'Type keywords, e.g. ai marketing, keyword research',
  },
  language: {
    label: 'Language',
    input: 'select',
    defaultValue: 'en',
    options: LANGUAGE_OPTIONS,
  },
  location_code: {
    label: 'Location code',
    input: 'number',
    placeholder: '2840',
    helper: 'Numeric DataForSEO location code. Usually set by the Country selector.',
  },
  prompt: {
    label: 'Prompt',
    input: 'textarea',
    placeholder: 'Ask an AI search question',
  },
  target: {
    label: 'Target',
    input: 'text',
    placeholder: 'Type a domain, e.g. example.com',
  },
  task_id: {
    label: 'Task ID',
    input: 'text',
    placeholder: 'Paste a task_id from a previous request',
  },
  ticker: {
    label: 'Ticker',
    input: 'text',
    placeholder: 'Type a ticker, e.g. NVDA',
  },
  video_id: {
    label: 'Video ID',
    input: 'text',
    placeholder: 'Paste a YouTube video ID',
  },
};

const UI_ENDPOINT_TYPE_REPLACEMENTS: Record<string, string | null> = {
  'content.mentions.live': 'content.summary.live',
  'keyword.clickstream.search_volume.live':
    'keyword.clickstream.dataforseo_search_volume.live',
  'serp.google.organic.live.advanced': 'serp.google.organic.live',
};

function canonicalEndpointType(type: string) {
  return UI_ENDPOINT_TYPE_REPLACEMENTS[type] === undefined
    ? type
    : UI_ENDPOINT_TYPE_REPLACEMENTS[type];
}

function withExtraOptional(type: string, optional: string[]): string[] {
  const targeting = targetingFieldsForEndpointType(type);
  if (!targeting) return optional;
  const merged = new Set(optional);
  if (targeting.country) merged.add('country');
  if (targeting.language) merged.add('language');
  return [...merged];
}

const BASE_ENDPOINTS: EndpointCatalogEntry[] = Object.values(
  ENDPOINT_METADATA_BY_TYPE,
).map((generated) => ({
  type: generated.type,
  category: generated.category,
  mode: 'keyword',
  provider: generated.api,
  description: generated.description,
  required: generated.required,
  optional: withExtraOptional(generated.type, generated.optional),
  method: generated.method,
  stub: generated.stub,
}));

/**
 * The stub and required-parameter corrections from endpoint-overrides.ts,
 * applied to the reviewed generated entries so a regeneration cannot silently
 * revert the tested projector and request-shape fixes.
 */
function withDefinitionOverrides(entry: EndpointCatalogEntry): EndpointCatalogEntry {
  const patch = DEFINITION_OVERRIDES[entry.type];
  if (!patch) return entry;
  return {
    ...entry,
    required: patch.required ?? entry.required,
    optional: patch.optional ?? entry.optional,
    stub: patch.stub ?? entry.stub,
  };
}

export const RESEARCH_ENDPOINT_CATALOG = BASE_ENDPOINTS.map(
  withDefinitionOverrides,
);

const HAND_WRITTEN_SUBCATEGORIES: EndpointSubcategory[] = [
  {
    id: 'keyword-research',
    label: 'Keyword research',
    mode: 'keyword',
    description: 'Ideas, related terms, intent, and keyword overviews.',
    patterns: [
      'labs.google.related_keywords.',
      'labs.google.keyword_ideas.',
      'labs.google.search_intent.',
      'labs.google.keyword_overview.',
    ],
    primaryType: 'labs.google.related_keywords.live',
  },
  {
    id: 'serp-analysis',
    label: 'SERP analysis',
    mode: 'keyword',
    description: 'Search-result clusters across Google, Bing, Yahoo, and YouTube.',
    patterns: [
      'serp.google.organic.',
      'serp.bing.',
      'serp.yahoo.',
      'serp.youtube.',
    ],
    primaryType: 'serp.google.organic.live',
  },
  {
    id: 'search-volume-cpc',
    label: 'Search volume & CPC',
    mode: 'keyword',
    description: 'Volume, CPC, clickstream, and ad demand.',
    patterns: [
      'keyword.google_ads.search_volume.',
      'keyword.bing.search_volume.',
      'keyword.clickstream.',
    ],
    primaryType: 'keyword.google_ads.search_volume.live',
  },
  {
    id: 'trends',
    label: 'Trends',
    mode: 'keyword',
    description: 'Search-trend movement and regional demand.',
    patterns: ['keyword.google_trends.', 'keyword.dataforseo_trends.'],
    primaryType: 'keyword.google_trends.explore.live',
  },
  {
    id: 'content-mentions',
    label: 'Content mentions',
    mode: 'keyword',
    description: 'Pages and mentions around a topic or brand.',
    patterns: ['content.'],
    primaryType: 'content.search.live',
  },
  {
    id: 'ai-search-visibility',
    label: 'AI search visibility',
    mode: 'keyword',
    description: 'ChatGPT, Claude, Gemini, and Perplexity visibility checks.',
    patterns: ['ai.'],
    primaryType: 'ai.chat_gpt.llm_responses.live',
  },
];

/**
 * Group everything the hand-written subcategories miss.
 *
 * The curated entries keep the everyday workflow compact. Advanced mode groups
 * every remaining allowlisted endpoint by its own path segments so none are
 * hidden. Oversized groups split one level deeper, and small groups fold into
 * a per-category "More" bucket.
 */
const SPLIT_ABOVE = 24;
const MERGE_BELOW = 4;

const SEGMENT_LABELS: Record<string, string> = {
  ads_advertisers: 'Ads advertisers',
  ads_search: 'Ads search',
  ai_mode: 'AI mode',
  ai_summary: 'AI summary',
  amazon: 'Amazon',
  apple: 'Apple',
  autocomplete: 'Autocomplete',
  baidu: 'Baidu',
  bing: 'Bing',
  dataset_info: 'Dataset info',
  dataset_search: 'Dataset search',
  events: 'Events',
  finance_explore: 'Finance explore',
  finance_markets: 'Finance markets',
  finance_quote: 'Finance quote',
  finance_ticker_search: 'Finance tickers',
  google: 'Google',
  google_ads: 'Google Ads',
  google_play: 'Google Play',
  hotel_searches: 'Hotel searches',
  images: 'Images',
  jobs: 'Jobs',
  local_finder: 'Local finder',
  maps: 'Maps',
  my_business_info: 'My Business',
  naver: 'Naver',
  news: 'News',
  questions_and_answers: 'Q&A',
  search_by_image: 'Search by image',
  seznam: 'Seznam',
  tripadvisor: 'Tripadvisor',
  trustpilot: 'Trustpilot',
  yelp: 'Yelp',
  youtube: 'YouTube',
};

function humanise(segment: string): string {
  return (
    SEGMENT_LABELS[segment] ??
    segment.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  );
}

/**
 * `ref.serp.bing.locations` keeps its real domain in segment 1, so the naming
 * window shifts by one for reference endpoints.
 */
function segmentsFor(type: string, depth: number): string[] {
  const parts = type.split('.');
  const offset = parts[0] === 'ref' ? 1 : 0;
  return parts.slice(offset, offset + depth);
}

function deriveSubcategories(): EndpointSubcategory[] {
  const handled = new Set(
    RESEARCH_ENDPOINT_CATALOG.filter((endpoint) =>
      HAND_WRITTEN_SUBCATEGORIES.some((subcategory) =>
        endpointMatchesSubcategory(endpoint, subcategory),
      ),
    ).map((endpoint) => endpoint.type),
  );

  const remaining = RESEARCH_ENDPOINT_CATALOG.filter(
    (endpoint) => !handled.has(endpoint.type),
  );

  // First pass at two segments, splitting anything oversized one deeper.
  const coarse = new Map<string, EndpointCatalogEntry[]>();
  for (const endpoint of remaining) {
    const key = `${endpoint.mode}|${segmentsFor(endpoint.type, 2).join('.') || endpoint.category}`;
    const bucket = coarse.get(key);
    if (bucket) bucket.push(endpoint);
    else coarse.set(key, [endpoint]);
  }

  const grouped = new Map<string, EndpointCatalogEntry[]>();
  const push = (key: string, endpoint: EndpointCatalogEntry) => {
    const bucket = grouped.get(key);
    if (bucket) bucket.push(endpoint);
    else grouped.set(key, [endpoint]);
  };

  for (const [key, members] of coarse) {
    const depth = members.length > SPLIT_ABOVE ? 3 : 2;
    for (const endpoint of members) {
      push(
        depth === 2
          ? key
          : `${endpoint.mode}|${segmentsFor(endpoint.type, 3).join('.') || endpoint.category}`,
        endpoint,
      );
    }
  }

  // Second pass: fold the stragglers into one bucket per category.
  const final = new Map<string, EndpointCatalogEntry[]>();
  for (const [key, members] of grouped) {
    const target =
      members.length >= MERGE_BELOW
        ? key
        : `${members[0].mode}|${segmentsFor(members[0].type, 1)[0] ?? members[0].category}.more`;
    const bucket = final.get(target);
    if (bucket) bucket.push(...members);
    else final.set(target, [...members]);
  }

  return [...final.entries()].map(([key, members]) => {
    const segments = key.slice(key.indexOf('|') + 1).split('.');
    const label = segments.slice(1).map(humanise).join(' ') || humanise(segments[0]);
    return {
      id: `auto-${key.replace('|', '-').replace(/\./g, '-')}`,
      label: label === 'More' ? `More ${humanise(segments[0])}` : label,
      mode: members[0].mode as EndpointConsoleMode,
      description: `${members.length} ${humanise(segments[0])} endpoints.`,
      patterns: members.map((endpoint) => endpoint.type),
      primaryType: members[0].type,
    };
  });
}

/**
 * The hand-written groupings first, then everything they miss.
 */
export const ENDPOINT_SUBCATEGORIES: EndpointSubcategory[] = [
  ...HAND_WRITTEN_SUBCATEGORIES.map((subcategory) => ({
    ...subcategory,
    curated: true,
  })),
  ...deriveSubcategories(),
];

function matchesPattern(type: string, pattern: string) {
  if (pattern.endsWith('*')) return type.startsWith(pattern.slice(0, -1));
  return type === pattern || type.startsWith(pattern);
}

export function endpointMatchesSubcategory(
  endpoint: EndpointCatalogEntry,
  subcategory: EndpointSubcategory,
) {
  return endpoint.mode === subcategory.mode && subcategory.patterns.some((pattern) => matchesPattern(endpoint.type, pattern));
}

/**
 * Subcategories for a tab.
 *
 * Simple mode shows the hand-written groupings only, which is what makes the
 * pill row readable. Advanced adds every derived grouping, so all 332
 * endpoints stay reachable without ever leaving the screen.
 */
export function getEndpointSubcategories(
  mode: EndpointConsoleMode,
  options?: { advanced?: boolean },
) {
  const advanced = options?.advanced ?? false;
  return ENDPOINT_SUBCATEGORIES.filter(
    (subcategory) =>
      subcategory.mode === mode && (advanced || subcategory.curated === true),
  )
    .map((subcategory) => ({
      ...subcategory,
      count: getEndpointsForSubcategory(subcategory.id).length,
    }))
    .filter((subcategory) => subcategory.count > 0);
}

/** How many extra groupings Advanced would reveal, for the toggle's tooltip. */
export function countAdvancedSubcategories(mode: EndpointConsoleMode) {
  return (
    getEndpointSubcategories(mode, { advanced: true }).length -
    getEndpointSubcategories(mode).length
  );
}

export function getSubcategoryById(id: string | null | undefined) {
  if (!id) return null;
  return ENDPOINT_SUBCATEGORIES.find((subcategory) => subcategory.id === id) ?? null;
}

export function getEndpointsForSubcategory(subcategoryId: string | null | undefined) {
  const subcategory = getSubcategoryById(subcategoryId);
  if (!subcategory) return [];
  return RESEARCH_ENDPOINT_CATALOG.filter((endpoint) =>
    endpointMatchesSubcategory(endpoint, subcategory),
  );
}

export function getEndpointByType(type: string | null | undefined) {
  if (!type) return null;
  const canonicalType = canonicalEndpointType(type);
  if (!canonicalType) return null;
  return RESEARCH_ENDPOINT_CATALOG.find((endpoint) => endpoint.type === canonicalType) ?? null;
}

/**
 * The grouping an endpoint belongs to.
 *
 * Reopening a saved search needs this: the results name their endpoints, but
 * the pill row needs to show the matching subcategory as active, otherwise the
 * snap-to-visible effect treats the selection as stranded. Curated groupings
 * win over derived ones so the pill matches what Simple mode shows.
 */
export function subcategoryForEndpoint(type: string | null | undefined) {
  const endpoint = getEndpointByType(type);
  if (!endpoint) return null;

  const matches = ENDPOINT_SUBCATEGORIES.filter((subcategory) =>
    endpointMatchesSubcategory(endpoint, subcategory),
  );
  if (matches.length === 0) return null;
  return (matches.find((subcategory) => subcategory.curated) ?? matches[0]).id;
}

export function getSmartDefaultEndpointType(subcategoryId: string | null | undefined) {
  const subcategory = getSubcategoryById(subcategoryId);
  if (!subcategory) return null;
  const primaryType = subcategory.primaryType
    ? canonicalEndpointType(subcategory.primaryType)
    : null;
  const preferred = primaryType
    ? getEndpointsForSubcategory(subcategory.id).find(
        (endpoint) => endpoint.type === primaryType,
      )
    : null;
  return preferred?.type ?? getEndpointsForSubcategory(subcategory.id)[0]?.type ?? null;
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function endpointDisplayLabel(type: string) {
  const parts = type.split('.');
  const tail = parts.at(-1) ?? type;
  const previous = parts.at(-2);
  if (['advanced', 'details', 'info', 'live', 'post'].includes(tail) && previous) {
    return titleCase(`${previous} ${tail === 'live' ? '' : tail}`.trim());
  }
  return titleCase(tail);
}

export function defaultInputsForEndpoint(
  endpoint: EndpointCatalogEntry | null,
  defaults?: Partial<Record<'country' | 'language', string>>,
): EndpointInputs {
  if (!endpoint) return {};
  const fields = [...endpoint.required, ...endpoint.optional];
  return Object.fromEntries(
    fields.map((field) => {
      const config = ENDPOINT_FIELD_CONFIGS[field];
      if (field === 'country') return [field, defaults?.country ?? 'US'];
      if (field === 'language') return [field, defaults?.language ?? 'en'];
      return [field, config?.defaultValue ?? ''];
    }),
  );
}

function fieldIsFilled(
  value: EndpointInputValue | undefined,
) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  // A toggle always has a value, so counting it would make an endpoint whose
  // only filled optional is a switch look runnable with no identifier at all.
  if (typeof value === 'boolean') return false;
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'string' && value.trim().length > 0;
}

export function requiredInputsFilled(
  endpoint: EndpointCatalogEntry | null,
  inputs: EndpointInputs,
) {
  if (!endpoint) return false;

  const requiredFilled = endpoint.required.every((field) =>
    fieldIsFilled(inputs[field]),
  );
  if (!requiredFilled) return false;

  // Some provider reference endpoints declare no required params but expose
  // their identifying input as optional. Demand at least one filled value so
  // the Run button cannot submit an empty payload.
  if (endpoint.required.length === 0 && endpoint.optional.length > 0) {
    return endpoint.optional.some((field) => fieldIsFilled(inputs[field]));
  }

  return true;
}

/**
 * Every field any of the selected endpoints needs.
 *
 * Multi-select spans subcategories, so a batch can mix endpoints with
 * different signatures. The form renders the union and a field is required
 * only if at least one selected endpoint requires it.
 */
export function unionEndpointFields(endpoints: EndpointCatalogEntry[]): {
  required: string[];
  optional: string[];
} {
  const required = new Set<string>();
  const optional = new Set<string>();
  for (const endpoint of endpoints) {
    for (const field of endpoint.required) required.add(field);
    for (const field of endpoint.optional) optional.add(field);
  }
  for (const field of required) optional.delete(field);
  return { required: [...required], optional: [...optional] };
}

/** Every selected endpoint must be runnable before the batch can go. */
export function batchInputsFilled(
  endpoints: EndpointCatalogEntry[],
  inputs: EndpointInputs,
) {
  if (endpoints.length === 0) return false;
  return endpoints.every((endpoint) => requiredInputsFilled(endpoint, inputs));
}

/** The first reason a batch cannot run, for the Run button's tooltip. */
export function describeBatchMissingInputs(
  endpoints: EndpointCatalogEntry[],
  inputs: EndpointInputs,
): string | null {
  if (endpoints.length === 0) return 'Pick an endpoint first.';
  for (const endpoint of endpoints) {
    const reason = describeMissingInputs(endpoint, inputs);
    if (reason) {
      return endpoints.length === 1
        ? reason
        : `${endpoint.type.split('.').slice(-2).join('.')}: ${reason}`;
    }
  }
  return null;
}

/**
 * Why the Run button is disabled, for the UI to explain rather than just grey out.
 */
export function describeMissingInputs(
  endpoint: EndpointCatalogEntry | null,
  inputs: EndpointInputs,
): string | null {
  if (!endpoint) return 'Pick an endpoint first.';

  const missing = endpoint.required.filter(
    (field) => !fieldIsFilled(inputs[field]),
  );
  if (missing.length > 0) {
    return `Fill in ${missing.join(', ')}.`;
  }

  if (
    endpoint.required.length === 0 &&
    endpoint.optional.length > 0 &&
    !endpoint.optional.some((field) => fieldIsFilled(inputs[field]))
  ) {
    const choices = endpoint.optional.slice(0, 3).join(', ');
    return `Fill in at least one of: ${choices}${endpoint.optional.length > 3 ? '…' : ''}.`;
  }

  return null;
}

export function payloadFromEndpointInputs(
  endpoint: EndpointCatalogEntry,
  inputs: EndpointInputs,
) {
  return Object.fromEntries(
    Object.entries({ type: endpoint.type, ...inputs }).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'number') return Number.isFinite(value);
      return typeof value === 'string' ? value.trim().length > 0 : value != null;
    }),
  );
}

export function endpointCoverageReport() {
  const orphaned = RESEARCH_ENDPOINT_CATALOG.filter(
    (endpoint) =>
      !ENDPOINT_SUBCATEGORIES.some((subcategory) =>
        endpointMatchesSubcategory(endpoint, subcategory),
      ),
  );
  return {
    total: RESEARCH_ENDPOINT_CATALOG.length,
    orphaned,
  };
}
