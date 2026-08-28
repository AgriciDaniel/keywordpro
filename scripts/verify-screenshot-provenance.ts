/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SCREENSHOT_ROOT = join(process.cwd(), 'public/images/screenshots');
const MANIFEST_PATH = join(SCREENSHOT_ROOT, 'manifest.json');
const PNG_SIGNATURE = '89504e470d0a1a0a';
const FORBIDDEN_CHUNKS = new Set(['eXIf', 'iTXt', 'tEXt', 'zTXt']);

type Manifest = {
  capture: {
    viewport: { height: number; width: number };
  };
  images: Record<string, string>;
  schemaVersion: number;
};

let passed = 0;
const failures: string[] = [];

function check(claim: string, condition: boolean) {
  if (condition) {
    passed += 1;
    process.stdout.write(`  PASS  ${claim}\n`);
  } else {
    failures.push(claim);
    process.stdout.write(`  FAIL  ${claim}\n`);
  }
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
const expected = Object.keys(manifest.images).sort();
const actual = readdirSync(SCREENSHOT_ROOT)
  .filter((name) => name.endsWith('.png'))
  .sort();

check('the screenshot manifest uses schema version 1', manifest.schemaVersion === 1);
check('the screenshot directory has exactly the manifested PNG files', JSON.stringify(actual) === JSON.stringify(expected));
check('the release gallery contains eight application screenshots', expected.length === 8);

for (const name of expected) {
  const path = join(SCREENSHOT_ROOT, name);
  const bytes = readFileSync(path);
  const digest = createHash('sha256').update(bytes).digest('hex');
  const dimensions = pngDimensions(bytes);
  const chunks = pngChunks(bytes);

  check(`${name} has a valid PNG signature`, bytes.subarray(0, 8).toString('hex') === PNG_SIGNATURE);
  check(`${name} matches its reviewed SHA-256`, digest === manifest.images[name]);
  check(
    `${name} matches the reviewed viewport`,
    dimensions.width === manifest.capture.viewport.width &&
      dimensions.height === manifest.capture.viewport.height,
  );
  check(
    `${name} contains no text or EXIF metadata chunks`,
    chunks.every((chunk) => !FORBIDDEN_CHUNKS.has(chunk)),
  );
}

process.stdout.write(`\n${passed} passed, ${failures.length} failed\n`);
for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
process.exit(failures.length > 0 ? 1 : 0);

function pngDimensions(bytes: Buffer): { height: number; width: number } {
  if (bytes.length < 24 || bytes.subarray(12, 16).toString('ascii') !== 'IHDR') {
    return { height: -1, width: -1 };
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function pngChunks(bytes: Buffer): string[] {
  const chunks: string[] = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    chunks.push(type);
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  return chunks;
}
