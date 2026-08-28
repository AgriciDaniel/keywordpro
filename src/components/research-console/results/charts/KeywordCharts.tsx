'use client';

import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Cell,
  Pie,
  PieChart,
  ReferenceArea,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { compactNumber, currency } from '../format';
import type { MonthPoint, ScatterPoint, Slice } from './analytics';
import type { TimePoint } from './panels';
import { CHART_INK, intentColor } from './palette';
import { useMeasuredWidth } from './useMeasuredWidth';

/**
 * The charts that need a real plotting engine.
 *
 * Everything that can be drawn with a div or a polyline already is: the
 * sparklines, the meter bars and the ranked lists. What is left genuinely
 * needs axes, scales and hit-testing, which is what Recharts is here for. The
 * whole module is loaded on demand by KeywordDashboard so it costs nothing on
 * a route that shows no results.
 */

const AXIS_TICK = { fill: CHART_INK.axis, fontSize: 10 };

function TooltipShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-lg border px-2.5 py-2 text-[11px] shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
      style={{
        background: CHART_INK.surfaceRaised,
        borderColor: CHART_INK.border,
        color: CHART_INK.strong,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Gives a chart a definite pixel width before it renders.
 *
 * Recharts wants real numbers, not percentages. Measuring the box ourselves
 * (see useMeasuredWidth) keeps the chart size an ordinary prop rather than
 * something the library discovers on its own, which makes the render
 * deterministic and easy to reason about. Nothing draws until the width is
 * known, so a chart can never lay out against a zero-width parent.
 */
function Sized({
  children,
  height,
}: {
  children: (width: number) => ReactNode;
  height: number;
}) {
  const [ref, width] = useMeasuredWidth<HTMLDivElement>();
  return (
    <div className="w-full min-w-0" ref={ref} style={{ height }}>
      {width > 0 ? children(width) : null}
    </div>
  );
}

/**
 * Total monthly searches across every keyword in the set.
 *
 * This is the chart behind the MoM/QoQ/YoY figures in the tiles: the
 * percentages say the topic moved, this says when and by how much. Coverage
 * is surfaced in the tooltip because the earliest and latest months are often
 * reported by only a handful of keywords, which would otherwise read as a
 * collapse in demand rather than a gap in the data.
 */
export function TrendArea({ data }: { data: MonthPoint[] }) {
  if (data.length < 2) return <ChartEmpty label="No monthly history in this result" />;

  const maxCoverage = Math.max(...data.map((point) => point.coverage));

  return (
    <Sized height={210}>
      {(width) => (
      <AreaChart data={data} height={210} margin={{ top: 6, right: 6, bottom: 0, left: 0 }} width={width}>
        <defs>
          <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#F2A65A" stopOpacity={0.42} />
            <stop offset="100%" stopColor="#F2A65A" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART_INK.grid} vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="label"
          // A 92-month series would print every label on top of the next.
          interval="preserveStartEnd"
          minTickGap={28}
          tick={AXIS_TICK}
          tickLine={false}
        />
        <YAxis
          axisLine={false}
          tick={AXIS_TICK}
          tickFormatter={(value: number) => compactNumber(value)}
          tickLine={false}
          width={46}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0].payload as MonthPoint;
            return (
              <TooltipShell>
                <div className="font-medium">{point.label}</div>
                <div style={{ color: CHART_INK.label }}>
                  {compactNumber(point.volume)} searches
                </div>
                {point.coverage < maxCoverage ? (
                  <div style={{ color: CHART_INK.axis }}>
                    {point.coverage} of {maxCoverage} keywords reported
                  </div>
                ) : null}
              </TooltipShell>
            );
          }}
          cursor={{ stroke: CHART_INK.grid }}
        />
        {/*
          Animation off: Recharts tweens from a zero-length path on mount, and
          an abandoned tween leaves the area with an empty `d` and the chart
          blank. A chart that redraws on every sort wants no entrance animation
          anyway.
        */}
        <Area
          dataKey="volume"
          fill="url(#trendFill)"
          isAnimationActive={false}
          stroke="#F2A65A"
          strokeWidth={1.6}
          type="monotone"
        />
      </AreaChart>
      )}
    </Sized>
  );
}

