/*
 * SPDX-License-Identifier: Apache-2.0
 */

import 'server-only';

import { callDataForSEO } from './clients/dataforseo';
import { estimateEndpointCost } from './cost-table';
import {
  applyEndpointOverrides,
  endpointTimeoutMs,
  getProjectorOverride,
  patchRequestBody,
} from './endpoint-overrides';
import { getEndpointByType } from './endpoints';
import {
  endpointTargetingCompatibility,
  findLocationByCode,
  resolveLanguage,
  resolveLocation,
} from './locations-languages';
import {
  AuthError,
  MissingRequiredParamError,
  RateLimitError,
  ResearchInsufficientCreditsError,
  TransientError,
  UnknownEndpointError,
  UserError,
} from './errors';
import { providerCost, unwrapProviderResult } from './unwrap';

/**
 * `DispatchResearchResult.cost` is always US dollars, because that is what the
 * provider reports and what the UI prints with a dollar sign.
 *
 * The fallback estimate is stored in cents, so convert it before displaying a
 * dollar amount when the provider omits an exact settled cost.
 */
function centsToDollars(cents: number): number {
  return cents / 100;
}
import type {
  BYOKContext,
  DispatchResearchOptions,
  DispatchResearchResult,
  EndpointDef,
  EndpointInput,
  ResearchCallOptions,
  ResultEnvelope,
} from './types';

// Typed errors live in ./errors so pure modules and scripts can import them
// without pulling in `server-only`. Re-exported for existing call sites.
export {
  AuthError,
  MissingRequiredParamError,
  RateLimitError,
  ResearchInsufficientCreditsError,
  TransientError,
  UnknownEndpointError,
  UserError,
};

// Three attempts cover short provider interruptions without making a user
// restart a whole keyword bundle.
const TRANSIENT_RETRY_ATTEMPTS = 3;
const PROJECTOR_VERSION = 'projector-v1';
export async function dispatchResearch(
  options: DispatchResearchOptions,
): Promise<DispatchResearchResult> {
  const generated = getEndpointByType(options.endpointId);
  const endpoint = generated ? applyEndpointOverrides(generated) : undefined;
  if (!endpoint) {
    throw new UnknownEndpointError(options.endpointId);
  }
  const params = normalizeDispatchParams(options.params);

  assertRequiredParams(endpoint, params);
  assertTargetingCompatibility(endpoint, params);

  // Standalone build: no credit ledger. The cost estimate is still computed and
  // returned so the UI can show what a call would have cost upstream, but
  // nothing is reserved, settled, or rolled back.
  const estimate = estimateEndpointCost(options.endpointId, params, { endpoint });
  const estimatedDollars = centsToDollars(estimate.estimatedCents);

  try {
    if (endpoint.stub) {
      return {
        ok: true,
        data: [],
        cost: 0,
        raw: {
          stub: true,
          reason: endpoint.stubReason ?? 'Endpoint is not active yet.',
        },
        projector_version: getProjectorVersion(endpoint),
      } satisfies DispatchResearchResult;
    }

    // Corrections to the generated table live in ./endpoint-overrides so a
    // regeneration of endpoints.ts cannot silently revert them.
    let body = patchRequestBody(endpoint, endpoint.buildBody(params), params);
    let raw: unknown;
    let unwrapped: unknown;

    // The provider call has to sit inside this try, not before it. The client
    // throws for any task status >= 40000, which is exactly where the
    // "Invalid Field" message arrives, so a retry that only wrapped the
    // unwrap could never actually fire.
    try {
      raw = await callProviderWithRetry(endpoint, body, { ...options, params });
      // The generated projectors expect the already-unwrapped result, not the
      // provider's transport envelope. See unwrapProviderResult.
      unwrapped = unwrapProviderResult(raw, endpoint);
    } catch (error) {
      // The generated bodies send a fixed field set per endpoint family, but a
      // few members of a generated family can reject a field the rest accept.
      // Take the provider at its word: it names the offending field, so drop it
      // and retry once rather than repeating a request with the same payload.
      const offending = invalidFieldFromError(error);
      const retryBody = offending ? stripBodyField(body, offending) : null;

      if (!retryBody) throw error;

      body = retryBody;
      raw = await callProviderWithRetry(endpoint, body, { ...options, params });
      unwrapped = unwrapProviderResult(raw, endpoint);
    }

    const override = getProjectorOverride(endpoint.type);
    const projected = override
      ? override(unwrapped, endpoint.type, params)
      : endpoint.project(unwrapped, endpoint.type, params);

    return {
      ok: true,
      data: projected,
      cost: providerCost(raw) ?? estimatedDollars,
      raw,
      projector_version: getProjectorVersion(endpoint),
    };
  } catch (error) {
    throw normalizeProviderError(error);
  }
}



