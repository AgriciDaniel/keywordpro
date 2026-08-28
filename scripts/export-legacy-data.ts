import { loadEnvConfig } from '@next/env';
import postgres from 'postgres';
import { exportLegacyData } from '../src/db/legacy-data';
import { RESEARCH_ENDPOINT_CATALOG } from '../src/lib/research/endpoint-catalog';
import { computeDatabaseSsl } from '../src/lib/runtime-environment';

loadEnvConfig(process.cwd());

function outputArgument(args: string[]): string {
  let output: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--output') {
      output = args[index + 1];
      index += 1;
      continue;
    }
    if (argument?.startsWith('--output=')) {
      output = argument.slice('--output='.length);
      continue;
    }
    throw new Error(`Unknown argument: ${argument ?? ''}`);
  }
  if (!output?.trim()) {
    throw new Error('Use --output <path> to choose a private export file.');
  }
  return output;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error('DATABASE_URL is required.');
  const outputPath = outputArgument(process.argv.slice(2));
  const sql = postgres(databaseUrl, {
    max: 1,
    onnotice: () => undefined,
    prepare: false,
    ssl: computeDatabaseSsl(process.env),
  });
  try {
    const result = await exportLegacyData({
      allowedEndpointTypes: new Set(
        RESEARCH_ENDPOINT_CATALOG.map((endpoint) => endpoint.type),
      ),
      outputPath,
      repositoryRoot: process.cwd(),
      sql,
    });
    process.stdout.write(
      [
        `Created private compatibility export ${result.filename}.`,
        `Saved sessions: ${result.inventory.sessions.total}`,
        `Saved opportunities: ${result.inventory.opportunities.total}`,
        `Legacy credential rows: ${result.inventory.credentials.legacyConfiguredRows}`,
        `Bytes: ${result.bytes}`,
        `SHA-256: ${result.sha256}`,
        'The file contains private cached data and encrypted values. Do not commit or share it.',
      ].join('\n') + '\n',
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : 'Unknown legacy export error.';
  process.stderr.write(`Legacy export failed: ${message}\n`);
  process.exit(1);
});