/** A categorical split. Donut rather than pie so the total can sit inside. */
export function SplitDonut({
  data,
  total,
  totalLabel,
}: {
  data: Slice[];
  total: number;
  totalLabel: string;
}) {
  if (data.length === 0) return <ChartEmpty label="No breakdown available" />;

  return (
    <div className="relative">
      <Sized height={190}>
        {(width) => (
        <PieChart height={190} width={width}>
          {/* Animation off for the same reason as the area above: an
              abandoned mount tween leaves every sector with an empty path. */}
          <Pie
            cx="50%"
            cy="50%"
            data={data}
            dataKey="value"
            innerRadius={52}
            isAnimationActive={false}
            nameKey="name"
            outerRadius={78}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((slice) => (
              <Cell fill={slice.color} key={slice.name} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const slice = payload[0].payload as Slice;
              const share = total > 0 ? Math.round((slice.value / total) * 100) : 0;
              return (
                <TooltipShell>
                  <div className="font-medium capitalize">{slice.name}</div>
                  <div style={{ color: CHART_INK.label }}>
                    {slice.value} keywords · {share}%
                  </div>
                </TooltipShell>
              );
            }}
          />
        </PieChart>
        )}
      </Sized>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-medium text-[#EDE7DC] text-lg tabular-nums">
          {total}
        </span>
        <span className="text-[#7D7870] text-[10px] uppercase tracking-[0.1em]">
          {totalLabel}
        </span>
      </div>
    </div>
  );
}

/** The legend for a donut, as a list so long category names can wrap. */
export function SplitLegend({ data, total }: { data: Slice[]; total: number }) {
  return (
    <ul className="grid gap-1">
      {data.map((slice) => (
        <li className="flex items-center gap-2 text-[11px]" key={slice.name}>
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: slice.color }}
          />
          <span className="min-w-0 flex-1 truncate capitalize text-[#C9C4BC]">
            {slice.name}
          </span>
          <span className="shrink-0 tabular-nums text-[#7D7870]">
            {total > 0 ? Math.round((slice.value / total) * 100) : 0}%
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Volume against difficulty: the opportunity map.
 *
 * Volume is on a log scale because a keyword set routinely spans three orders
 * of magnitude, and on a linear axis one head term flattens everything else
 * onto the floor. Dot area encodes CPC and colour encodes intent.
 *
 * The opportunity is the top-left: more demand than most of the set, for less
 * difficulty than most of the set. That quadrant is shaded, split at the
 * medians rather than fixed thresholds, so it stays meaningful whether the
 * set is 30 long-tail questions or 300 head terms.
 *
 * Both axes carry padding so a dot sitting exactly on KD 0 or KD 100 (which
 * real sets do, in numbers) is drawn whole instead of sliced by the plot edge.
 */
export function OpportunityScatter({
  data,
  medianDifficulty = null,
  medianVolume = null,
}: {
  data: ScatterPoint[];
  medianDifficulty?: number | null;
  medianVolume?: number | null;
}) {
  if (data.length === 0) {
    return <ChartEmpty label="Needs both volume and difficulty" />;
  }

  const maxVolume = Math.max(...data.map((point) => point.volume));
  // The quadrant runs to the plot edges, into the axis padding, rather than
  // stopping at the origin and the largest value: x1 is left unset (Recharts
  // fills in the axis start) and y2 overshoots the top, with the overflow
  // clipped. y2 cannot be left unset, that fills to the axis start, the floor.
  // Ticks at every power of ten up to the largest value, so a log axis reads
  // as decades rather than whatever the scale happens to pick.
  const ticks: number[] = [];
  for (let tick = 1; tick <= maxVolume; tick *= 10) ticks.push(tick);
  const inSweetSpot = (point: ScatterPoint) =>
    medianDifficulty !== null &&
    medianVolume !== null &&
    point.difficulty <= medianDifficulty &&
    point.volume >= medianVolume;
  const sweetSpotCount = data.filter(inSweetSpot).length;
  const showQuadrant =
    medianDifficulty !== null && medianVolume !== null && sweetSpotCount > 0;

  return (
    <Sized height={260}>
      {(width) => (
      <ScatterChart height={260} margin={{ top: 8, right: 12, bottom: 18, left: 0 }} width={width}>
        <CartesianGrid stroke={CHART_INK.grid} />
        <XAxis
          axisLine={false}
          dataKey="difficulty"
          domain={[0, 100]}
          label={{
            value: 'Keyword difficulty',
            position: 'insideBottom',
            offset: -12,
            fill: CHART_INK.axis,
            fontSize: 10,
          }}
          padding={{ left: 14, right: 14 }}
          tick={AXIS_TICK}
          tickLine={false}
          ticks={[0, 25, 50, 75, 100]}
          type="number"
        />
        <YAxis
          axisLine={false}
          dataKey="volume"
          domain={[1, maxVolume]}
          padding={{ top: 12, bottom: 12 }}
          scale="log"
          tick={AXIS_TICK}
          tickFormatter={(value: number) => compactNumber(value)}
          tickLine={false}
          ticks={ticks}
          type="number"
          width={48}
        />
        <ZAxis dataKey="cpc" range={[36, 300]} type="number" />
        {showQuadrant ? (
          <>
            <ReferenceArea
              fill={CHART_INK.sweetSpot}
              fillOpacity={0.07}
              ifOverflow="hidden"
              stroke="none"
              x2={medianDifficulty}
              y1={medianVolume}
              y2={maxVolume * 10}
            />
            <ReferenceLine
              label={{
                // On the line rather than the area: the area overshoots the
                // plot on purpose, so a label anchored to it would be clipped.
                value: `${sweetSpotCount} in the sweet spot`,
                position: 'insideTopRight',
                fill: CHART_INK.sweetSpot,
                fontSize: 10,
                offset: 6,
              }}
              stroke={CHART_INK.label}
              strokeDasharray="3 4"
              strokeOpacity={0.45}
              x={medianDifficulty}
            />
            <ReferenceLine
              stroke={CHART_INK.label}
              strokeDasharray="3 4"
              strokeOpacity={0.45}
              y={medianVolume}
            />
          </>
        ) : null}
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0].payload as ScatterPoint;
            return (
              <TooltipShell>
                <div className="max-w-56 font-medium">{point.keyword}</div>
                <div style={{ color: CHART_INK.label }}>
                  {compactNumber(point.volume)} searches · KD{' '}
                  {Math.round(point.difficulty)}
                </div>
                <div style={{ color: CHART_INK.axis }}>
                  {currency(point.cpc)} CPC · {point.intent}
                </div>
              </TooltipShell>
            );
          }}
          cursor={{ strokeDasharray: '3 3', stroke: CHART_INK.grid }}
        />
        <Scatter data={data} isAnimationActive={false}>
          {data.map((point, index) => (
            <Cell
              fill={intentColor(point.intent)}
              fillOpacity={0.55}
              key={`${point.keyword}-${index}`}
              stroke={intentColor(point.intent)}
              strokeOpacity={0.9}
            />
          ))}
        </Scatter>
      </ScatterChart>
      )}
    </Sized>
  );
}


/**
 * Relative interest, from two independent panels.
 *
 * Google Trends and DataForSEO Trends both index to 100 at their own peak, so
 * the two lines are comparable in shape but not in level. Drawn together
 * because disagreement between them is itself the signal: Google's sample is
 * search-log based, DataForSEO's is clickstream.
 */
export function InterestLines({
  dataforseo,
  google,
}: {
  dataforseo: TimePoint[];
  google: TimePoint[];
}) {
  // Merged by calendar date, not array position. The two providers sample on
  // different schedules and return different point counts, so index-pairing
  // put one series' July beside the other's December on the axis.
  const merged = new Map<
    string,
    { date: string; label: string; google?: number; dfs?: number }
  >();
  const upsert = (point: TimePoint, key: 'google' | 'dfs') => {
    const entry = merged.get(point.date) ?? {
      date: point.date,
      label: point.label,
    };
    entry[key] = point.value;
    merged.set(point.date, entry);
  };
  for (const point of google) upsert(point, 'google');
  for (const point of dataforseo) upsert(point, 'dfs');
  const data = [...merged.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (data.length < 2) return <ChartEmpty label="No interest history returned" />;

  return (
    <Sized height={200}>
      {(width) => (
        <LineChart
          data={data}
          height={200}
          margin={{ top: 6, right: 6, bottom: 0, left: 0 }}
          width={width}
        >
          <CartesianGrid stroke={CHART_INK.grid} vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            interval="preserveStartEnd"
            minTickGap={28}
            tick={AXIS_TICK}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            domain={[0, 100]}
            tick={AXIS_TICK}
            tickLine={false}
            width={32}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <TooltipShell>
                  <div className="font-medium">{String(label)}</div>
                  {payload.map((entry) => (
                    <div key={String(entry.dataKey)} style={{ color: entry.color }}>
                      {entry.name}: {Math.round(Number(entry.value))}
                    </div>
                  ))}
                </TooltipShell>
              );
            }}
            cursor={{ stroke: CHART_INK.grid }}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: CHART_INK.label, fontSize: 10 }}>
                {value}
              </span>
            )}
            iconSize={8}
          />
          <Line
            connectNulls
            dataKey="google"
            dot={false}
            isAnimationActive={false}
            name="Google Trends"
            stroke="#F2A65A"
            strokeWidth={1.6}
            type="monotone"
          />
          <Line
            connectNulls
            dataKey="dfs"
            dot={false}
            isAnimationActive={false}
            name="DataForSEO Trends"
            stroke="#7FA8D9"
            strokeWidth={1.6}
            type="monotone"
          />
        </LineChart>
      )}
    </Sized>
  );
}