/**
 * DataForSEO reports a rejected parameter as `Invalid Field: 'language_name'.`
 * Pull the name back out so the request can be retried without it.
 */
function invalidFieldFromError(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  const match = /invalid field:\s*'([^']+)'/i.exec(message);
  return match ? match[1] : null;
}

/**
 * Remove a field the provider rejected, along with its siblings.
 *
 * `language_name` and `language_code` are alternative spellings of the same
 * targeting concept, so dropping only the one named would just trigger the
 * same rejection on the next call.
 */
function stripBodyField(body: unknown, field: string): Record<string, unknown> | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return null;
  }

  // Only the language family is dropped. Retrying without `location_*` would
  // succeed and return United States data for a user who asked for Germany,
  // labelled as if it were theirs. A wrong answer is worse than an error, so
  // a rejected location fails loudly instead.
  if (field.startsWith('location_')) return null;
  const family = field.startsWith('language_') ? 'language_' : null;

  const next = Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(([key]) =>
      family ? !key.startsWith(family) : key !== field,
    ),
  );

  // Nothing was actually removed, so a retry would repeat the same failure.
  if (Object.keys(next).length === Object.keys(body as object).length) {
    return null;
  }
  return next;
}

function normalizeDispatchParams(params: EndpointInput): EndpointInput {
  const normalized = { ...params };

  const country = readString(params.country);
  const location = country ? lookupDfsLocation(country) : null;
  if (location) {
    normalized.country = location.name;
    normalized.country_iso_code ??= location.iso;
    normalized.location_code ??= location.code;
    normalized.location_name ??= location.name;
  }

  const language = readString(params.language);
  const languageInfo = language ? lookupDfsLanguage(language) : null;
  if (languageInfo) {
    normalized.language = languageInfo.name;
    normalized.language_code ??= languageInfo.code;
    normalized.language_name ??= languageInfo.name;
  }

  return normalized;
}

// Both resolvers accept either form the UI or a saved session might hold: an
// ISO code or a DataForSEO name for a location, a language code or an English
// language name. The catalog behind them is generated from DataForSEO's own
// free locations endpoint; see `locations-languages.ts`.
function lookupDfsLocation(input: string) {
  return resolveLocation(input);
}

