import { cn } from '@/lib/utils';

/**
 * A volume history, drawn inline.
 *
 * Deliberately hand-written SVG rather than a charting library. A 100-row
 * table means 100 of these; a canvas chart instance each would block the main
 * thread for hundreds of milliseconds on first paint and leak on unmount. This
 * is a `<polyline>`, needs no client JavaScript, and renders on the server.
 *
 * The series can be 12 points or 92 depending on the endpoint, so the
 * viewBox is normalised rather than fixed to a point count.
 */
export function Sparkline({
  className,
  height = 22,
  values,
  width = 72,
}: {
  className?: string;
  height?: number;
  values: number[];
  width?: number;
}) {
  if (values.length < 2) {
    return <span className="text-[#5E5A54] text-xs">-</span>;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);

  // SVG y grows downward, so invert. Inset by 1px top and bottom to keep the
  // stroke from being clipped at the extremes.
  const inset = 1;
  const usable = height - inset * 2;
  const points = values.map((value, index) => {
    const x = index * step;
    const y = inset + usable - ((value - min) / span) * usable;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const rising = values[values.length - 1] >= values[0];
  const stroke = rising ? '#6FBF8B' : '#E08A7A';
  const lastPoint = points[points.length - 1].split(',');

  return (
    <svg
      aria-hidden="true"
      className={cn('block overflow-visible', className)}
      height={height}
      preserveAspectRatio="none"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <polyline
        fill="none"
        points={points.join(' ')}
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.25}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastPoint[0]} cy={lastPoint[1]} fill={stroke} r={1.6} />
    </svg>
  );
}

/** A 0-100 measure as a track and fill. Cheaper and calmer than a chart. */
export function MeterBar({
  max = 100,
  tone = 'neutral',
  value,
}: {
  max?: number;
  tone?: 'neutral' | 'difficulty';
  value: number | null;
}) {
  if (value === null) return <span className="text-[#5E5A54]">-</span>;

  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  // Difficulty reads the opposite way round to most measures: high is bad.
  const fill =
    tone === 'difficulty'
      ? pct >= 67
        ? 'bg-[#E08A7A]'
        : pct >= 34
          ? 'bg-[#E8B673]'
          : 'bg-[#6FBF8B]'
      : 'bg-[#8E8880]';

  return (
    <span className="flex items-center gap-1.5">
      <span className="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-white/10">
        <span
          className={cn('block h-full rounded-full', fill)}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="tabular-nums text-[11px] text-[#C9C4BC]">
        {Math.round(value)}
      </span>
    </span>
  );
}
