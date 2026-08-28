'use client';

import type { SourceReport } from '@/lib/research/keyword-merge';
import { cn } from '@/lib/utils';
import { AlertTriangle, Check, Loader2, Minus, Receipt } from 'lucide-react';
import { useState } from 'react';

const GROUP_LABELS: Record<string, string> = {
  spine: 'Keyword data',
  demand: 'Demand over time',
  'cross-engine': 'Other engines',
  serp: 'Search results',
  other: 'Other',
};

/**
 * What the keyword bundle's merge reports per endpoint.
 */
export type ReportSource = Omit<SourceReport, 'group'> & { group: string };

/**
 * What the search actually did, and what it cost.
 *
 * A one-box search fires up to nineteen billed calls. Without this the user has no
 * way to tell a clean run from one where fifteen endpoints failed on an
 * unactivated subscription: both produce a keyword table, and both are
 * charged. Collapsed by default, because the answer is usually "it worked".
 */
export function RunReport({
  progress,
  sources,
  totalCost,
}: {
  /** Present while the run streams: turns the receipt into a progress line. */
  progress?: { done: number; total: number; current: string | null } | null;
  sources: ReportSource[];
  totalCost: number | null;
}) {
  const [open, setOpen] = useState(false);
  if (sources.length === 0 && !progress) return null;

  const failed = sources.filter((source) => !source.ok);
  const empty = sources.filter(
    (source) => source.ok && returnedCount(source) === 0,
  );
  const withData = sources.length - failed.length - empty.length;
  const grouped = new Map<string, ReportSource[]>();
  for (const source of sources) {
    const key = source.group ?? 'other';
    grouped.set(key, [...(grouped.get(key) ?? []), source]);
  }

  return (
    <section className="min-w-0 rounded-2xl border border-white/8 bg-[#1A1A19]">
      {progress ? (
        // A thin bar that fills as calls finish, so the receipt reads as a
        // progress line while the run is streaming.
        <div className="h-0.5 w-full overflow-hidden rounded-t-2xl bg-white/[0.05]">
          <div
            className="h-full bg-[#F2A65A] transition-[width] duration-500"
            style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
          />
        </div>
      ) : null}
      <button
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-white/[0.02]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {progress ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-[#F2A65A]" />
        ) : (
          <Receipt className="size-3.5 shrink-0 text-[#F2A65A]" />
        )}
        <span className="font-medium text-[#EDE7DC] text-xs">
          {progress
            ? `Running ${progress.done} of ${progress.total} endpoints`
            : `${withData} with data${empty.length > 0 ? `, ${empty.length} empty` : ''}${failed.length > 0 ? `, ${failed.length} failed` : ''}`}
        </span>
        {progress?.current ? (
          <span className="truncate text-[#9F9A92] text-[11px]">· {progress.current}</span>
        ) : null}
        {failed.length > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#E08A7A]/35 bg-[#E08A7A]/10 px-2 py-0.5 text-[#E08A7A] text-[10px]">
            <AlertTriangle className="size-2.5" />
            {failed.length} failed
          </span>
        ) : null}
        {empty.length > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[#9F9A92] text-[10px]">
            <Minus className="size-2.5" />
            {empty.length} empty
          </span>
        ) : null}
        <span className="ml-auto shrink-0 tabular-nums text-[#9F9A92] text-[11px]">
          {totalCost !== null
            ? totalCost < 0.01
              ? '<$0.01'
              : `$${totalCost.toFixed(3)}`
            : ''}
        </span>
        <span className="shrink-0 text-[#5E5A54] text-[10px]">
          {open ? 'Hide' : 'Details'}
        </span>
      </button>

      {open ? (
        <div className="grid gap-3 border-white/8 border-t p-3">
          {[...grouped.entries()].map(([group, entries]) => (
            <div className="grid gap-1" key={group}>
              <div className="text-[#7D7870] text-[10px] uppercase tracking-[0.1em]">
                {GROUP_LABELS[group] ?? group}
              </div>
              {entries.map((source) => (
                <div
                  className="flex items-baseline gap-2 border-white/5 border-b py-1 text-[11px] last:border-0"
                  key={source.type}
                >
                  {!source.ok ? (
                    <AlertTriangle className="size-3 shrink-0 text-[#E08A7A]" />
                  ) : returnedCount(source) === 0 ? (
                    <Minus className="size-3 shrink-0 text-[#7D7870]" />
                  ) : (
                    <Check className="size-3 shrink-0 text-[#6FBF8B]" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-[#D7D1C8]">
                    {source.label}
                    {source.error ? (
                      <span className="ml-1.5 text-[#E08A7A]">
                        {source.error}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 tabular-nums text-[10px]',
                      source.contributed > 0
                        ? 'text-[#9F9A92]'
                        : 'text-[#5E5A54]',
                    )}
                    title="Rows this endpoint added or filled in"
                  >
                    {returnedCount(source) === 0
                      ? 'no data'
                      : source.contributed > 0
                        ? `+${source.contributed}`
                        : 'no new fields'}
                  </span>
                  <span className="w-14 shrink-0 text-right tabular-nums text-[#7D7870] text-[10px]">
                    {source.cost !== null ? `$${source.cost.toFixed(4)}` : ''}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function returnedCount(source: ReportSource): number {
  // Saved reports created before this field existed still carry contribution
  // counts, which are the closest truthful fallback available.
  return source.returned ?? source.contributed;
}
