/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AuthError,
  RateLimitError,
  TransientError,
  UserError,
} from './errors';
import type { EndpointDef } from './types';

/**
 * Strip the provider's transport envelope so projectors receive the payload
 * they were generated against.
 *
 * DataForSEO v3 wraps every response as:
 *
 *   { version, status_code, cost, tasks: [ { status_code, cost, result: [...] } ] }
 *
 * but the generated projectors were written against `tasks[0].result[0]` (an
 * object carrying `.items`) or against `tasks[0].result` itself (an array).
 * `EndpointDef.resultIsArray` is the flag that says which.
 *
 * Without this step `r.items` is undefined for wrapped endpoints, so they
 * return `count: 0, results: []` while the real payload sits untouched in
 * `raw`.
 *
 * Pure and dependency-free on purpose, so `scripts/verify-projectors.ts` can
 * exercise it without booting Next.
 */
export function unwrapProviderResult(
  raw: unknown,
  endpoint: EndpointDef,
): unknown {
  if (!isRecord(raw)) {
    return raw;
  }

  const tasks = raw.tasks;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    // A few appendix/reference endpoints answer without a task wrapper.
    return raw;
  }

  const task = tasks[0];
  if (!isRecord(task)) {
    return raw;
  }

  const statusCode = Number(task.status_code ?? 0);
  if (statusCode === DFS_TASK_CREATED) {
    // A queued task (`task_post`) has no result yet: the task object itself
    // is the receipt, carrying the id every later reader needs. Treating
    // 20100 as a failure loses that task id.
    return endpoint.resultIsArray ? [task] : task;
  }
  if (statusCode !== 0 && statusCode !== DFS_TASK_OK) {
    const message =
      typeof task.status_message === 'string' && task.status_message
        ? task.status_message
        : `DataForSEO task failed with status ${statusCode}`;
    throw classifyDfsTaskStatus(statusCode, message);
  }

  const result = task.result;
  if (result === null || result === undefined) {
    // A successful task with no rows. Hand the projector the shape it expects
    // so it reports an empty result rather than throwing on undefined.
    return endpoint.resultIsArray ? [] : { items: [] };
  }

  if (endpoint.resultIsArray) {
    return Array.isArray(result) ? result : [result];
  }

  return Array.isArray(result) ? (result[0] ?? { items: [] }) : result;
}

/**
 * The provider reports what it actually charged. Prefer it over the local
 * estimate in `cost-table.ts`, which is only a pre-run hint.
 */
export function providerCost(raw: unknown): number | undefined {
  if (!isRecord(raw)) return undefined;
  const tasks = raw.tasks;
  const task = Array.isArray(tasks) && isRecord(tasks[0]) ? tasks[0] : null;
  const cost = task?.cost ?? raw.cost;
  return typeof cost === 'number' && Number.isFinite(cost) ? cost : undefined;
}

const DFS_TASK_OK = 20000;
/** "Task Created." The answer to every task_post; the result arrives later. */
const DFS_TASK_CREATED = 20100;

/**
 * DataForSEO status codes, per
 * `DataForSEO Brain/schemas/dataforseo-response-schema.json`.
 * 40204 is the legacy "subscription required" for Backlinks / LLM Mentions.
 */
function classifyDfsTaskStatus(statusCode: number, message: string): Error {
  if (statusCode === 40100 || statusCode === 40200 || statusCode === 40204) {
    return new AuthError(message);
  }
  if (statusCode === 40202 || statusCode === 40203) {
    return new RateLimitError(message);
  }
  if (statusCode >= 50000) {
    return new TransientError(message);
  }
  return new UserError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