/**
 * The seed keyword's own history: volume as an area, CPC as a line on its own
 * axis. They move independently, and a term getting cheaper while demand grows
 * is exactly the moment worth acting on.
 */
export function HistoryChart({
  data,
}: {
  data: Array<{ label: string; volume: number | null; cpc: number | null }>;
}) {
  if (data.length < 2) return <ChartEmpty label="No history returned" />;

  return (
    <Sized height={200}>
      {(width) => (
        <AreaChart
          data={data}
          height={200}
          margin={{ top: 6, right: 6, bottom: 0, left: 0 }}
          width={width}
        >
          <defs>
            <linearGradient id="historyFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6FBF8B" stopOpacity={0.34} />
              <stop offset="100%" stopColor="#6FBF8B" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_INK.grid} vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            interval="preserveStartEnd"
            minTickGap={28}
            tick={AXIS_TICK}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={AXIS_TICK}
            tickFormatter={(value: number) => compactNumber(value)}
            tickLine={false}
            width={44}
            yAxisId="volume"
          />
          <YAxis
            axisLine={false}
            orientation="right"
            tick={AXIS_TICK}
            tickFormatter={(value: number) => currency(value)}
            tickLine={false}
            width={44}
            yAxisId="cpc"
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as {
                volume: number | null;
                cpc: number | null;
                competition: number | null;
              };
              return (
                <TooltipShell>
                  <div className="font-medium">{String(label)}</div>
                  <div style={{ color: CHART_INK.label }}>
                    {compactNumber(point.volume)} searches
                  </div>
                  <div style={{ color: CHART_INK.axis }}>
                    {currency(point.cpc)} CPC
                    {point.competition !== null
                      ? ` · competition ${Math.round(point.competition * 100)}`
                      : ''}
                  </div>
                </TooltipShell>
              );
            }}
            cursor={{ stroke: CHART_INK.grid }}
          />
          <Area
            connectNulls
            dataKey="volume"
            fill="url(#historyFill)"
            isAnimationActive={false}
            stroke="#6FBF8B"
            strokeWidth={1.4}
            type="monotone"
            yAxisId="volume"
          />
          <Line
            connectNulls
            dataKey="cpc"
            dot={false}
            isAnimationActive={false}
            stroke="#E8B673"
            strokeWidth={1.4}
            type="monotone"
            yAxisId="cpc"
          />
        </AreaChart>
      )}
    </Sized>
  );
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-40 items-center justify-center text-[#5E5A54] text-xs">
      {label}
    </div>
  );
}
