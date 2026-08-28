/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * Deterministically removes endpoint definitions that are not in Keyword
 * Pro's reviewed allowlist. Run this after importing a refreshed upstream
 * catalog, then review and commit the generated diff.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

const EXPECTED_KEYWORD_ENDPOINTS = 332;
const ENDPOINTS_FILE = 'src/lib/research/endpoints.ts';
const METADATA_FILE = 'src/lib/research/endpoint-metadata.ts';
const ALLOWLIST_FILE = 'scripts/keyword-endpoint-allowlist.json';

const ALLOWED_TYPES = JSON.parse(readFileSync(ALLOWLIST_FILE, 'utf8'));
if (!Array.isArray(ALLOWED_TYPES)) {
  throw new Error('prune-keyword-endpoints: allowlist must be an array');
}
if (
  ALLOWED_TYPES.length !== EXPECTED_KEYWORD_ENDPOINTS ||
  new Set(ALLOWED_TYPES).size !== ALLOWED_TYPES.length
) {
  throw new Error(
    `prune-keyword-endpoints: expected ${EXPECTED_KEYWORD_ENDPOINTS} unique allowlisted types`,
  );
}
const sortedAllowlist = [...ALLOWED_TYPES].sort();
if (JSON.stringify(sortedAllowlist) !== JSON.stringify(ALLOWED_TYPES)) {
  throw new Error('prune-keyword-endpoints: allowlist must be sorted');
}
const ALLOWED_TYPE_SET = new Set(ALLOWED_TYPES);

function fail(message) {
  throw new Error(`prune-keyword-endpoints: ${message}`);
}

function property(object, name) {
  return object.properties.find(
    (entry) =>
      ts.isPropertyAssignment(entry) &&
      ((ts.isIdentifier(entry.name) && entry.name.text === name) ||
        (ts.isStringLiteral(entry.name) && entry.name.text === name)),
  );
}

function stringValue(node) {
  if (!node) return null;
  if (ts.isStringLiteralLike(node)) return node.text;
  if (
    ts.isCallExpression(node) &&
    node.arguments.length === 1 &&
    ts.isStringLiteralLike(node.arguments[0])
  ) {
    return node.arguments[0].text;
  }
  return null;
}

function endpointIdentity(object) {
  const typeEntry = property(object, 'type');
  const categoryEntry = property(object, 'category');
  const apiEntry = property(object, 'api');
  if (!typeEntry || !categoryEntry || !apiEntry) {
    fail('endpoint object is missing type, category, or api');
  }
  const type = stringValue(typeEntry.initializer);
  const category = stringValue(categoryEntry.initializer);
  const api = stringValue(apiEntry.initializer);
  if (!type || !category || !api) {
    fail('endpoint identity is not statically readable');
  }
  return { api, category, type };
}

function sourceFile(file, text) {
  return ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function variableDeclaration(source, name) {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
        return { declaration, statement };
      }
    }
  }
  fail(`could not find variable ${name}`);
}

function arrayInitializer(declaration, name) {
  let initializer = declaration.initializer;
  while (
    initializer &&
    (ts.isAsExpression(initializer) ||
      ts.isSatisfiesExpression(initializer) ||
      ts.isParenthesizedExpression(initializer))
  ) {
    initializer = initializer.expression;
  }
  if (!initializer || !ts.isArrayLiteralExpression(initializer)) {
    fail(`${name} is not initialized with an array literal`);
  }
  return initializer;
}

function objectElements(array, name) {
  return array.elements.map((element) => {
    if (!ts.isObjectLiteralExpression(element)) {
      fail(`${name} contains a non-object entry`);
    }
    return element;
  });
}

function referencedIdentifier(object, name) {
  const entry = property(object, name);
  if (!entry || !ts.isIdentifier(entry.initializer)) {
    fail(`${name} is not a direct identifier reference`);
  }
  return entry.initializer.text;
}

function renderObjects(text, objects) {
  return objects
    .map((object) => `  ${text.slice(object.getStart(), object.getEnd())},`)
    .join('\n');
}

