/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiError } from '@/lib/api/errors';
import { createRequestContext } from '@/lib/api/request-context';
import {
  BYOK_KEYS_REQUIRED_CODE,
  ByokKeysRequiredError,
} from '@/lib/byok-guard';
import { getDataForSeoCredentials } from '@/lib/get-effective-credentials';
import type { Logger } from '@/lib/logger';
import { dispatchResearch } from '@/lib/research/dispatcher';
import { getEndpointByType } from '@/lib/research/endpoints';
import {
  acquireIdempotencyLock,
  getCachedResponse,
  releaseIdempotencyLock,
  setCachedResponse,
} from '@/lib/research/idempotency';
import { isKeywordProEndpoint } from '@/lib/research/keyword-pro-boundary';
import type { EndpointProvider, ResearchByokInput } from '@/lib/research/types';
import { getSession } from '@/lib/server';
import { z } from 'zod';

export const maxDuration = 300;

const researchRunSchema = z.object({
  endpointId: z.string().min(1),
  params: z.record(z.string(), z.unknown()),
  sandbox: z.boolean().optional(),
  stream: z.boolean().optional(),
});

export async function POST(request: Request): Promise<Response> {
  const startedAt = Date.now();
  const { requestId, log } = createRequestContext(request);

  try {
    const parsed = researchRunSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonWithRequestId(
        {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid research run request.',
            issues: parsed.error.issues,
          },
        },
        400,
        requestId,
      );
    }

    const idempotencyKey = readIdempotencyKey(request);
    if (idempotencyKey instanceof ApiError) {
      return jsonWithRequestId(
        {
          ok: false,
          error: {
            code: idempotencyKey.code,
            message: idempotencyKey.message,
          },
        },
        idempotencyKey.statusCode,
        requestId,
      );
    }

    if (!isKeywordProEndpoint(parsed.data.endpointId)) {
      return jsonWithRequestId(
        {
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'This endpoint is not available in Keyword Pro.',
          },
        },
        404,
        requestId,
      );
    }

    const idempotencyFingerprint = idempotencyKey
      ? fingerprintResearchRun(parsed.data)
      : undefined;
    const caller = await resolveCaller(request);
    const endpoint = getEndpointByType(parsed.data.endpointId) as {
      api?: EndpointProvider;
      longRunning?: boolean;
      stream?: boolean;
    } | null;

    if (caller.userId && idempotencyKey) {
      const cached = await getCachedResponse({
        userId: caller.userId,
        endpointId: parsed.data.endpointId,
        key: idempotencyKey,
      }, idempotencyFingerprint);
      if (cached) {
        log.info('Research run idempotent replay', {
          event: 'api.v1.research.run.idempotent',
          requestId,
          endpointId: parsed.data.endpointId,
          userId: caller.userId,
          duration: Date.now() - startedAt,
        });
        return jsonWithRequestId(cached, 200, requestId);
      }
    }

    const idempotencyLock = caller.userId && idempotencyKey
      ? {
          endpointId: parsed.data.endpointId,
          key: idempotencyKey,
          token: crypto.randomUUID(),
          userId: caller.userId,
        }
      : null;
    if (idempotencyLock) {
      const locked = await acquireIdempotencyLock(idempotencyLock, idempotencyLock.token);
      if (!locked) {
        return jsonWithRequestId(
          {
            ok: false,
            error: {
              code: 'IDEMPOTENCY_IN_PROGRESS',
              message: 'A matching research run is already in progress.',
            },
          },
          409,
          requestId,
        );
      }
    }

    try {
      const { billingMode, byok } = await resolveByokForRequest({
        endpointId: parsed.data.endpointId,
        isApiKeyAuth: caller.isApiKeyAuth,
        log,
        provider: endpoint?.api,
        request,
        requestId,
        userId: caller.userId,
      });
      const shouldStream = Boolean(
        parsed.data.stream && (endpoint?.longRunning || endpoint?.stream),
      );

      const run = async () =>
        dispatchResearch({
          endpointId: parsed.data.endpointId,
          params: parsed.data.params,
          billingMode,
          byok,
          sandbox: parsed.data.sandbox,
          requestId,
        });

      if (shouldStream) {
        const result = await run();
        logResearchRun(log, parsed.data.endpointId, result.cost, startedAt, requestId);
        if (result.ok && caller.userId && idempotencyKey) {
          await setCachedResponse(
            {
              userId: caller.userId,
              endpointId: parsed.data.endpointId,
              key: idempotencyKey,
            },
            result,
            idempotencyFingerprint,
          );
        }
        return sseFinalResponse(result, requestId);
      }

      const result = await run();
      logResearchRun(log, parsed.data.endpointId, result.cost, startedAt, requestId);

      if (result.ok && caller.userId && idempotencyKey) {
        await setCachedResponse(
          {
            userId: caller.userId,
            endpointId: parsed.data.endpointId,
            key: idempotencyKey,
          },
          result,
          idempotencyFingerprint,
        );
      }

      return jsonWithRequestId(result, 200, requestId);
    } finally {
      if (idempotencyLock) {
        await releaseIdempotencyLock(idempotencyLock, idempotencyLock.token);
      }
    }
  } catch (error) {
    const byokError = byokKeysRequiredResponse(error, requestId);
    if (byokError) return byokError;

    log.catch('Research run failed', error, {
      event: 'api.v1.research.run.error',
      requestId,
      duration: Date.now() - startedAt,
    });
    const status = statusForError(error);
    return jsonWithRequestId(
      {
        ok: false,
        error: {
          code: errorCodeFor(error),
          message: errorMessageFor(error, status),
        },
      },
      status,
      requestId,
    );
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function readIdempotencyKey(request: Request): string | undefined | ApiError {
  const key = request.headers.get('idempotency-key')?.trim();
  if (!key) return undefined;
  if (key.length > 128) {
    return new ApiError(
      'VALIDATION_ERROR',
      'Idempotency-Key must be 128 characters or fewer.',
      400,
    );
  }
  return key;
}

function fingerprintResearchRun(input: z.infer<typeof researchRunSchema>): string {
  return stableStringify({
    endpointId: input.endpointId,
    params: input.params,
    sandbox: Boolean(input.sandbox),
  });
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

async function resolveCaller(
  _request: Request,
): Promise<{ userId?: string; isApiKeyAuth: boolean }> {
  // Standalone build: no API-key issuance, so the only caller is the local
  // session. The isApiKeyAuth flag is kept because the header-BYOK override
  // below is still gated on it.
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    throw new ApiError('INVALID_API_KEY', 'Authentication required.', 401);
  }

  const { enforceUserRateLimit } = await import('@/lib/api/rate-limit');
  await enforceUserRateLimit(userId);
  return { isApiKeyAuth: false, userId };
}

function readByokHeaders(
  request: Request,
  userId: string | undefined,
  isApiKeyAuth: boolean,
): ResearchByokInput {
  const allowHeaderByok = process.env.RESEARCH_ALLOW_HEADER_BYOK === 'true';
  if (!allowHeaderByok || !isApiKeyAuth) {
    return { userId };
  }

  const dfsLogin = request.headers.get('x-dfs-login')?.trim();
  const dfsPassword = request.headers.get('x-dfs-pw')?.trim();

  return {
    dataforseo:
      dfsLogin && dfsPassword
        ? { login: dfsLogin, password: dfsPassword }
        : undefined,
    userId,
  };
}

async function resolveByokForRequest(options: {
  endpointId: string;
  isApiKeyAuth: boolean;
  log: Logger;
  provider: EndpointProvider | undefined;
  request: Request;
  requestId: string;
  userId: string | undefined;
}): Promise<{
  billingMode: 'platform' | 'byok';
  byok: ResearchByokInput;
}> {
  const {
    endpointId,
    isApiKeyAuth,
    log,
    provider,
    request,
    requestId,
    userId,
  } = options;
  const headerByok = readByokHeaders(request, userId, isApiKeyAuth);
  const hasHeaderOverride = hasProviderHeaderOverride(headerByok, provider);

  if (!userId || !provider) {
    if (provider) {
      logByokResolved(log, {
        endpointId,
        provider,
        requestId,
        source: hasHeaderOverride ? 'header' : 'env',
        userId,
      });
    }
    return {
      billingMode: hasHeaderOverride ? 'byok' : 'platform',
      byok: headerByok,
    };
  }

  if (headerByok.dataforseo?.login && headerByok.dataforseo.password) {
    logByokResolved(log, {
      endpointId,
      provider,
      requestId,
      source: 'header',
      userId,
    });
    return { billingMode: 'byok', byok: headerByok };
  }

  const credentials = await getDataForSeoCredentials(userId);
  const byok = {
    ...headerByok,
    dataforseo: credentials ?? undefined,
  };
  logByokResolved(log, {
    endpointId,
    provider,
    requestId,
    source: 'session-byok',
    userId,
  });
  return { billingMode: 'byok', byok };
}

function hasProviderHeaderOverride(
  byok: ResearchByokInput,
  provider: EndpointProvider | undefined,
): boolean {
  if (provider === 'dataforseo') {
    return Boolean(byok.dataforseo?.login && byok.dataforseo.password);
  }
  return false;
}

function logByokResolved(
  log: Logger,
  event: {
    endpointId: string;
    provider: EndpointProvider;
    requestId: string;
    source: 'header' | 'session-byok' | 'env';
    userId?: string;
  },
): void {
  log.info('BYOK key resolved', {
    event: 'byok.resolved',
    requestId: event.requestId,
    userId: event.userId,
    provider: event.provider,
    source: event.source,
    endpointId: event.endpointId,
  });
}

function byokKeysRequiredResponse(
  error: unknown,
  requestId: string,
): Response | null {
  if (!(error instanceof ByokKeysRequiredError)) {
    return null;
  }

  return jsonWithRequestId(
    {
      ok: false,
      error: {
        code: BYOK_KEYS_REQUIRED_CODE,
        provider: error.provider,
        missing: error.missing,
        message: error.message,
      },
    },
    400,
    requestId,
  );
}

function logResearchRun(
  log: Logger,
  endpointId: string,
  cost: number,
  startedAt: number,
  requestId: string,
): void {
  log.info('Research run completed', {
    event: 'api.v1.research.run',
    requestId,
    endpointId,
    cost,
    duration: Date.now() - startedAt,
  });
}

function sseFinalResponse(payload: unknown, requestId: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(`event: final\ndata: ${JSON.stringify(payload)}\n\n`),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'cache-control': 'no-cache',
      'content-type': 'text/event-stream; charset=utf-8',
      'x-request-id': requestId,
    },
  });
}

