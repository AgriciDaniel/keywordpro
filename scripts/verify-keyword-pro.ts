import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeDatabaseSsl } from '../src/db';
import {
  ENDPOINT_SUBCATEGORIES,
  RESEARCH_ENDPOINT_CATALOG,
} from '../src/lib/research/endpoint-catalog';
import { ENDPOINT_METADATA } from '../src/lib/research/endpoint-metadata';
import { ENDPOINT_TARGETING_FIELDS } from '../src/lib/research/endpoint-targeting.generated';
import { ENDPOINTS } from '../src/lib/research/endpoints';
import { bundleTypes } from '../src/lib/research/keyword-bundle';
import {
  isKeywordProEndpoint,
  isKeywordProModule,
} from '../src/lib/research/keyword-pro-boundary';

let checks = 0;
const check = (condition: unknown, message: string) => {
  assert.ok(condition, message);
  checks += 1;
};

const allowlist = JSON.parse(
  readFileSync(
    new URL('./keyword-endpoint-allowlist.json', import.meta.url),
    'utf8',
  ),
) as string[];

function verifyExactTypeSet(label: string, types: string[]) {
  check(types.length === 332, `${label} has ${types.length} entries, expected 332`);
  check(new Set(types).size === types.length, `${label} contains duplicate types`);
  check(
    JSON.stringify([...types].sort()) === JSON.stringify(allowlist),
    `${label} differs from the reviewed keyword allowlist`,
  );
}

check(allowlist.length === 332, 'Keyword allowlist does not contain 332 entries');
check(
  JSON.stringify([...allowlist].sort()) === JSON.stringify(allowlist),
  'Keyword allowlist is not sorted',
);
check(new Set(allowlist).size === allowlist.length, 'Keyword allowlist has duplicates');

verifyExactTypeSet(
  'Executable endpoint catalog',
  ENDPOINTS.map((endpoint) => endpoint.type),
);
verifyExactTypeSet(
  'Sanitized endpoint metadata',
  ENDPOINT_METADATA.map((endpoint) => endpoint.type),
);
verifyExactTypeSet(
  'UI endpoint catalog',
  RESEARCH_ENDPOINT_CATALOG.map((endpoint) => endpoint.type),
);

check(
  ENDPOINTS.every((endpoint) => endpoint.api === 'dataforseo'),
  'Executable catalog contains a non-DataForSEO provider',
);
check(
  ENDPOINT_METADATA.every((endpoint) => endpoint.api === 'dataforseo'),
  'Metadata catalog contains a non-DataForSEO provider',
);
check(
  RESEARCH_ENDPOINT_CATALOG.every(
    (endpoint) => endpoint.mode === 'keyword' && endpoint.provider === 'dataforseo',
  ),
  'UI catalog contains a non-keyword mode or provider',
);

const subcategoryIds = ENDPOINT_SUBCATEGORIES.map((subcategory) => subcategory.id);
check(
  new Set(subcategoryIds).size === subcategoryIds.length,
  'Endpoint subcategory IDs contain duplicates',
);
check(
  subcategoryIds.every((id) => /^[a-z0-9_-]+$/.test(id)),
  'Endpoint subcategory IDs contain unsafe separator characters',
);

const targetingTypes = Object.keys(ENDPOINT_TARGETING_FIELDS);
check(
  targetingTypes.length === 116,
  `Targeting catalog has ${targetingTypes.length} entries, expected 116`,
);
check(
  targetingTypes.every((type) => allowlist.includes(type)),
  'Targeting catalog contains a type outside the keyword allowlist',
);

for (const endpoint of RESEARCH_ENDPOINT_CATALOG) {
  check(
    isKeywordProEndpoint(endpoint.type) === (endpoint.mode === 'keyword'),
    `Admission mismatch for ${endpoint.type}`,
  );
}

for (const endpointId of bundleTypes()) {
  check(
    isKeywordProEndpoint(endpointId),
    `Keyword bundle endpoint is blocked: ${endpointId}`,
  );
}

check(!isKeywordProEndpoint('not.a.real.endpoint'), 'Unknown endpoint was admitted');
check(isKeywordProModule('K1'), 'K1 keyword module was blocked');
check(!isKeywordProModule('not-a-module'), 'Unknown module was admitted');

check(
  computeDatabaseSsl({ DATABASE_SSL_MODE: 'disable' }) === false,
  'Local database mode did not disable TLS explicitly',
);
check(
  computeDatabaseSsl({ DATABASE_SSL_MODE: 'require' }) === 'require',
  'Hosted database mode did not require TLS explicitly',
);
assert.throws(
  () => computeDatabaseSsl({}),
  /DATABASE_SSL_MODE/,
  'A missing database TLS decision was accepted',
);
checks += 1;

const keywordEndpoints = RESEARCH_ENDPOINT_CATALOG.filter(
  (endpoint) => endpoint.mode === 'keyword',
).length;
process.stdout.write(
  `verify-keyword-pro: ${checks} checks, ${keywordEndpoints} keyword endpoints admitted\n`,
);
