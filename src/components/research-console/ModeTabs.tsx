'use client';

import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

export type ResearchCommandMode = 'keyword';

export type ModeTabOption = {
  label: string;
  value: ResearchCommandMode;
  /**
   * Set to lock the tab: it renders dimmed with a padlock, ignores clicks
   * and its shortcut, and shows this text on hover ("Coming soon").
   */
  locked?: string;
};

function ModeIcon({ mode }: { mode: ResearchCommandMode }) {
  void mode;
  return <Search className="size-3.5" />;
}

export function ModeTabs({
  mode,
  onChange,
  options,
}: {
  mode: ResearchCommandMode;
  onChange: (mode: ResearchCommandMode) => void;
  options: ModeTabOption[];
}) {
  return (
    <div
      aria-label="Keyword mode"
      className="inline-flex rounded-2xl border border-white/10 bg-[#1D1D1C] p-1"
      role="tablist"
    >
      {options.map((option, index) => {
        const active = mode === option.value;
        const locked = option.locked ?? null;
        return (
          <span className="group/tab relative inline-flex" key={option.value}>
            <button
              aria-disabled={locked !== null}
              aria-label={
                locked
                  ? `${option.label}, ${locked.toLowerCase()}`
                  : `${option.label}, shortcut ${index + 1}`
              }
              aria-selected={active}
              className={cn(
                'group inline-flex h-9 items-center justify-center overflow-hidden rounded-xl text-sm transition-[background-color,color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A65A]/55',
                active
                  ? 'gap-1.5 bg-[#EDE7DC] px-3 text-[#171512]'
                  : locked
                    ? 'w-9 cursor-not-allowed px-0 text-white/28'
                    : 'w-9 px-0 text-white/54 hover:bg-white/[0.055] hover:text-white/86',
              )}
              onClick={() => {
                if (!locked) onChange(option.value);
              }}
              role="tab"
              title={locked ?? `${option.label} (${index + 1})`}
              type="button"
            >
              <ModeIcon mode={option.value} />
              <span
                className={cn(
                  'whitespace-nowrap transition duration-200 ease-out',
                  active
                    ? 'max-w-24 translate-x-0 opacity-100'
                    : 'max-w-0 translate-x-1 opacity-0',
                )}
              >
                {option.label}
              </span>
            </button>
            {locked ? (
              <>
                {/* Hover label. A native title takes a second to appear and
                    reads as an afterthought; this one is immediate. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#252524] px-2.5 py-1 text-[#EDE7DC] text-[11px] opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-opacity duration-150 group-hover/tab:opacity-100"
                >
                  {option.label} · {locked}
                </span>
              </>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
