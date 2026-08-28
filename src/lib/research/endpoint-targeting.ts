import {
  ENDPOINT_TARGETING_FIELDS,
  type GeneratedEndpointTargetingFields,
} from './endpoint-targeting.generated';

/**
 * Targeting inputs that the executable request body actually reads.
 *
 * Generated endpoint metadata omits locale fields for some live and task-post
 * definitions. Reading this compact generated map keeps the browser form and
 * the server guard aligned with the request that will reach the provider.
 */
export function targetingFieldsForEndpointType(
  type: string,
): GeneratedEndpointTargetingFields | null {
  return ENDPOINT_TARGETING_FIELDS[type] ?? null;
}
