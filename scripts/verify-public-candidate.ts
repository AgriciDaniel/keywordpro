/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

type Arguments = {
  archive: string;
  candidate: string;
  sourceRef: string;
};

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

function parseArguments(args: string[]): Arguments {
  const values: Partial<Arguments> = { sourceRef: 'HEAD' };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--') continue;
    if (
      argument === '--candidate' ||
      argument === '--archive' ||
      argument === '--source-ref'
    ) {
      const value = args[index + 1];
      if (!value) throw new Error(`${argument} requires a value.`);
      const key =
        argument === '--source-ref' ? 'sourceRef' : argument.slice(2);
      values[key as keyof Arguments] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument ?? ''}`);
  }
  if (!values.candidate || !values.archive) {
    throw new Error('Use --candidate <directory> and --archive <file.tar.gz>.');
  }
  return values as Arguments;
}

function command(
  executable: string,
  args: string[],
  cwd?: string,
): string {
  return execFileSync(executable, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function git(args: string[], cwd: string): string {
  return command('git', args, cwd);
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const repositoryRoot = await realpath(process.cwd());
  const candidate = await realpath(resolve(args.candidate));
  const archive = await realpath(resolve(args.archive));
  const sourceTree = git(['rev-parse', `${args.sourceRef}^{tree}`], repositoryRoot);
  const candidateTree = git(['rev-parse', 'HEAD^{tree}'], candidate);
  const sourceFiles = git(
    ['ls-tree', '-r', '--name-only', args.sourceRef],
    repositoryRoot,
  )
    .split('\n')
    .filter(Boolean)
    .sort();
  const candidateFiles = git(['ls-files'], candidate)
    .split('\n')
    .filter(Boolean)
    .sort();
  const archiveEntries = command('tar', ['-tzf', archive])
    .split('\n')
    .filter((entry) => entry.startsWith('keyword-pro/') && !entry.endsWith('/'))
    .map((entry) => entry.slice('keyword-pro/'.length))
    .sort();
  const authorEmails = git(['log', '--format=%ae%n%ce'], candidate)
    .split('\n')
    .filter(Boolean);

  check('the candidate uses the main branch', git(['branch', '--show-current'], candidate) === 'main');
  check('the candidate has exactly one commit', git(['rev-list', '--all', '--count'], candidate) === '1');
  check('the candidate has no configured remote', git(['remote'], candidate) === '');
  check('the candidate tree exactly matches the source tree', candidateTree === sourceTree);
  check('the candidate file inventory exactly matches the source ref', JSON.stringify(candidateFiles) === JSON.stringify(sourceFiles));
  check('the source archive exactly matches the candidate file inventory', JSON.stringify(archiveEntries) === JSON.stringify(candidateFiles));
  check('the clean commit uses only the project-safe .invalid identity', authorEmails.length === 2 && authorEmails.every((email) => email === 'maintainers@keyword-pro.invalid'));
  check('all required installation and license files are present', REQUIRED_FILES.every((file) => candidateFiles.includes(file)));
  check('no forbidden runtime or private-state path is tracked', candidateFiles.every((file) => FORBIDDEN_PATHS.every((pattern) => !pattern.test(file))));
  check('the source archive contains no Git metadata', !archiveEntries.some((entry) => entry === '.git' || entry.startsWith('.git/')));

  const scan = await scanCandidate(candidate, candidateFiles);
  check('tracked text contains no local absolute paths', scan.localPaths.length === 0);
  check('tracked text contains no non-placeholder email addresses', scan.emails.length === 0);
  check('tracked text contains no common credential or private-key markers', scan.secretMarkers.length === 0);

  const archiveBytes = await readFile(archive);
  process.stdout.write(
    `Archive ${basename(archive)}: ${archiveBytes.length} bytes, SHA-256 ${createHash('sha256').update(archiveBytes).digest('hex')}\n`,
  );
  process.stdout.write(`${passed} passed, ${failures.length} failed\n`);
  for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
  process.exit(failures.length > 0 ? 1 : 0);
}

async function scanCandidate(root: string, files: string[]) {
  const localPaths: string[] = [];
  const emails: string[] = [];
  const secretMarkers: string[] = [];
  const emailPattern = /[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi;
  const localPathPattern = /(?:\/var\/home\/|\/home\/[A-Za-z0-9._-]+\/|[A-Za-z]:\\Users\\)/;
  const secretPattern = /(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/;

  for (const file of files) {
    const bytes = await readFile(resolve(root, file));
    if (bytes.subarray(0, 8192).includes(0)) continue;
    const text = bytes.toString('utf8');
    if (localPathPattern.test(text)) localPaths.push(file);
    for (const match of text.matchAll(emailPattern)) {
      const domain = match[1]?.toLowerCase();
      if (!domain || SAFE_EMAIL_DOMAINS.has(domain)) continue;
      emails.push(file);
    }
    if (secretPattern.test(text)) secretMarkers.push(file);
  }
  return { emails, localPaths, secretMarkers };
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown verification error.';
  process.stderr.write(`Public candidate verification failed: ${message}\n`);
  process.exit(1);
});
