import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { sql } from 'drizzle-orm';

// Health check for external uptime monitors (UptimeRobot, Better Stack, etc.)
// and Railway's internal healthcheck.
//
// GET  - deep check: pings DB via `SELECT 1`. Returns 503 if dependencies fail
//        so uptime monitors page on real outages, not just process death.
// HEAD - liveness only: returns 200 if the process is serving HTTP. Lighter;
//        appropriate for sub-minute polling.
//
// Never cached. Not logged on every hit (monitor polling would flood Axiom
// at ~8k hits/month per minute-polled monitor). Relies on HTTP status code.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  const dbStart = Date.now();
  try {
    const db = await getDb();
    await db.execute(sql`SELECT 1`);
    checks.db = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.db = {
      ok: false,
      latencyMs: Date.now() - dbStart,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      ts: new Date().toISOString(),
      checks,
    },
    {
      status: allOk ? 200 : 503,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  );
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
