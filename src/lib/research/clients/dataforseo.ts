/*
 * SPDX-License-Identifier: Apache-2.0
 */

import 'server-only';

import { Buffer } from 'node:buffer';
import { logger as appLogger } from '@/lib/logger';
import { TransientError } from '../errors';
import type { EndpointDef, EndpointInput } from '../types';

const DATAFORSEO_HOST = 'https://api.dataforseo.com';
const DATAFORSEO_SANDBOX_HOST = 'https://sandbox.dataforseo.com';
const DEFAULT_TIMEOUT_MS = 60_000;
const RATE_LIMIT_STATUS_CODES = new Set([40202, 40209]);

export type DataForSEOClientCredentials = {
  login: string;
  password: string;
};

export type ResearchProviderLogEvent = {
  provider: 'dataforseo';
  type: string;
  ok: boolean;
  duration_ms: number;
  cost?: number;
  http_status?: number;
  status_code?: number;
  error_class?: string;
  request_id?: string;
  credential_index: number;
  attempt: number;
};

export type DataForSEOClientOptions = {
  credentials: DataForSEOClientCredentials[];
  endpoint: EndpointDef;
  body: unknown;
  input: EndpointInput;
  sandbox?: boolean;
  timeoutMs?: number;
  requestId?: string;
  logger?: (event: ResearchProviderLogEvent) => void;
};

export class DataForSEOError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly statusMessage: string,
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = 'DataForSEOError';
  }
}

