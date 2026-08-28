import type { EndpointInputs } from '@/lib/research/endpoint-catalog';
import {
  findLocationByIso,
  resolveLocation,
} from '@/lib/research/locations-languages';

/**
 * Augment the UI's input map with DFS-friendly field aliases before dispatch.
 * Keeps the original UI fields (country/language) for the dispatcher's required-param check,
 * AND adds the DFS bodySource fields (location_code, location_name, language_code).
 *
 * Idempotent: if location_code is already set, doesn't overwrite.
 */
export function augmentParamsForDispatcher(inputs: EndpointInputs): EndpointInputs {
  const augmented: EndpointInputs = { ...inputs };

  const country = typeof inputs.country === 'string' ? inputs.country : null;
  if (country && augmented.location_code === undefined) {
    // Unknown country: send nothing rather than silently researching the US.
    // A missing location surfaces as a required-parameter error the user can
    // see, where a wrong one returns confident data for the wrong market.
    const mapped = findLocationByIso(country) ?? resolveLocation(country);
    if (mapped) {
      augmented.location_code = mapped.code;
      augmented.location_name = mapped.name;
    }
  }

  const language = typeof inputs.language === 'string' ? inputs.language : null;
  if (language && augmented.language_code === undefined) {
    augmented.language_code = language;
  }

  return augmented;
}