function buildExecutableEndpoints() {
  const text = readFileSync(ENDPOINTS_FILE, 'utf8');
  const source = sourceFile(ENDPOINTS_FILE, text);
  const { declaration: endpointsDeclaration } = variableDeclaration(
    source,
    'ENDPOINTS',
  );
  const endpointsArray = arrayInitializer(endpointsDeclaration, 'ENDPOINTS');
  const all = objectElements(endpointsArray, 'ENDPOINTS');
  const allByType = new Map(
    all.map((object) => [endpointIdentity(object).type, object]),
  );
  const missing = ALLOWED_TYPES.filter((type) => !allByType.has(type));
  if (missing.length) {
    fail(`executable definitions are missing ${missing.length} allowlisted types`);
  }
  const selected = all.filter((object) =>
    ALLOWED_TYPE_SET.has(endpointIdentity(object).type),
  );

  const needed = new Set();
  for (const object of selected) {
    const identity = endpointIdentity(object);
    if (identity.api !== 'dataforseo') {
      fail(`keyword endpoint ${identity.type} uses unexpected provider ${identity.api}`);
    }
    needed.add(referencedIdentifier(object, 'buildBody'));
    needed.add(referencedIdentifier(object, 'project'));
  }

  const buildDeclarations = [];
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const names = statement.declarationList.declarations
      .map((entry) => (ts.isIdentifier(entry.name) ? entry.name.text : null))
      .filter(Boolean);
    if (names.some((name) => needed.has(name))) buildDeclarations.push(statement);
  }

  const firstGenerated = source.statements.find(
    (statement) =>
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.some(
        (entry) =>
          ts.isIdentifier(entry.name) && entry.name.text.startsWith('buildBody'),
      ),
  );
  if (!firstGenerated) fail('could not locate generated builder declarations');

  const prelude = text.slice(0, firstGenerated.getFullStart()).trimEnd();
  const declarations = buildDeclarations
    .map((statement) => text.slice(statement.getFullStart(), statement.getEnd()).trim())
    .join('\n\n');
  const objects = renderObjects(text, selected);
  const output = `${prelude}\n\n${declarations}\n\nexport const ENDPOINTS: EndpointDef[] = [\n${objects}\n];\n\nexport const ENDPOINT_BY_TYPE: Record<string, EndpointDef> = Object.fromEntries(\n  ENDPOINTS.map((endpoint) => [endpoint.type, endpoint]),\n) as Record<string, EndpointDef>;\n\nexport function getEndpointByType(type: string): EndpointDef | undefined {\n  return ENDPOINT_BY_TYPE[type];\n}\n\nexport function getSanitizedResearchEndpoints(): SanitizedEndpointDef[] {\n  return ENDPOINTS.map(\n    ({\n      bodySource: _bodySource,\n      buildBody: _buildBody,\n      project: _project,\n      projectorSource: _projectorSource,\n      ...endpoint\n    }) => endpoint,\n  );\n}\n\nexport function getCanonicalCoverageReport(): CanonicalCoverageReport {\n  return {\n    totalCanonicalPaths: ENDPOINTS.length,\n    coveredCanonicalPaths: ENDPOINTS.length,\n    uncoveredCanonicalPaths: [],\n  };\n}\n`;

  return {
    output,
    selectedTypes: selected.map((object) => endpointIdentity(object).type),
  };
}

function buildMetadata(expectedTypes) {
  const text = readFileSync(METADATA_FILE, 'utf8');
  const source = sourceFile(METADATA_FILE, text);
  const { declaration } = variableDeclaration(source, 'ENDPOINT_METADATA');
  const array = arrayInitializer(declaration, 'ENDPOINT_METADATA');
  const all = objectElements(array, 'ENDPOINT_METADATA');
  const allByType = new Map(
    all.map((object) => [endpointIdentity(object).type, object]),
  );
  const missingAllowlisted = ALLOWED_TYPES.filter((type) => !allByType.has(type));
  if (missingAllowlisted.length) {
    fail(`metadata is missing ${missingAllowlisted.length} allowlisted types`);
  }
  const selected = all.filter((object) =>
    ALLOWED_TYPE_SET.has(endpointIdentity(object).type),
  );
  const selectedTypes = selected.map((object) => endpointIdentity(object).type);

  const expected = new Set(expectedTypes);
  const actual = new Set(selectedTypes);
  const missing = expectedTypes.filter((type) => !actual.has(type));
  const extra = selectedTypes.filter((type) => !expected.has(type));
  if (missing.length || extra.length) {
    fail(`metadata mismatch, missing ${missing.length}, extra ${extra.length}`);
  }

  const prefix = text.slice(0, array.getStart()).trimEnd();
  const suffix = text.slice(array.getEnd()).trimStart();
  const output = `${prefix}[\n${renderObjects(text, selected)}\n]${suffix}`;
  return output;
}

const executable = buildExecutableEndpoints();
const selectedTypes = executable.selectedTypes;
if (selectedTypes.length !== EXPECTED_KEYWORD_ENDPOINTS) {
  fail(
    `expected ${EXPECTED_KEYWORD_ENDPOINTS} keyword endpoints, found ${selectedTypes.length}`,
  );
}
if (new Set(selectedTypes).size !== selectedTypes.length) {
  fail('duplicate keyword endpoint type');
}
const metadataOutput = buildMetadata(selectedTypes);

// Write only after both generated outputs pass every validation. This keeps a
// failed refresh from leaving one catalog file rewritten and the other stale.
writeFileSync(ENDPOINTS_FILE, executable.output);
writeFileSync(METADATA_FILE, metadataOutput);
process.stdout.write(
  `prune-keyword-endpoints: retained ${selectedTypes.length} keyword endpoints\n`,
);
