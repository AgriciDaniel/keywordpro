/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  unlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';

type Arguments = {
  archive: string;
  output: string;
};

const PROJECT_AUTHOR_NAME = 'Keyword Pro Maintainers';
const PROJECT_AUTHOR_EMAIL = 'maintainers@keyword-pro.invalid';

function parseArguments(args: string[]): Arguments {
  const values: Partial<Arguments> = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--') continue;
    if (argument === '--output' || argument === '--archive') {
      const value = args[index + 1];
      if (!value) throw new Error(`${argument} requires a path.`);
      values[argument.slice(2) as keyof Arguments] = value;
      index += 1;
      continue;
    }
    if (argument?.startsWith('--output=')) {
      values.output = argument.slice('--output='.length);
      continue;
    }
    if (argument?.startsWith('--archive=')) {
      values.archive = argument.slice('--archive='.length);
      continue;
    }
    throw new Error(`Unknown argument: ${argument ?? ''}`);
  }

  if (!values.output || !values.archive) {
    throw new Error(
      'Use --output <directory> and --archive <file.tar.gz> outside the repository.',
    );
  }
  return values as Arguments;
}

function git(args: string[], cwd: string, env = process.env): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

async function newExternalPath(
  requested: string,
  repositoryRoot: string,
  kind: 'archive' | 'directory',
): Promise<string> {
  if (!requested.trim()) throw new Error(`The ${kind} path is empty.`);
  const parent = await realpath(dirname(resolve(requested))).catch(() => null);
  if (!parent) throw new Error(`The ${kind} parent directory does not exist.`);

  const repository = await realpath(repositoryRoot);
  const destination = resolve(parent, basename(requested));
  const fromRepository = relative(repository, destination);
  const insideRepository =
    fromRepository === '' ||
    (!fromRepository.startsWith(`..${sep}`) &&
      fromRepository !== '..' &&
      !isAbsolute(fromRepository));
  if (insideRepository) {
    throw new Error(`Refusing to create the public ${kind} inside the repository.`);
  }
  if (await lstat(destination).then(() => true).catch(() => false)) {
    throw new Error(`Refusing to overwrite an existing public ${kind}.`);
  }
  return destination;
}

async function main() {
  const repositoryRoot = await realpath(process.cwd());
  const args = parseArguments(process.argv.slice(2));
  const output = await newExternalPath(args.output, repositoryRoot, 'directory');
  const archive = await newExternalPath(args.archive, repositoryRoot, 'archive');
  const status = git(['status', '--porcelain=v1'], repositoryRoot);
  if (status) {
    throw new Error('Refusing to project a repository with uncommitted files.');
  }

  const sourceCommit = git(['rev-parse', 'HEAD'], repositoryRoot);
  const sourceTree = git(['rev-parse', 'HEAD^{tree}'], repositoryRoot);
  const sourceDate = git(['show', '-s', '--format=%cI', sourceCommit], repositoryRoot);
  const temporary = await mkdtemp(join(tmpdir(), 'keyword-pro-public-candidate-'));
  const tarPath = join(temporary, 'source.tar');
  let outputCreated = false;
  let archiveCreated = false;

  try {
    execFileSync(
      'git',
      ['archive', '--format=tar', `--output=${tarPath}`, sourceCommit],
      { cwd: repositoryRoot, stdio: ['ignore', 'ignore', 'pipe'] },
    );
    await mkdir(output, { mode: 0o755 });
    outputCreated = true;
    execFileSync('tar', ['-xf', tarPath, '-C', output], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    git(['init', '--initial-branch=main'], output);
    git(['add', '--all'], output);
    const commitEnvironment = {
      ...process.env,
      GIT_AUTHOR_DATE: sourceDate,
      GIT_AUTHOR_EMAIL: PROJECT_AUTHOR_EMAIL,
      GIT_AUTHOR_NAME: PROJECT_AUTHOR_NAME,
      GIT_COMMITTER_DATE: sourceDate,
      GIT_COMMITTER_EMAIL: PROJECT_AUTHOR_EMAIL,
      GIT_COMMITTER_NAME: PROJECT_AUTHOR_NAME,
    };
    git(
      [
        '-c',
        `user.name=${PROJECT_AUTHOR_NAME}`,
        '-c',
        `user.email=${PROJECT_AUTHOR_EMAIL}`,
        'commit',
        '--no-verify',
        '-m',
        'release: initial public source',
      ],
      output,
      commitEnvironment,
    );

    const candidateTree = git(['rev-parse', 'HEAD^{tree}'], output);
    if (candidateTree !== sourceTree) {
      throw new Error('The clean-history candidate tree differs from the source tree.');
    }
    if (git(['rev-list', '--all', '--count'], output) !== '1') {
      throw new Error('The public candidate must contain exactly one commit.');
    }
    if (git(['remote'], output)) {
      throw new Error('The public candidate unexpectedly contains a remote.');
    }

    git(
      [
        'archive',
        '--format=tar.gz',
        '--prefix=keyword-pro/',
        `--output=${archive}`,
        'HEAD',
      ],
      output,
    );
    archiveCreated = true;
    await chmod(archive, 0o644);
    const archiveBytes = await readFile(archive);
    const archiveSha256 = createHash('sha256')
      .update(archiveBytes)
      .digest('hex');

    process.stdout.write(
      `${JSON.stringify(
        {
          archive: basename(archive),
          archiveBytes: archiveBytes.length,
          archiveSha256,
          candidate: basename(output),
          candidateCommit: git(['rev-parse', 'HEAD'], output),
          files: git(['ls-files'], output).split('\n').filter(Boolean).length,
          sourceCommit,
          sourceTree,
        },
        null,
        2,
      )}\n`,
    );
  } catch (error) {
    if (archiveCreated) await unlink(archive).catch(() => undefined);
    if (outputCreated) await rm(output, { recursive: true, force: true });
    throw error;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown candidate error.';
  process.stderr.write(`Public candidate build failed: ${message}\n`);
  process.exit(1);
});
