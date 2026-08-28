/**
 * Connect to PostgreSQL Database (Neon/Local PostgreSQL)
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { computeDatabaseSsl } from '@/lib/runtime-environment';
import * as schema from './schema';

export { computeDatabaseSsl } from '@/lib/runtime-environment';

/**
 * DB-04-H pool-sizing policy. Exported for unit testing - the rules are:
 *
 * 1. If `DATABASE_POOL_MAX` is set to a positive integer, use it verbatim.
 *    Ops override wins.
 * 2. Else, if `NODE_ENV === 'development'`, use 1. Local Docker Postgres
 *    is a single-user machine - 1 connection avoids connection churn in
 *    HMR cycles.
 * 3. Otherwise (production, staging, CI), use 5. Matches what the
 *    ws-server already uses and what Vercel recommends for Postgres-backed
 *    Next.js apps. See comment in `getDb()` for the full analysis.
 *
 * This is a pure function. The real `getDb()` calls it with `process.env`
 * at request time, but tests can pass fixtures.
 */
export function computePoolMax(env: {
  DATABASE_POOL_MAX?: string;
  NODE_ENV?: string;
}): number {
  const configured = Number.parseInt(env.DATABASE_POOL_MAX ?? '', 10);
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }
  return env.NODE_ENV === 'development' ? 1 : 5;
}

type DbInstance = ReturnType<typeof drizzle>;
type SqlClient = ReturnType<typeof postgres>;

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (value) {
    return value;
  }

  const isBuildPhase =
    process.env.DOCKER_BUILD === 'true' ||
    process.env.NEXT_PHASE === 'phase-production-build';

  // During image build, Next may evaluate route/config modules that import DB code.
  // Use a placeholder only for build-time evaluation; runtime still requires real envs.
  if (isBuildPhase && key === 'DATABASE_URL') {
    return 'postgresql://build:build@localhost:5432/build'; // pragma: allowlist secret
  }

  throw new Error(`Missing required environment variable: ${key}`);
}

declare global {
  // eslint-disable-next-line no-var
  var __keyword_pro_sql_client__: SqlClient | undefined;
  // eslint-disable-next-line no-var
  var __keyword_pro_db__: DbInstance | undefined;
}

export async function getDb(): Promise<DbInstance> {
  const g = globalThis as typeof globalThis & {
    __keyword_pro_sql_client__?: SqlClient;
    __keyword_pro_db__?: DbInstance;
  };
  const connectionString = getRequiredEnv('DATABASE_URL');
  // DB-04-H: production default raised from 2 → 5 (see `computePoolMax`
  // docstring above). Vercel serverless instances regularly fan out 3+
  // parallel DB operations within a single request (e.g. Promise.all on
  // project gallery load, parallel credit+payment writes in Stripe webhook
  // handlers). With max=2 the third concurrent query queued on
  // `connect_timeout: 10` and threw under burst - silent tail-latency tax.
  // Postgres plan headroom: 100 max conns × 5 per instance = room for 20
  // concurrent lambdas before pool saturation.
  const poolMax = computePoolMax(process.env);

  const configuredIdleTimeout = Number.parseInt(
    process.env.DATABASE_IDLE_TIMEOUT_SECONDS ?? '',
    10
  );
  const idleTimeout =
    Number.isFinite(configuredIdleTimeout) && configuredIdleTimeout > 0
      ? configuredIdleTimeout
      : 10;

  if (g.__keyword_pro_sql_client__ && g.__keyword_pro_db__) {
    const existingMax = Number(
      (g.__keyword_pro_sql_client__ as any)?.options?.max ?? 0
    );
    const existingIdle = Number(
      (g.__keyword_pro_sql_client__ as any)?.options?.idle_timeout ?? 0
    );

    if (existingMax === poolMax && existingIdle === idleTimeout) {
      return g.__keyword_pro_db__;
    }

    // If pool settings changed during dev HMR, recycle stale clients so we
    // don't keep old connection pressure alive.
    await g.__keyword_pro_sql_client__.end({ timeout: 5 });
    g.__keyword_pro_sql_client__ = undefined;
    g.__keyword_pro_db__ = undefined;
  }

  // `ssl: 'require'` overrides whatever `sslmode=` the connection string
  // carries, so the explicit deployment setting wins deterministically.
  const sslOption = computeDatabaseSsl(process.env);

  const client =
    g.__keyword_pro_sql_client__ ??
    postgres(connectionString, {
      prepare: false,
      ssl: sslOption,
      // Keep connection pressure low in dev and small DB plans.
      max: poolMax,
      idle_timeout: idleTimeout,
      connect_timeout: 10,
    });
  const db = drizzle(client, { schema });

  // Keep a stable singleton in long-lived runtimes and during Next.js dev HMR.
  g.__keyword_pro_sql_client__ = client;
  g.__keyword_pro_db__ = db;

  return db;
}

/**
 * Database connection with Drizzle
 * https://orm.drizzle.team/docs/connect-overview
 *
 * Drizzle <> PostgreSQL
 * https://orm.drizzle.team/docs/get-started-postgresql
 *
 * Get Started with Drizzle and Neon
 * https://orm.drizzle.team/docs/get-started/neon-new
 *
 * Drizzle with Neon Postgres
 * https://orm.drizzle.team/docs/tutorials/drizzle-with-neon
 *
 * Drizzle <> Neon Postgres
 * https://orm.drizzle.team/docs/connect-neon
 */
