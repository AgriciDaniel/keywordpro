/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { getProjectorOverride } from './endpoint-overrides';
import { getEndpointByType } from './endpoints';
import type { ResearchRunResult } from './console-types';
import { unwrapProviderResult } from './unwrap';

/**
 * Re-shape a saved run with today's projectors.
 *
 * When a saved endpoint run includes an untouched provider envelope, a search
 * created before a projector fix can be brought up to date without calling the
 * provider again. Guided bundles intentionally omit raw envelopes to keep
 * saved reports bounded, so they take the stored-projection fallback below.
 *
 * Falls back to the stored projection whenever the raw envelope is missing or
 * no longer replays cleanly, so opening an old session can never fail.
 */
export function reprojectSavedResults(
  results: ResearchRunResult[] | undefined,
): ResearchRunResult[] | undefined {
  if (!results) return results;
  return results.map(reprojectSavedResult);
}

function reprojectSavedResult(result: ResearchRunResult): ResearchRunResult {
  if (result.error) return result;

  const response = asRecord(result.response);
  if (!response) return result;

  const raw = response.raw;
  if (raw === undefined || raw === null) return result;

  const endpoint = getEndpointByType(result.type);
  if (!endpoint) return result;

  try {
    const unwrapped = unwrapProviderResult(raw, endpoint);
    const override = getProjectorOverride(endpoint.type);
    const data = override
      ? override(unwrapped, endpoint.type, {})
      : endpoint.project(unwrapped, endpoint.type, {});

    return { ...result, response: { ...response, data } };
  } catch {
    // A stored envelope that no longer replays is not a reason to fail the
    // page; show what was saved.
    return result;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
