'use client';

import { PlusIcon } from 'lucide-react';
import * as React from 'react';

/**
 * The spinning dashed rings with a cycling word, from the owner's component
 * library, recoloured to the console's palette. The word cycle is what a
 * long run needs: it says "still alive" without pretending to know the
 * percentage.
 */

type LoadingProps = {
  screenHFull?: boolean;
  /** The step in flight, shown under the cycling word. */
  label?: string | null;
  className?: string;
};

const PHASES: Array<{ state: string; text: string; color: string }> = [
  { state: '_', text: 'Fetching', color: '#6FBF8B' },
  { state: '__', text: 'Fetching', color: '#6FBF8B' },
  { state: '.', text: 'Loading', color: '#7FA8D9' },
  { state: '..', text: 'Merging', color: '#E8B673' },
  { state: '...', text: 'Drawing', color: '#F2A65A' },
];

export function Loading({ screenHFull = true, label = null, className }: LoadingProps) {
  const [phase, setPhase] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setPhase((current) => (current + 1) % PHASES.length);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const current = PHASES[phase];

  return (
    <div
      className={`${screenHFull ? 'min-h-screen' : ''} relative flex flex-col items-center justify-center ${className ?? ''}`}
    >
      <div
        className="animate-spin rounded-full border border-dashed p-1"
        style={{ borderColor: current.color, color: current.color }}
      >
        <div
          className="flex size-16 animate-spin items-center justify-center rounded-full border-4 border-dashed"
          style={{ borderColor: current.color }}
        >
          <PlusIcon />
        </div>
      </div>

      <p className="mt-3 text-center font-bold text-[#C9C4BC] text-sm uppercase tracking-widest">
        {current.text}
        <span className="ml-1" style={{ color: current.color }}>
          {current.state}
        </span>
      </p>
      {label ? (
        <p className="mt-1 max-w-[36ch] truncate text-center text-[#7D7870] text-[11px]">
          {label}
        </p>
      ) : null}
    </div>
  );
}
