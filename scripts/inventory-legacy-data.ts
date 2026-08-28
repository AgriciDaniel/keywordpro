import { loadEnvConfig } from '@next/env';
import postgres from 'postgres';
import {
  formatLegacyInventory,
  inventoryLegacyData,
} from '../src/db/legacy-data';
import { RESEARCH_ENDPOINT_CATALOG } from '../src/lib/research/endpoint-catalog';
import { computeDatabaseSsl } from '../src/lib/runtime-environment';

loadEnvConfig(process.cwd());

const allowedEndpointTypes = new Set(
  RESEARCH_ENDPOINT_CATALOG.map((endpoint) => endpoint.type),
);

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error('DATABASE_URL is required.');

  const sql = postgres(databaseUrl, {
    max: 1,
    onnotice: () => undefined,
    prepare: false,
    ssl: computeDatabaseSsl(process.env),
  });
  try {
    const inventory = await inventoryLegacyData(sql, allowedEndpointTypes);
    process.stdout.write(`${formatLegacyInventory(inventory)}\n`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : 'Unknown legacy inventory error.';
  process.stderr.write(`Legacy inventory failed: ${message}\n`);
  process.exit(1);
});
