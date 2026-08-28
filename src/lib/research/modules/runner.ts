/*
 * SPDX-License-Identifier: Apache-2.0
 */

import 'server-only';

import { createHash } from 'node:crypto';
import { dispatchResearch } from '@/lib/research/dispatcher';
import { getEndpointByType } from '@/lib/research/endpoints';
import {
  acquireModuleEndpointLock,
  getCachedModuleEndpoint,
  releaseModuleEndpointLock,
  setCachedModuleEndpoint,
  type ModuleEndpointCacheKey,
} from '@/lib/research/module-cache';
import type {
  DispatchResearchOptions,
  DispatchResearchResult,
  EndpointDef,
  EndpointInput,
  ResearchByokInput,
} from '@/lib/research/types';
import {
  getResearchModule,
  type ResearchModuleEndpoint,
} from './registry';

const PROJECTOR_VERSION = 'projector-v1';

export type ResearchModuleStatus = 'complete' | 'partial' | 'failed';
export type ResearchModuleSectionStatus =
  | 'access_required'
  | 'in_progress'
  | 'ready'
  | 'unavailable';

export type ResearchModuleSection = {
  id: string;
  title: string;
  status: ResearchModuleSectionStatus;
  data?: unknown;
  endpointId: string;
  message?: string;
};

export type ResearchModuleEndpointTrace = {
  endpointId: string;
  required: boolean;
  status: 'access_required' | 'cached' | 'failed' | 'in_flight' | 'success';
  cost: number;
  error?: string;
};

export type ResearchModuleResult = {
  ok: true;
  moduleId: string;
  status: ResearchModuleStatus;
  sections: ResearchModuleSection[];
  summary: { mode: 'structured'; bullets: string[] };
  cost: number;
  endpointTrace: ResearchModuleEndpointTrace[];
  cache: {
    hit: boolean;
    hits: number;
    misses: number;
  };
};

export type RunResearchModuleOptions = {
  moduleId: string;
  input: EndpointInput;
  billingMode: NonNullable<DispatchResearchOptions['billingMode']>;
  byok: ResearchByokInput;
  sandbox?: boolean;
  requestId: string;
  userId: string;
};

type EndpointRunOutcome = {
  cacheHit: boolean;
  descriptor: ResearchModuleEndpoint;
  result: DispatchResearchResult | null;
  section: ResearchModuleSection;
  trace: ResearchModuleEndpointTrace;
};

export class UnknownResearchModuleError extends Error {
  constructor(moduleId: string) {
    super(`Unknown research module: ${moduleId}`);
    this.name = 'UnknownResearchModuleError';
  }
}

export async function runResearchModule(
  options: RunResearchModuleOptions,
): Promise<ResearchModuleResult> {
  const module = getResearchModule(options.moduleId);
  if (!module) {
    throw new UnknownResearchModuleError(options.moduleId);
  }

  const settled = await Promise.allSettled(
    module.endpoints.map((descriptor) => runEndpoint(descriptor, options)),
  );
  const outcomes = settled.map((entry, index): EndpointRunOutcome => {
    if (entry.status === 'fulfilled') return entry.value;
    return failedOutcome(module.endpoints[index], entry.reason);
  });

  const required = outcomes.filter((outcome) => outcome.descriptor.required);
  const availableRequired = required.filter((outcome) =>
    ['access_required', 'cached', 'success'].includes(outcome.trace.status),
  );
  const pendingRequired = required.filter(
    (outcome) => outcome.trace.status === 'in_flight',
  ).length;
  const failedRequired = required.length - availableRequired.length - pendingRequired;
  const status: ResearchModuleStatus =
    failedRequired === 0
      ? pendingRequired > 0
        ? 'partial'
        : 'complete'
      : failedRequired === required.length
        ? 'failed'
        : 'partial';

  return {
    ok: true,
    moduleId: module.id,
    status,
    sections: outcomes.map((outcome) => outcome.section),
    summary: summarize(module.title, outcomes, status),
    cost: outcomes.reduce((total, outcome) => total + outcome.trace.cost, 0),
    endpointTrace: outcomes.map((outcome) => outcome.trace),
    cache: {
      hit: outcomes.some((outcome) => outcome.cacheHit),
      hits: outcomes.filter((outcome) => outcome.cacheHit).length,
      misses: outcomes.filter((outcome) => !outcome.cacheHit).length,
    },
  };
}