function lookupDfsLanguage(input: string) {
  return resolveLanguage(input);
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function assertTargetingCompatibility(
  endpoint: EndpointDef,
  params: EndpointInput,
): void {
  const location =
    resolveLocation(
      readString(params.country_iso_code) ??
        readString(params.country) ??
        readString(params.location_name),
    ) ?? findLocationByCode(readNumber(params.location_code));
  const language = resolveLanguage(
    readString(params.language_code) ??
      readString(params.language) ??
      readString(params.language_name),
  );
  const compatibility = endpointTargetingCompatibility(
    endpoint,
    location?.iso,
    language?.code,
  );
  if (!compatibility.supported) {
    throw new UserError(
      compatibility.reason ?? 'This endpoint does not support the selected target.',
    );
  }
}

export async function callEndpoint(
  opts: ResearchCallOptions,
): Promise<ResultEnvelope> {
  const result = await dispatchResearch({
    endpointId: opts.type,
    params: opts.input,
    billingMode: opts.billingMode,
    byok: {
      userId: opts.credentials.userId ?? opts.userId,
      dataforseo: opts.credentials.dataforseoCredentials?.[0],
    },
    sandbox: opts.sandbox,
    timeoutMs: opts.timeoutMs,
    requestId: opts.requestId,
    reservationId: opts.reservationId,
  });

  return {
    success: result.ok,
    type: opts.type,
    count: Array.isArray(result.data) ? result.data.length : 1,
    results: result.data,
    cost: result.cost,
    meta: {
      projector_version: result.projector_version,
    },
  };
}

async function callProviderWithRetry(
  endpoint: EndpointDef,
  body: unknown,
  options: DispatchResearchOptions,
): Promise<unknown> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= TRANSIENT_RETRY_ATTEMPTS; attempt++) {
    try {
      return await callDataForSEO({
        credentials: getDataForSEOCredentials(options),
        endpoint,
        body,
        input: options.params,
        sandbox: options.sandbox,
        // Large Labs row counts and Lighthouse runs outlive the 60 s default.
        timeoutMs: options.timeoutMs ?? endpointTimeoutMs(endpoint.type),
        requestId: options.requestId,
      });
    } catch (error) {
      lastError = error;
      if (!(normalizeProviderError(error) instanceof TransientError) || attempt === TRANSIENT_RETRY_ATTEMPTS) {
        break;
      }
      await sleep(jitteredBackoffMs(attempt));
    }
  }

  throw lastError;
}

function assertRequiredParams(endpoint: EndpointDef, params: Record<string, unknown>): void {
  for (const param of endpoint.required) {
    const value = params[param];
    const missing =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0);

    if (missing) {
      throw new MissingRequiredParamError(endpoint.type, param);
    }
  }
}

function getDataForSEOCredentials(
  options: DispatchResearchOptions,
): NonNullable<BYOKContext['dataforseoCredentials']> {
  const headerCredentials = options.byok?.dataforseo;
  if (headerCredentials?.login && headerCredentials.password) {
    return [headerCredentials];
  }

  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    return [];
  }
  return [{ login, password }];
}

function getProjectorVersion(endpoint: EndpointDef): string {
  const localEndpoint = endpoint as EndpointDef & {
    projectorVersion?: string;
  };
  return localEndpoint.projectorVersion ?? PROJECTOR_VERSION;
}

function normalizeProviderError(error: unknown): Error {
  if (
    error instanceof AuthError ||
    error instanceof RateLimitError ||
    error instanceof TransientError ||
    error instanceof UserError
  ) {
    return error;
  }

  const status = readHttpStatus(error);
  const providerStatus = readProviderStatus(error);
  const message = error instanceof Error ? error.message : String(error);
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes('credentials are required') ||
    normalizedMessage.includes('api key is required') ||
    normalizedMessage.includes('missing credentials')
  ) {
    return new AuthError(message);
  }

  if (status === 401 || status === 403) {
    return new AuthError(message);
  }

  if (status === 429 || providerStatus === 40202 || providerStatus === 40209) {
    return new RateLimitError(message);
  }

  if (status >= 500 && status <= 599) {
    return new TransientError(message);
  }

  if (status >= 400 && status <= 499) {
    return new UserError(message);
  }

  if (providerStatus >= 50000 && providerStatus <= 59999) {
    return new TransientError(message);
  }

  if (providerStatus === 40100 || providerStatus === 40207) {
    return new AuthError(message);
  }

  if (providerStatus >= 40000 && providerStatus <= 49999) {
    return new UserError(message);
  }

  return error instanceof Error ? error : new Error(message);
}

function readHttpStatus(error: unknown): number {
  if (!error || typeof error !== 'object') {
    return 0;
  }

  const record = error as {
    httpStatus?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };
  const value = record.httpStatus ?? record.status ?? record.statusCode;
  return typeof value === 'number' ? value : 0;
}

function readProviderStatus(error: unknown): number {
  if (!error || typeof error !== 'object') {
    return 0;
  }

  const value = (error as { statusCode?: unknown }).statusCode;
  return typeof value === 'number' ? value : 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitteredBackoffMs(attempt: number): number {
  return 25 * 2 ** (attempt - 1) + Math.floor(Math.random() * 10);
}
