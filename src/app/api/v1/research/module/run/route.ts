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
import { getEndpointByType } from '@/lib/research/endpoints';
import {
  acquireIdempotencyLock,
  getCachedResponse,
  releaseIdempotencyLock,
  setCachedResponse,
} from '@/lib/research/idempotency';
import { isKeywordProModule } from '@/lib/research/keyword-pro-boundary';
import { getResearchModule } from '@/lib/research/modules/registry';
import {
  UnknownResearchModuleError,
  runResearchModule,
} from '@/lib/research/modules/runner';
import type { EndpointProvider, ResearchByokInput } from '@/lib/research/types';
import { getSession } from '@/lib/server';
import { z } from 'zod';

export const maxDuration = 300;

const moduleRunSchema = z.object({
  idempotencyKey: z.string().max(128).optional(),
  input: z.record(z.string(), z.unknown()),
  moduleId: z.string().min(1),
  sandbox: z.boolean().optional(),
});

export async function POST(request: Request): Promise<Response> {
  const startedAt = Date.now();
  const { requestId, log } = createRequestContext(request);

  try {
    const parsed = moduleRunSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonWithRequestId(
        {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            issues: parsed.error.issues,
            message: 'Invalid research module run request.',
          },
        },
        400,
        requestId,
      );
    }

    const moduleDef = getResearchModule(parsed.data.moduleId);
    if (!moduleDef || !isKeywordProModule(moduleDef.id)) {
      return jsonWithRequestId(
        {
          ok: false,
          error: {
            code: 'MODULE_NOT_FOUND',
            message: 'This module is not available in Keyword Pro.',
          },
        },
        404,
        requestId,
      );
    }

    const caller = await resolveCaller(request);
    const idempotencyFingerprint = parsed.data.idempotencyKey
      ? fingerprintModuleRun(parsed.data)
      : undefined;
    if (parsed.data.idempotencyKey) {
      const cached = await getCachedResponse(
        {
          endpointId: moduleIdempotencyEndpoint(parsed.data.moduleId),
          key: parsed.data.idempotencyKey,
          userId: caller.userId,
        },
        idempotencyFingerprint,
      );
      if (cached) {
        log.info('Research module run idempotent replay', {
          duration: Date.now() - startedAt,
          event: 'api.v1.research.module.run.idempotent',
          moduleId: parsed.data.moduleId,
          requestId,
          userId: caller.userId,
        });
        return jsonWithRequestId(cached, 200, requestId);
      }
    }

    const idempotencyLock = parsed.data.idempotencyKey
      ? {
          endpointId: moduleIdempotencyEndpoint(parsed.data.moduleId),
          key: parsed.data.idempotencyKey,
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
              message: 'A matching research module run is already in progress.',
            },
          },
          409,
          requestId,
        );
      }
    }

    try {
      const validationError = validateModuleInput(parsed.data.moduleId, parsed.data.input);
      if (validationError) {
        return jsonWithRequestId(validationError, 400, requestId);
      }

      const { billingMode, byok } = await resolveByokForModuleRequest({
        isApiKeyAuth: caller.isApiKeyAuth,
        log,
        moduleId: parsed.data.moduleId,
        request,
        requestId,
        requiredProviders: providersForModule(moduleDef),
        userId: caller.userId,
      });
      const result = await runResearchModule({
        billingMode,
        byok,
        input: parsed.data.input,
        moduleId: parsed.data.moduleId,
        requestId,
        sandbox: parsed.data.sandbox,
        userId: caller.userId,
      });

      if (parsed.data.idempotencyKey) {
        await setCachedResponse(
          {
            endpointId: moduleIdempotencyEndpoint(parsed.data.moduleId),
            key: parsed.data.idempotencyKey,
            userId: caller.userId,
          },
          result,
          idempotencyFingerprint,
        );
      }

      log.info('Research module run completed', {
        cost: result.cost,
        duration: Date.now() - startedAt,
        event: 'api.v1.research.module.run',
        moduleId: parsed.data.moduleId,
        requestId,
        status: result.status,
        userId: caller.userId,
      });

      return jsonWithRequestId(result, 200, requestId);
    } finally {
      if (idempotencyLock) {
        await releaseIdempotencyLock(idempotencyLock, idempotencyLock.token);
      }
    }
  } catch (error) {
    const byokError = byokKeysRequiredResponse(error, requestId);
    if (byokError) return byokError;

    log.catch('Research module run failed', error, {
      duration: Date.now() - startedAt,
      event: 'api.v1.research.module.run.error',
      requestId,
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

function moduleIdempotencyEndpoint(moduleId: string): string {
  return `module:${moduleId}`;
}

function fingerprintModuleRun(input: z.infer<typeof moduleRunSchema>): string {
  return stableStringify({
    input: input.input,
    moduleId: input.moduleId,
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

function validateModuleInput(
  moduleId: string,
  input: Record<string, unknown>,
): { ok: false; error: { code: 'VALIDATION_ERROR'; message: string; issues: unknown[] } } | null {
  const missing = missingModuleInputFields(moduleId, input);
  if (missing.length === 0) return null;

  return {
    ok: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid research module input.',
      issues: missing.map((field) => ({
        code: 'missing_required_field',
        message: `Fill: ${field}`,
        path: [field],
      })),
    },
  };
}

function missingModuleInputFields(
  moduleId: string,
  input: Record<string, unknown>,
): string[] {
  if (moduleId === 'K1') {
    return hasText(input.keyword) || hasText(input.query) ? [] : ['keyword'];
  }
  return [];
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

async function resolveCaller(
  _request: Request,
): Promise<{ userId: string; isApiKeyAuth: boolean }> {
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
  userId: string,
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

async function resolveByokForModuleRequest(options: {
  isApiKeyAuth: boolean;
  log: Logger;
  moduleId: string;
  request: Request;
  requestId: string;
  requiredProviders: Set<EndpointProvider>;
  userId: string;
}): Promise<{
  billingMode: 'platform' | 'byok';
  byok: ResearchByokInput;
}> {
  const {
    isApiKeyAuth,
    log,
    moduleId,
    request,
    requestId,
    requiredProviders,
    userId,
  } = options;
  const headerByok = readByokHeaders(request, userId, isApiKeyAuth);
  if (headerByokCoversRequiredProviders(requiredProviders, headerByok)) {
    logModuleByokResolved(log, {
      moduleId,
      providerSources: providerSourcesFor(requiredProviders, headerByok, 'header'),
      requestId,
      userId,
    });
    return {
      billingMode: 'byok',
      byok: byokForRequiredProviders(userId, requiredProviders, headerByok),
    };
  }

  const needsDataForSeo = requiredProviders.has('dataforseo');
  const dataforseoCredentials = needsDataForSeo
    ? headerByok.dataforseo ?? (await getDataForSeoCredentials(userId))
    : undefined;

  logModuleByokResolved(log, {
    moduleId,
    providerSources: providerSourcesFor(requiredProviders, headerByok, 'session-byok'),
    requestId,
    userId,
  });

  return {
    billingMode: 'byok',
    byok: {
      dataforseo: dataforseoCredentials ?? undefined,
      userId,
    },
  };
}

function providerSourcesFor(
  requiredProviders: Set<EndpointProvider>,
  headerByok: ResearchByokInput,
  fallbackSource: 'env' | 'header' | 'session-byok',
): Array<{
  provider: EndpointProvider;
  source: 'env' | 'header' | 'session-byok';
}> {
  return Array.from(requiredProviders).map((provider) => ({
    provider,
    source: hasProviderHeaderOverride(headerByok, provider)
      ? 'header'
      : fallbackSource,
  }));
}

function hasProviderHeaderOverride(
  byok: ResearchByokInput,
  _provider: EndpointProvider,
): boolean {
  return Boolean(byok.dataforseo?.login && byok.dataforseo.password);
}

function logModuleByokResolved(
  log: Logger,
  event: {
    moduleId: string;
    providerSources: Array<{
      provider: EndpointProvider;
      source: 'env' | 'header' | 'session-byok';
    }>;
    requestId: string;
    userId: string;
  },
): void {
  for (const providerSource of event.providerSources) {
    log.info('BYOK key resolved', {
      event: 'byok.resolved',
      moduleId: event.moduleId,
      provider: providerSource.provider,
      requestId: event.requestId,
      source: providerSource.source,
      userId: event.userId,
    });
  }
}

function providersForModule(
  moduleDef: NonNullable<ReturnType<typeof getResearchModule>>,
): Set<EndpointProvider> {
  const providers = new Set<EndpointProvider>();
  for (const endpoint of moduleDef.endpoints) {
    const generated = getEndpointByType(endpoint.endpointId);
    if (generated) {
      providers.add(generated.api);
    }
  }
  return providers;
}

function headerByokCoversRequiredProviders(
  requiredProviders: Set<EndpointProvider>,
  headerByok: ResearchByokInput,
): boolean {
  if (!headerByok.dataforseo) {
    return false;
  }

  for (const provider of requiredProviders) {
    if (provider === 'dataforseo' && !headerByok.dataforseo) {
      return false;
    }
  }

  return requiredProviders.size > 0;
}

function byokForRequiredProviders(
  userId: string,
  requiredProviders: Set<EndpointProvider>,
  headerByok: ResearchByokInput,
): ResearchByokInput {
  return {
    dataforseo: requiredProviders.has('dataforseo')
      ? headerByok.dataforseo
      : undefined,
    userId,
  };
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
        message: error.message,
        missing: error.missing,
        provider: error.provider,
      },
    },
    400,
    requestId,
  );
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
  if (error instanceof UnknownResearchModuleError) return 'MODULE_NOT_FOUND';
  if (error instanceof Error) return error.name;
  return 'INTERNAL_ERROR';
}

function errorMessageFor(error: unknown, status: number): string {
  if (error instanceof ApiError) return error.message;
  if (status >= 500) return 'Research module run failed.';
  if (error instanceof Error) return error.message;
  return 'Research module run failed.';
}

function statusForError(error: unknown): number {
  if (error instanceof ApiError) {
    return error.statusCode;
  }

  if (error instanceof UnknownResearchModuleError) {
    return 400;
  }

  return 500;
}