async function runEndpoint(
  descriptor: ResearchModuleEndpoint,
  options: RunResearchModuleOptions,
): Promise<EndpointRunOutcome> {
  const endpoint = getEndpointByType(descriptor.endpointId);
  const params = descriptor.buildParams(options.input);
  const projectorVersion = getProjectorVersion(endpoint);
  const cacheKey: ModuleEndpointCacheKey = {
    billingMode: options.billingMode,
    endpointId: descriptor.endpointId,
    params,
    projectorVersion,
    sandbox: options.sandbox,
    userId: options.userId,
  };

  if (endpoint?.stub) {
    return accessRequiredOutcome(descriptor, endpoint);
  }

  const cached = await getCachedModuleEndpoint(cacheKey);
  if (isDispatchResearchResult(cached)) {
    return successOutcome(descriptor, cached, true);
  }

  const lock = await acquireModuleEndpointLock(cacheKey, options.requestId);
  if (!lock.acquired) {
    const replay = await getCachedModuleEndpoint(cacheKey);
    if (isDispatchResearchResult(replay)) {
      return successOutcome(descriptor, replay, true);
    }
    return unavailableOutcome(
      descriptor,
      'A matching endpoint call is already in flight.',
      'in_flight',
    );
  }

  try {
    const result = await dispatchResearch({
      billingMode: options.billingMode,
      byok: options.byok,
      endpointId: descriptor.endpointId,
      params,
      requestId: options.requestId,
      sandbox: options.sandbox,
    });
    await setCachedModuleEndpoint(cacheKey, result);
    return successOutcome(descriptor, result, false);
  } finally {
    await releaseModuleEndpointLock(cacheKey, lock.token);
  }
}

function successOutcome(
  descriptor: ResearchModuleEndpoint,
  result: DispatchResearchResult,
  cacheHit: boolean,
): EndpointRunOutcome {
  return {
    cacheHit,
    descriptor,
    result,
    section: {
      data: result.data,
      endpointId: descriptor.endpointId,
      id: descriptor.sectionId,
      status: 'ready',
      title: descriptor.sectionTitle,
    },
    trace: {
      cost: cacheHit ? 0 : result.cost,
      endpointId: descriptor.endpointId,
      required: descriptor.required,
      status: cacheHit ? 'cached' : 'success',
    },
  };
}

function accessRequiredOutcome(
  descriptor: ResearchModuleEndpoint,
  endpoint: EndpointDef,
): EndpointRunOutcome {
  const message = endpoint.stubReason ?? 'Endpoint access is required.';
  return {
    cacheHit: false,
    descriptor,
    result: null,
    section: {
      endpointId: descriptor.endpointId,
      id: descriptor.sectionId,
      message,
      status: 'access_required',
      title: descriptor.sectionTitle,
    },
    trace: {
      cost: 0,
      endpointId: descriptor.endpointId,
      error: message,
      required: descriptor.required,
      status: 'access_required',
    },
  };
}

function unavailableOutcome(
  descriptor: ResearchModuleEndpoint,
  message: string,
  status: 'failed' | 'in_flight' = 'failed',
): EndpointRunOutcome {
  return {
    cacheHit: false,
    descriptor,
    result: null,
    section: {
      endpointId: descriptor.endpointId,
      id: descriptor.sectionId,
      message,
      status: status === 'in_flight' ? 'in_progress' : 'unavailable',
      title: descriptor.sectionTitle,
    },
    trace: {
      cost: 0,
      endpointId: descriptor.endpointId,
      error: message,
      required: descriptor.required,
      status,
    },
  };
}

function failedOutcome(
  descriptor: ResearchModuleEndpoint,
  error: unknown,
): EndpointRunOutcome {
  const message = error instanceof Error ? error.message : 'Endpoint failed.';
  return unavailableOutcome(descriptor, message);
}

function summarize(
  moduleTitle: string,
  outcomes: EndpointRunOutcome[],
  status: ResearchModuleStatus,
): { mode: 'structured'; bullets: string[] } {
  const ready = outcomes.filter((outcome) => outcome.section.status === 'ready').length;
  const unavailable = outcomes.length - ready;
  return {
    mode: 'structured',
    bullets: [
      `${moduleTitle} finished with ${ready} ready section${ready === 1 ? '' : 's'}.`,
      `Status: ${status}.`,
      unavailable > 0
        ? `${unavailable} section${unavailable === 1 ? '' : 's'} unavailable or access-gated.`
        : 'All configured sections are available.',
    ],
  };
}

function getProjectorVersion(endpoint: EndpointDef | null | undefined): string {
  if (!endpoint) return PROJECTOR_VERSION;
  const localEndpoint = endpoint as EndpointDef & {
    projectorVersion?: string;
  };
  const declaredVersion = localEndpoint.projectorVersion ?? PROJECTOR_VERSION;
  const catalogSource = [
    endpoint.type,
    endpoint.bodySource ?? '',
    endpoint.projectorSource ?? '',
  ].join(':');
  const catalogDigest = createHash('sha256')
    .update(catalogSource)
    .digest('hex')
    .slice(0, 12);
  return `${declaredVersion}:${catalogDigest}`;
}

function isDispatchResearchResult(value: unknown): value is DispatchResearchResult {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value as { ok?: unknown }).ok === true &&
    'projector_version' in value
  );
}
