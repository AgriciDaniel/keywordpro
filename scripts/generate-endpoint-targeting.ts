import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ENDPOINTS } from '../src/lib/research/endpoints';

const OUT_PATH = resolve(
  import.meta.dirname,
  '../src/lib/research/endpoint-targeting.generated.ts',
);

const COUNTRY_FIELD =
  /\bi\.(?:country|country_iso_code|location|location_code|location_name|location_coordinate)\b/;
const LANGUAGE_FIELD =
  /\bi\.(?:language|language_code|language_name)\b/;

const targeting = Object.fromEntries(
  ENDPOINTS.flatMap((endpoint) => {
    if (endpoint.method !== 'POST') return [];
    const bodySource = endpoint.bodySource ?? '';
    const country = COUNTRY_FIELD.test(bodySource);
    const language = LANGUAGE_FIELD.test(bodySource);
    return country || language
      ? [[endpoint.type, { country, language }] as const]
      : [];
  }).sort(([left], [right]) => left.localeCompare(right)),
);

const body = `/**
 * GENERATED FILE. Do not hand-edit.
 *
 * Source: the executable request builders in \`endpoints.ts\`.
 * Regenerate: pnpm --ignore-workspace exec tsx --tsconfig tsconfig.json scripts/generate-endpoint-targeting.ts
 */

export type GeneratedEndpointTargetingFields = {
  country: boolean;
  language: boolean;
};

export const ENDPOINT_TARGETING_FIELDS: Record<
  string,
  GeneratedEndpointTargetingFields
> = ${JSON.stringify(targeting, null, 2)};
`;

writeFileSync(OUT_PATH, body, 'utf8');
process.stdout.write(
  `Wrote targeting metadata for ${Object.keys(targeting).length} endpoint request builders.\n`,
);
