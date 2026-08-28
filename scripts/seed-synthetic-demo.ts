/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { loadEnvConfig } from '@next/env';
import postgres from 'postgres';

import { migrateDatabase } from '@/db/migrate';
import {
  buildSyntheticDemoResult,
  SYNTHETIC_DEMO_SEED,
  SYNTHETIC_DEMO_SESSION_ID,
} from './lib/synthetic-demo';

loadEnvConfig(process.cwd());

const CONFIRM_FLAG = '--confirm-synthetic-screenshots';
const ALLOWED_DATABASE = /^keyword_pro_demo_screenshots(?:_[a-z0-9_]+)?$/;

function requireSafeDatabaseUrl(): string {
  if (!process.argv.includes(CONFIRM_FLAG)) {
    throw new Error(
      `Refusing to seed without ${CONFIRM_FLAG}. This command is only for a disposable screenshot database.`,
    );
  }

  const value = process.env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL is required.');

  const parsed = new URL(value);
  const database = parsed.pathname.replace(/^\//, '');
  const localHost = ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname);
  if (!localHost || !ALLOWED_DATABASE.test(database)) {
    throw new Error(
      'Refusing to seed. Use a local database named keyword_pro_demo_screenshots or keyword_pro_demo_screenshots_<suffix>.',
    );
  }

  return value;
}

async function main() {
  const databaseUrl = requireSafeDatabaseUrl();
  await migrateDatabase({ databaseUrl, env: process.env });

  const result = await buildSyntheticDemoResult();
  const response = result.response as {
    data?: { count?: number; meta?: { sources?: unknown[] } };
  };
  const count = response.data?.count ?? 0;
  const sourceCount = response.data?.meta?.sources?.length ?? 0;
  const storedResults = JSON.parse(JSON.stringify([result]));
  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    ssl: false,
  });

  try {
    await sql.begin(async (transaction) => {
      await transaction`
        insert into public."user" (id, name, email, image, created_at, updated_at)
        values (
          'local-user',
          'Keyword Pro Demo',
          'demo@keyword-pro.invalid',
          null,
          '2026-08-28T00:00:00Z',
          '2026-08-28T00:00:00Z'
        )
        on conflict (id) do update set
          name = excluded.name,
          email = excluded.email,
          image = excluded.image,
          updated_at = excluded.updated_at
      `;

      await transaction`
        insert into public.keyword_pro_research_sessions (
          id,
          user_id,
          title,
          input,
          input_type,
          primary_tab,
          filters,
          endpoint_selection,
          status,
          source,
          summary,
          results,
          is_pinned,
          pinned_order,
          created_at,
          updated_at
        )
        values (
          ${SYNTHETIC_DEMO_SESSION_ID},
          'local-user',
          ${SYNTHETIC_DEMO_SEED},
          ${SYNTHETIC_DEMO_SEED},
          'keyword',
          'keywords',
          ${transaction.json({
            location: 'US',
            language: 'en',
            device: 'desktop',
            searchEngine: 'google',
          })},
          ${transaction.json({
            providers: ['dataforseo'],
            sources: ['keywords', 'serp'],
            format: 'dashboard',
            category: 'seo',
            options: {
              limit: 25,
              freshness: 'any',
              includePageContent: false,
              mainContentOnly: true,
              parsePdf: false,
              enhancedMode: false,
            },
          })},
          'completed',
          'mock',
          'Deterministic synthetic report for release screenshots. No provider request was made.',
          ${transaction.json(storedResults)},
          1,
          1,
          '2026-08-28T00:00:00Z',
          '2026-08-28T00:00:00Z'
        )
        on conflict (id) do update set
          user_id = excluded.user_id,
          title = excluded.title,
          input = excluded.input,
          input_type = excluded.input_type,
          primary_tab = excluded.primary_tab,
          filters = excluded.filters,
          endpoint_selection = excluded.endpoint_selection,
          status = excluded.status,
          source = excluded.source,
          summary = excluded.summary,
          results = excluded.results,
          is_pinned = excluded.is_pinned,
          pinned_order = excluded.pinned_order,
          updated_at = excluded.updated_at
      `;
    });
  } finally {
    await sql.end({ timeout: 5 });
  }

  process.stdout.write(
    `Seeded one local-only synthetic report with ${count} keywords and ${sourceCount} source records.\n`,
  );
  process.stdout.write(
    `Open http://127.0.0.1:3002/keyword-pro/research/${SYNTHETIC_DEMO_SESSION_ID}\n`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown seed error.';
  process.stderr.write(`Synthetic demo seed failed: ${message}\n`);
  process.exit(1);
});