export async function callDataForSEO(
  options: DataForSEOClientOptions,
): Promise<unknown> {
  const {
    credentials,
    endpoint,
    body,
    input,
    sandbox = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    requestId,
  } = options;

  if (credentials.length === 0) {
    throw new DataForSEOError(
      'DataForSEO credentials are required.',
      0,
      'Missing credentials',
      0,
    );
  }

  const url = new URL(getDataForSEOPath(endpoint, input), sandbox ? DATAFORSEO_SANDBOX_HOST : DATAFORSEO_HOST);
  const method = endpoint.method;
  let lastError: unknown = null;
  const maxAttempts = Math.min(credentials.length, 3);

  for (let credentialIndex = 0; credentialIndex < maxAttempts; credentialIndex++) {
    const startedAt = Date.now();
    const credential = credentials[credentialIndex];
    const attempt = credentialIndex + 1;

    try {
      const response = await fetchWithTimeout(url, {
        method,
        headers: {
          Authorization: buildBasicAuth(credential),
          'Content-Type': 'application/json',
        },
        body: method === 'GET' ? undefined : JSON.stringify([body]),
      }, timeoutMs);

      const durationMs = Date.now() - startedAt;

      if (response.status === 429 && credentialIndex < maxAttempts - 1) {
        emitProviderEvent(options, {
          provider: 'dataforseo',
          type: endpoint.type,
          ok: false,
          duration_ms: durationMs,
          http_status: response.status,
          error_class: 'RateLimit',
          request_id: requestId,
          credential_index: credentialIndex,
          attempt,
        });
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new DataForSEOError(
          `DataForSEO HTTP ${response.status}: ${errorBody.slice(0, 200)}`,
          0,
          response.statusText || 'HTTP error',
          response.status,
        );
      }

      const json = await response.json() as Record<string, unknown>;
      const task = getFirstTask(json);
      const statusCode = Number(task?.status_code ?? json.status_code ?? 0);
      const statusMessage = String(task?.status_message ?? json.status_message ?? '');

      if (RATE_LIMIT_STATUS_CODES.has(statusCode) && credentialIndex < maxAttempts - 1) {
        emitProviderEvent(options, {
          provider: 'dataforseo',
          type: endpoint.type,
          ok: false,
          duration_ms: durationMs,
          cost: readCost(json),
          http_status: response.status,
          status_code: statusCode,
          error_class: 'RateLimit',
          request_id: requestId,
          credential_index: credentialIndex,
          attempt,
        });
        continue;
      }

      if (statusCode >= 40000) {
        throw new DataForSEOError(
          `DataForSEO ${statusCode}: ${statusMessage}`,
          statusCode,
          statusMessage,
          response.status,
        );
      }

      emitProviderEvent(options, {
        provider: 'dataforseo',
        type: endpoint.type,
        ok: true,
        duration_ms: durationMs,
        cost: readCost(json),
        http_status: response.status,
        status_code: statusCode || undefined,
        request_id: requestId,
        credential_index: credentialIndex,
        attempt,
      });

      return json;
    } catch (caught) {
      // An aborted fetch is our own timer firing, not the provider refusing:
      // say so, and let the dispatcher retry it as transient.
      const error =
        caught instanceof Error && caught.name === 'AbortError'
          ? new TransientError(
              `DataForSEO did not answer ${endpoint.endpoint} within ${Math.round(timeoutMs / 1000)} s`,
            )
          : caught;
      lastError = error;
      emitProviderEvent(options, {
        provider: 'dataforseo',
        type: endpoint.type,
        ok: false,
        duration_ms: Date.now() - startedAt,
        http_status: error instanceof DataForSEOError ? error.httpStatus : undefined,
        status_code: error instanceof DataForSEOError ? error.statusCode : undefined,
        error_class: error instanceof Error ? error.name : 'UnknownError',
        request_id: requestId,
        credential_index: credentialIndex,
        attempt,
      });
      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new DataForSEOError('DataForSEO request failed.', 0, 'Unknown error', 0);
}

/**
 * Build the request path, substituting any `{param}` placeholder from the
 * endpoint input.
 *
 * 108 endpoints declare `urlSuffix: '/{task_id}'`. Without substitution the
 * literal brace text is URL-encoded and the request 404s as
 * `/v3/on_page/summary/%7Btask_id%7D`.
 */
function getDataForSEOPath(endpoint: EndpointDef, input: EndpointInput): string {
  const base = endpoint.urlSuffix.startsWith('/v3/')
    ? endpoint.urlSuffix
    : (() => {
        const suffix = endpoint.urlSuffix ? endpoint.urlSuffix.replace(/^\/+/, '') : '';
        const path = endpoint.endpoint.replace(/^\/+/, '');
        return `/v3/${[path, suffix].filter(Boolean).join('/')}`;
      })();

  return interpolatePathParams(base, input, endpoint.type);
}

function interpolatePathParams(
  path: string,
  input: EndpointInput,
  type: string,
): string {
  return path.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name: string) => {
    const value = (input as Record<string, unknown>)[name];
    if (value === undefined || value === null || value === '') {
      throw new DataForSEOError(
        `Missing "${name}" for ${type}. It is part of the request path.`,
        0,
        'Missing path parameter',
        0,
      );
    }
    return encodeURIComponent(String(value));
  });
}

function buildBasicAuth(credentials: DataForSEOClientCredentials): string {
  return `Basic ${Buffer.from(`${credentials.login}:${credentials.password}`).toString('base64')}`;
}

async function fetchWithTimeout(
  url: URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function getFirstTask(json: Record<string, unknown>): Record<string, unknown> | null {
  const tasks = json.tasks;
  if (!Array.isArray(tasks)) {
    return null;
  }
  const [task] = tasks;
  return isRecord(task) ? task : null;
}

function readCost(json: Record<string, unknown>): number | undefined {
  const cost = json.cost;
  if (typeof cost === 'number') {
    return cost;
  }

  const task = getFirstTask(json);
  if (typeof task?.cost === 'number') {
    return task.cost;
  }

  return undefined;
}

function emitProviderEvent(
  options: DataForSEOClientOptions,
  event: ResearchProviderLogEvent,
): void {
  options.logger?.(event);
  appLogger.info('Research provider call', {
    event: 'research.provider.call',
    provider: event.provider,
    type: event.type,
    success: event.ok,
    duration_ms: event.duration_ms,
    cost: event.cost,
    http_status: event.http_status,
    status_code: event.status_code,
    error_class: event.error_class,
    requestId: event.request_id,
    credentialIndex: event.credential_index,
    attempt: event.attempt,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