function jsonWithRequestId(
  payload: unknown,
  status: number,
  requestId: string,
): Response {
  return Response.json(payload, {
    headers: { 'x-request-id': requestId },
    status,
  });
}

function errorCodeFor(error: unknown): string {
  if (error instanceof ApiError) return error.code;
  if (error instanceof Error) return error.name;
  return 'INTERNAL_ERROR';
}

function errorMessageFor(error: unknown, status: number): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.name === 'TransientError') {
    // Keep the provider's own words: "DataForSEO 50000: Internal Error" and
    // "did not answer within 120 s" need different fixes, and a bundle's
    // RunReport is the only place the user ever sees this.
    const detail = error.message.replace(/^Provider temporarily unavailable\.?\s*/i, '').trim();
    return detail ? `Provider temporarily unavailable: ${detail}` : 'Provider temporarily unavailable';
  }
  if (status >= 500) return 'Research run failed.';
  if (error instanceof Error) return error.message;
  return 'Research run failed.';
}

function statusForError(error: unknown): number {
  if (error instanceof ApiError) {
    return error.statusCode;
  }

  if (!error || typeof error !== 'object') {
    return 500;
  }

  const name = error instanceof Error ? error.name : '';
  if (name === 'AuthError') {
    return 401;
  }
  if (name === 'RateLimitError') {
    return 429;
  }
  if (
    name === 'UserError' ||
    name === 'MissingRequiredParamError' ||
    name === 'UnknownEndpointError'
  ) {
    return 400;
  }
  if (name === 'ResearchInsufficientCreditsError') {
    return 402;
  }
  return 500;
}
