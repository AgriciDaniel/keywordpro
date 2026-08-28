/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from 'node:crypto';

import { buildSyntheticDemoResult } from './lib/synthetic-demo';

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

async function main() {
  const first = await buildSyntheticDemoResult();
  const second = await buildSyntheticDemoResult();
  const firstBytes = JSON.stringify(first);
  const secondBytes = JSON.stringify(second);
  const response = first.response as {
    data?: {
      count?: number;
      meta?: {
        panels?: Record<string, unknown>;
        sources?: Array<{ ok?: boolean }>;
        totalCost?: number;
      };
      results?: Array<Record<string, unknown>>;
    };
  };
  const data = response.data;
  const panels = data?.meta?.panels ?? {};
  const sources = data?.meta?.sources ?? [];
  const digest = createHash('sha256').update(firstBytes).digest('hex');

  check('the synthetic demo is byte-deterministic', firstBytes === secondBytes);
  check('the demo produces at least twenty keyword rows', (data?.count ?? 0) >= 20);
  check('the demo records all nineteen report sources', sources.length === 19);
  check('every synthetic source completes without a provider call', sources.every((source) => source.ok));
  check('the demo report records zero provider cost', data?.meta?.totalCost === 0);
  check('the demo includes interest-over-time data', Boolean(panels.googleTrends && panels.dataforseoTrends));
  check('the demo includes historical keyword data', Boolean(panels.historical));
  check('the demo includes audience and regional data', Boolean(panels.demography && panels.subregions));
  check('the demo includes SERP and autocomplete data', Boolean(panels.serp && panels.autocomplete));
  check('stored rows exclude untouched provider records', (data?.results ?? []).every((row) => row._full === undefined));
  check('the demo contains only reserved external domains', !/https?:\/\/(?![^/]*\.invalid(?:[/:]|$))/.test(firstBytes));

  process.stdout.write(`\nSynthetic demo SHA-256: ${digest}\n`);
  process.stdout.write(`${passed} passed, ${failures.length} failed\n`);
  for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown verification error.';
  process.stderr.write(`Synthetic demo verification failed: ${message}\n`);
  process.exit(1);
});
