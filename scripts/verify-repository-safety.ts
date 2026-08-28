/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { execFileSync } from 'node:child_process';
import { readFile, readlink } from 'node:fs/promises';
import { resolve } from 'node:path';

const REQUIRED_FILES = [
  '.env.example',
  'LICENSE',
  'README.md',
  'THIRD_PARTY_NOTICES.md',
  'compose.yml',
  'package.json',
  'pnpm-lock.yaml',
];

const FORBIDDEN_PATHS = [
  /(^|\/)\.agents(\/|$)/,
  /(^|\/)\.claude(\/|$)/,
  /(^|\/)\.codex(\/|$)/,
  /(^|\/)\.directory$/,
  /(^|\/)\.env($|\.(?!example$))/,
  /(^|\/)\.gitnexus(\/|$)/,
  /(^|\/)\.next(\/|$)/,
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)(coverage|logs?|tmp)(\/|$)/,
  /\.(db|dump|log|sqlite|tsbuildinfo)$/,
];

const SAFE_EMAIL_DOMAINS = new Set([
  'example.com',
  'example.invalid',
  'keyword-pro.invalid',
  'keyword-pro.local',
]);

const LOCAL_PATH_PATTERN =
  /(?:\/var\/home\/|\/home\/[A-Za-z0-9._-]+\/|[A-Za-z]:\\Users\\)/;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi;
const SECRET_PATTERN =
  /(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/;

let passed = 0;
const failures: string[] = [];

function check(claim: string, condition: boolean) {
  if (condition) {
    passed += 1;
    process.stdout.write(`  PASS  ${claim}\n`);
    return;
  }
  failures.push(claim);
  process.stdout.write(`  FAIL  ${claim}\n`);
}

function git(args: string[]): string {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

async function main() {
  const root = process.cwd();
  const files = git(['ls-files', '--cached', '--others', '--exclude-standard'])
    .split('\n')
    .filter(Boolean)
    .sort();
  const indexEntries = git(['ls-files', '--stage'])
    .split('\n')
    .filter(Boolean);
  const localPaths: string[] = [];
  const emails: string[] = [];
  const secretMarkers: string[] = [];
  const unsafeSymlinks: string[] = [];

  for (const entry of indexEntries) {
    if (!entry.startsWith('120000 ')) continue;
    const file = entry.slice(entry.indexOf('\t') + 1);
    const target = await readlink(resolve(root, file));
    if (target.startsWith('/') || target.split('/').includes('..')) {
      unsafeSymlinks.push(file);
    }
  }

  for (const file of files) {
    const bytes = await readFile(resolve(root, file));
    if (bytes.subarray(0, 8192).includes(0)) continue;
    const contents = bytes.toString('utf8');
    if (LOCAL_PATH_PATTERN.test(contents)) localPaths.push(file);
    for (const match of contents.matchAll(EMAIL_PATTERN)) {
      const domain = match[1]?.toLowerCase();
      if (!domain || SAFE_EMAIL_DOMAINS.has(domain)) continue;
      emails.push(file);
    }
    if (SECRET_PATTERN.test(contents)) secretMarkers.push(file);
  }

  check(
    'required installation, license, and notice files are tracked',
    REQUIRED_FILES.every((file) => files.includes(file)),
  );
  check(
    'no forbidden runtime or private-state path is tracked',
    files.every((file) =>
      FORBIDDEN_PATHS.every((pattern) => !pattern.test(file)),
    ),
  );
  check('tracked symlinks stay inside the repository', unsafeSymlinks.length === 0);
  check('tracked text contains no local absolute paths', localPaths.length === 0);
  check(
    'tracked text contains no non-placeholder email addresses',
    emails.length === 0,
  );
  check(
    'tracked text contains no common credential or private-key markers',
    secretMarkers.length === 0,
  );

  process.stdout.write(`${passed} passed, ${failures.length} failed\n`);
  for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : 'Unknown verification error.';
  process.stderr.write(`Repository safety verification failed: ${message}\n`);
  process.exit(1);
});
