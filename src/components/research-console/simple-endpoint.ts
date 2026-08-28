import {
  endpointDisplayLabel,
  ENDPOINT_FIELD_CONFIGS,
  type EndpointCatalogEntry,
  type EndpointInputValue,
} from '@/lib/research/endpoint-catalog';

function parseTarget(value: string): { target: string; url: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
    const hostname = parsed.hostname.toLowerCase();
    if (!hostname.includes('.')) return null;
    return {
      target: hostname.replace(/^www\./, ''),
      url: parsed.toString(),
    };
  } catch {
    return null;
  }
}

/**
 * Build a map from endpoint.type to unique display label. When two endpoints in
 * the same list collapse to the same base label (e.g. three "Search Volume"
 * endpoints for Google Ads / Bing / Yandex), the provider segment is prepended.
 */
export function buildUniqueLabels(types: string[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const t of types) {
    const base = endpointDisplayLabel(t);
    counts.set(base, (counts.get(base) ?? 0) + 1);
  }
  const map = new Map<string, string>();
  for (const t of types) {
    const base = endpointDisplayLabel(t);
    if ((counts.get(base) ?? 0) <= 1) {
      map.set(t, base);
      continue;
    }
    const parts = t.split('.');
    const provider = parts[1] ?? parts[0] ?? '';
    const providerLabel = provider
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (m) => m.toUpperCase());
    map.set(t, providerLabel ? `${providerLabel} · ${base}` : base);
  }
  return map;
}

/**
 * Fields that the user can naturally type into the chat textarea: single-line,
 * free-form text that doesn't need a separate form input.
 */
const SIMPLE_FIELD_NAMES = new Set([
  'channel_id',
  'comment_id',
  'artist_id',
  'company_id',
  'handle',
  'hashtag',
  'keyword',
  'keywords',
  'owner',
  'pages',
  'post_id',
  'product_id',
  'prompt',
  'query',
  'region',
  'repo',
  'seller_id',
  'song_id',
  'subreddit',
  'target',
  'targets',
  'task_id',
  'track_id',
  'tweet_id',
  'url',
  'user_id',
  'username',
  'video_id',
]);

export const CHAT_CONTEXT_FIELD_NAMES = new Set(['country', 'language']);

/**
 * Returns the single primary field name if the endpoint has exactly one required
 * field that is a simple free-text input (otherwise null. Used to decide whether
 * the chat textarea should act as that field's input (collapsing the Parameters
 * box) or whether the Parameters box should render its own form.
 */
export function getSimpleEndpointField(
  endpoint: EndpointCatalogEntry | null,
  ignoredFields: ReadonlySet<string> = CHAT_CONTEXT_FIELD_NAMES,
): string | null {
  return getSimpleEndpointFields(endpoint, ignoredFields)?.field ?? null;
}

/**
 * The chat-typeable field(s) of one endpoint.
 *
 * An endpoint qualifies when everything it requires (locale aside) belongs to
 * a single family of chat-typeable fields. `target` alone qualifies; so does
 * `url` with `target`, because both describe the one site the user pasted.
 * `covered` lists every field the textarea must write, `field` the one whose
 * placeholder it shows.
 */
export function getSimpleEndpointFields(
  endpoint: EndpointCatalogEntry | null,
  ignoredFields: ReadonlySet<string> = CHAT_CONTEXT_FIELD_NAMES,
): { field: string; covered: string[] } | null {
  if (!endpoint) return null;
  const required = endpoint.required
    .filter(
      (field) =>
        !ignoredFields.has(field) &&
        ENDPOINT_FIELD_CONFIGS[field]?.input !== 'hidden',
    );
  const fields = [...new Set(required)];
  if (fields.length === 0) return null;
  for (const field of fields) {
    const config = ENDPOINT_FIELD_CONFIGS[field];
    if (!config) return null;
    if (config.input !== 'text' && config.input !== 'textarea' && config.input !== 'chips') {
      return null;
    }
    if (!SIMPLE_FIELD_NAMES.has(field)) return null;
  }
  const family = familyOf(fields[0]);
  if (fields.some((field) => familyOf(field) !== family)) return null;
  return { field: fields.includes(family) ? family : fields[0], covered: fields };
}

