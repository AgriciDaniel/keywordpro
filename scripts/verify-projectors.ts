/**
 * Free verification that the DataForSEO envelope unwrap works.
 *
 * Replays realistic v3 envelopes (shaped per the schema in the DataForSEO
 * Brain) through the real endpoint definitions and asserts the projector
 * produces a non-empty result.
 *
 * Before the unwrap landed, most of these returned `count: 0` or threw,
 * because the projectors received `{version, status_code, tasks:[…]}` when
 * they expected `tasks[0].result[0]`. The script prints both paths so the
 * difference stays visible.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/verify-projectors.ts
 */
import { getEndpointByType } from '@/lib/research/endpoints';
import { unwrapProviderResult } from '@/lib/research/unwrap';

/** A DataForSEO v3 transport envelope wrapping the given task result. */
const envelope = (result: unknown[] | null, statusCode = 20000) => ({
  version: '0.1.20260101',
  status_code: 20000,
  status_message: 'Ok.',
  cost: 0.002,
  tasks_count: 1,
  tasks_error: 0,
  tasks: [
    {
      id: '01011234-1234-0066-0000-abcdefabcdef',
      status_code: statusCode,
      status_message: statusCode === 20000 ? 'Ok.' : 'Invalid Field: target.',
      cost: 0.002,
      result_count: result ? result.length : 0,
      path: ['v3', 'serp', 'google', 'organic', 'live', 'advanced'],
      data: { api: 'serp', function: 'live' },
      result,
    },
  ],
});

const serpItems = [
  {
    type: 'organic', rank_absolute: 1, title: 'Best Canva Alternatives',
    url: 'https://a.com/1', domain: 'a.com', description: 'A list.',
    breadcrumb: 'a.com > blog', rating: { value: 4.5, votes_count: 120 },
  },
  {
    type: 'organic', rank_absolute: 2, title: 'Top 10 Design Tools',
    url: 'https://b.com/2', domain: 'b.com', description: 'Another list.',
    breadcrumb: 'b.com',
  },
  {
    type: 'organic', rank_absolute: 3, title: 'Figma vs Canva',
    url: 'https://c.com/3', domain: 'c.com', description: 'Comparison.',
    breadcrumb: 'c.com',
  },
];

const cases: Array<{ type: string; raw: unknown; why: string }> = [
  {
    type: 'serp.google.organic.live',
    why: 'P0, shaped SERP rows (9 endpoints)',
    raw: envelope([{ keyword: 'canva alternatives', se_results_count: 12_400_000, items_count: 3, items: serpItems }]),
  },
  {
    type: 'serp.google.dataset_search.live',
    why: 'P8, passthrough items, the single biggest projector (192 endpoints)',
    raw: envelope([{ items: serpItems }]),
  },
  {
    type: 'serp.google.dataset_info.live',
    why: 'P9, whole result as the payload (181 endpoints)',
    raw: envelope([{ title: 'A dataset', description: 'Some description', provider: 'x' }]),
  },
  {
    type: 'serp.google.organic.tasks_ready',
    why: 'P50, task lists, resultIsArray (95 endpoints)',
    raw: envelope([
      { id: 'task-1', se: 'google', date_posted: '2026-08-25', tag: 'a' },
      { id: 'task-2', se: 'google', date_posted: '2026-08-25', tag: 'b' },
    ]),
  },
  {
    type: 'serp.google.organic.task_post',
    why: 'P1, task_post acknowledgement (70 endpoints)',
    raw: envelope([{ id: 'task-1', status_message: 'Task Created.', cost: 0.002 }]),
  },
  {
    type: 'keyword.google_ads.search_volume.live',
    why: 'P12, search volume rows, resultIsArray (7 endpoints)',
    raw: envelope([
      { keyword: 'canva', search_volume: 30_400_000, cpc: 1.23, competition: 0.4, competition_index: 40, low_top_of_page_bid: 0.5, high_top_of_page_bid: 2.1, monthly_searches: [{ year: 2026, month: 7, search_volume: 30_400_000 }] },
      { keyword: 'canva alternatives', search_volume: 22_000, cpc: 3.1, competition: 0.8, competition_index: 80, low_top_of_page_bid: 1.2, high_top_of_page_bid: 5.4, monthly_searches: [] },
    ]),
  },
  {
    type: 'labs.google.related_keywords.live',
    why: 'P21, nested keyword_data flattening (4 endpoints)',
    raw: envelope([{ items: [
      { keyword_data: { keyword: 'canva pro', keyword_info: { search_volume: 9900, cpc: 2.2, competition_level: 'MEDIUM' }, search_intent_info: { main_intent: 'commercial' } } },
    ] }]),
  },
  {
    type: 'serp.google.maps.live',
    why: 'P3, maps listings (4 endpoints)',
    raw: envelope([{ items: [{ title: 'A Cafe', rating: { value: 4.6, votes_count: 88 }, address: '1 High St', domain: 'cafe.com' }] }]),
  },
];

let pass = 0;
const failures: string[] = [];

console.log('\nWith the unwrap:\n');
for (const { type, raw, why } of cases) {
  const endpoint = getEndpointByType(type);
  if (!endpoint) {
    failures.push(`${type}, not in the catalog`);
    console.log(`  MISSING  ${type}`);
    continue;
  }
  try {
    const projected = endpoint.project(
      unwrapProviderResult(raw, endpoint),
      endpoint.type,
      {} as never,
    ) as { count?: number; results?: unknown };
    const count = projected?.count ?? 0;
    if (count > 0) {
      pass += 1;
      const sample = Array.isArray(projected.results) ? projected.results[0] : projected.results;
      const fields = Object.keys((sample ?? {}) as object).slice(0, 6).join(', ');
      console.log(`  PASS  count=${String(count).padStart(3)}  ${type}`);
      console.log(`        ${why}`);
      console.log(`        fields: ${fields}`);
    } else {
      failures.push(`${type}, count 0`);
      console.log(`  FAIL  count=0    ${type}  (${why})`);
    }
  } catch (error) {
    failures.push(`${type}, ${(error as Error).message}`);
    console.log(`  THREW ${type}: ${(error as Error).message}`);
  }
}

console.log('\nWithout the unwrap, i.e. the behaviour this fixes:\n');
for (const { type, raw } of cases) {
  const endpoint = getEndpointByType(type);
  if (!endpoint) continue;
  try {
    const projected = endpoint.project(raw, endpoint.type, {} as never) as { count?: number };
    console.log(`  count=${String(projected?.count ?? 0).padStart(3)}  ${type}`);
  } catch (error) {
    console.log(`  THREW      ${type}: ${(error as Error).message.slice(0, 60)}`);
  }
}

// A failed task must surface the provider's message, not a silent empty success.
console.log('\nTask-level error handling:\n');
const failing = getEndpointByType('serp.google.organic.live');
if (failing) {
  try {
    unwrapProviderResult(envelope(null, 40501), failing);
    failures.push('a failed task did not throw');
    console.log('  FAIL  status 40501 did not throw');
  } catch (error) {
    console.log(`  PASS  status 40501 -> ${(error as Error).name}: ${(error as Error).message}`);
    pass += 1;
  }
}

console.log(`\n${pass} passed, ${failures.length} failed`);
for (const f of failures) console.log(`  - ${f}`);
process.exit(failures.length > 0 ? 1 : 0);
