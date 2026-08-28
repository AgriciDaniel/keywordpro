'use client';

import { cn } from '@/lib/utils';
import { compactNumber } from '../format';
import { ACCENT_RAMP } from './palette';
import type { RankedItem } from './analytics';

/**
 * A ranked horizontal bar list.
 *
 * Hand-built rather than drawn by a charting library, the same way the
 * reference app builds "Top Videos by Views": rank, label, a proportional
 * bar, and the value on the right. For a top-N list that is all a bar chart
 * would give, and this version keeps the label selectable, truncates
 * gracefully, needs no client-side layout pass, and renders on the server.
 */
export function RankedBars({
  emptyLabel = 'No data',
  items,
  tone = 'accent',
}: {
  emptyLabel?: string;
  items: RankedItem[];
  tone?: 'accent' | 'positive';
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-[#5E5A54] text-xs">{emptyLabel}</p>;
  }

  return (
    <ol className="grid gap-2.5">
      {items.map((item, index) => (
        <li className="group grid gap-1" key={`${item.label}-${index}`}>
          <div className="flex items-baseline gap-2">
            <span className="w-4 shrink-0 tabular-nums text-[#5E5A54] text-[10px]">
              {index + 1}
            </span>
            <span
              className="min-w-0 flex-1 truncate text-[#D7D1C8] text-xs"
              title={item.label}
            >
              {item.label}
            </span>
            {item.meta ? (
              <span className="shrink-0 text-[#7D7870] text-[10px] tabular-nums">
                {item.meta}
              </span>
            ) : null}
            <span className="shrink-0 tabular-nums text-[#EDE7DC] text-xs">
              {compactNumber(item.value)}
            </span>
          </div>
          <div className="ml-6 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none',
              )}
              style={{
                width: `${Math.max(2, Math.min(100, item.share))}%`,
                backgroundColor:
                  tone === 'positive'
                    ? '#6FBF8B'
                    : (ACCENT_RAMP[index] ?? ACCENT_RAMP[ACCENT_RAMP.length - 1]),
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