/**
 * Fields that ask the same question in singular and plural.
 *
 * `related_keywords` wants `keyword: "seo tools"` while its three neighbours
 * in the same grouping want `keywords: ["seo tools"]`. To the person typing,
 * that is one input, so the composer treats them as one field and writes
 * whichever shape each endpoint expects.
 *
 * `page`/`pages` stay separate: `pages` means "at least two things to
 * compare". `target`/`targets` used to be kept apart for the same reason,
 * `target`/`targets` stay in one family because some keyword and SERP
 * endpoints express the same domain input in singular and plural forms.
 */
const SIMPLE_FIELD_FAMILIES: Record<string, string> = {
  keyword: 'keyword',
  keywords: 'keyword',
  // Domain-oriented keyword and SERP endpoints vary between a full URL,
  // hostname, or list of hostnames for the same input.
  url: 'target',
  target: 'target',
  domain: 'target',
  targets: 'target',
};

function familyOf(field: string): string {
  return SIMPLE_FIELD_FAMILIES[field] ?? field;
}

/**
 * The one field the chat textarea should own for the whole selection, or null
 * when the endpoints disagree and the parameter form has to ask explicitly.
 *
 * This exists because the composer and the parameter form were deciding it
 * separately with different rules: the composer looked only at the endpoint
 * driving the form, while the form bailed out whenever more than one endpoint
 * was ticked. With four keyword endpoints selected both rendered the keyword
 * input, so the same value appeared twice on screen.
 */
export function getBatchSimpleField(
  endpoints: EndpointCatalogEntry[],
  ignoredFields: ReadonlySet<string> = CHAT_CONTEXT_FIELD_NAMES,
): { field: string; covered: string[] } | null {
  if (endpoints.length === 0) return null;

  const fields: string[] = [];
  for (const endpoint of endpoints) {
    const simple = getSimpleEndpointFields(endpoint, ignoredFields);
    if (!simple) return null;
    fields.push(...simple.covered);
  }

  const family = familyOf(fields[0]);
  if (fields.some((field) => familyOf(field) !== family)) return null;

  const covered = [...new Set(fields)];
  // The placeholder comes from the singular form when both are present, since
  // it reads better: "Type a keyword" rather than "Type keywords".
  const field = covered.includes(family) ? family : covered[0];
  return { field, covered };
}

export function simpleFieldPlaceholder(field: string | null): string | null {
  if (!field) return null;
  return ENDPOINT_FIELD_CONFIGS[field]?.placeholder ?? null;
}

/**
 * Parse the chat textarea string into the correct state shape for a simple field:
 * arrays for chips, plain string otherwise.
 */
export function parseSimpleFieldValue(
  field: string,
  rawValue: string,
): EndpointInputValue {
  // One pasted site, or a comma-separated few, shaped for whichever field the
  // selected keyword endpoint expects.
  if (familyOf(field) === 'target') {
    const sites = rawValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const parsed = sites.map((site) => parseTarget(site));
    if (field === 'targets') {
      return parsed.map((entry, index) => entry?.target ?? sites[index]);
    }
    const first = parsed[0];
    if (field === 'url') return first?.url ?? rawValue.trim();
    return first?.target ?? rawValue.trim();
  }
  const config = ENDPOINT_FIELD_CONFIGS[field];
  if (config?.input === 'chips') {
    return rawValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return rawValue;
}

/**
 * Format a stored simple-field value back into the textarea string:
 * arrays join with ", " (matches the ParameterForm convention).
 */
export function formatSimpleFieldValue(
  value: EndpointInputValue | undefined,
): string {
  if (Array.isArray(value)) return value.join(', ');
  return value == null ? '' : String(value);
}
