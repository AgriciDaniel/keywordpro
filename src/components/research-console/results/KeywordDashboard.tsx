'use client';

import { cn } from '@/lib/utils';
import {
  Activity,
  BarChart3,
  Coins,
  Crosshair,
  Gauge,
  Hash,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { lazy, Suspense, useMemo } from 'react';
import {
  compactNumber,
  currency,
  signedPercent,
  trendTone,
} from './format';
import {
  computeKeywordAnalytics,
  type KeywordAnalytics,
  type Row,
} from './charts/analytics';
import { DIFFICULTY_COLORS, intentColor, TREND_COLORS } from './charts/palette';
import { RankedBars } from './charts/RankedBars';

/**
 * Recharts is ~100KB gzipped and only ever runs in the browser, so the whole
 * charting module is split out of the route bundle and each block sits on a
 * fixed-height skeleton until it arrives.
 *
 * `React.lazy` + `Suspense` rather than `next/dynamic`: these components are
 * client-only regardless, and the plain React path keeps the loading states
 * explicit at each use site.
 */
const chartsModule = () => import('./charts/KeywordCharts');

const TrendArea = lazy(() =>
  chartsModule().then((m) => ({ default: m.TrendArea })),
);
const SplitDonut = lazy(() =>
  chartsModule().then((m) => ({ default: m.SplitDonut })),
);
const SplitLegend = lazy(() =>
  chartsModule().then((m) => ({ default: m.SplitLegend })),
);
const OpportunityScatter = lazy(() =>
  chartsModule().then((m) => ({ default: m.OpportunityScatter })),
);

export function KeywordDashboard({ rows }: { rows: Row[] }) {
  const stats = useMemo(
    () =>
      computeKeywordAnalytics(rows, {
        intentColor,
        difficultyColors: DIFFICULTY_COLORS,
      }),
    [rows],
  );

  // Endpoints disagree on what they return: the Google Ads volume endpoint
  // carries no difficulty or intent at all. Rendering those panels anyway
  // would fill the dashboard with empty donuts, so each one earns its place.
  const hasTrend = stats.monthly.length >= 2;
  const hasIntent = stats.intentSplit.some((slice) => slice.name !== 'unknown');
  const hasDifficulty = stats.difficultyBands.length > 0;
  const hasScatter = stats.scatter.length > 0;
  const hasRanked = stats.topByVolume.length > 0;
  const difficultyScored = stats.difficultyBands.reduce(
    (sum, band) => sum + band.value,
    0,
  );

  return (
    <div className="grid gap-3">
      <StatRow stats={stats} />

      <div
        className={cn(
          'grid gap-3',
          hasTrend && hasIntent && 'lg:grid-cols-3',
        )}
      >
        {hasTrend ? (
        <Panel
          className={cn(hasIntent && 'lg:col-span-2')}
          icon={Activity}
          subtitle={
            stats.monthly.length > 0
              ? `${stats.monthly.length} months, summed across ${stats.count} keywords${
                  stats.partialMonths > 0
                    ? ` · ${stats.partialMonths} partially reported ${
                        stats.partialMonths === 1 ? 'month' : 'months'
                      } excluded`
                    : ''
                }`
              : undefined
          }
          title="Search demand over time"
        >
          <Suspense fallback={<ChartSkeleton height={210} />}>
            <TrendArea data={stats.monthly} />
          </Suspense>
        </Panel>
        ) : null}

        {hasIntent ? (
        <Panel icon={Crosshair} title="Search intent">
          <Suspense fallback={<ChartSkeleton height={190} />}>
            <SplitDonut
              data={stats.intentSplit}
              total={stats.count}
              totalLabel="keywords"
            />
            <div className="mt-2">
              <SplitLegend data={stats.intentSplit} total={stats.count} />
            </div>
          </Suspense>
        </Panel>
        ) : null}
      </div>

      {hasScatter || hasDifficulty ? (
      <div
        className={cn(
          'grid gap-3',
          hasScatter && hasDifficulty && 'lg:grid-cols-3',
        )}
      >
        {hasScatter ? (
        <Panel
          className={cn(hasDifficulty && 'lg:col-span-2')}
          icon={Sparkles}
          subtitle="Volume against difficulty. Dot size is CPC, colour is intent."
          title="Opportunity map"
        >
          <Suspense fallback={<ChartSkeleton height={260} />}>
            <OpportunityScatter
              data={stats.scatter}
              medianDifficulty={stats.medianDifficulty}
              medianVolume={stats.medianVolume}
            />
          </Suspense>
        </Panel>
        ) : null}

        {hasDifficulty ? (
        <Panel icon={Gauge} title="Difficulty spread">
          <Suspense fallback={<ChartSkeleton height={190} />}>
            <SplitDonut
              data={stats.difficultyBands}
              total={difficultyScored}
              totalLabel="scored"
            />
            <div className="mt-2">
              <SplitLegend
                data={stats.difficultyBands}
                total={difficultyScored}
              />
            </div>
          </Suspense>
        </Panel>
        ) : null}
      </div>
      ) : null}

      {hasRanked ? (
      <div
        className={cn(
          'grid gap-3',
          stats.easiestWins.length > 0 && 'lg:grid-cols-2',
        )}
      >
        <Panel icon={BarChart3} title="Highest volume">
          <RankedBars items={stats.topByVolume} />
        </Panel>
        {stats.easiestWins.length > 0 ? (
        <Panel
          icon={TrendingUp}
          subtitle="High demand for the least difficulty"
          title="Easiest wins"
        >
          <RankedBars items={stats.easiestWins} tone="positive" />
        </Panel>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}

/**
 * The headline numbers.
 *
 * Follows the reference app's stat-card row: an icon, a quiet label and one
 * large number, four to six across, collapsing to two on a phone.
 */
function StatRow({ stats }: { stats: KeywordAnalytics }) {
  const tiles: Array<{
    hint?: string;
    icon: LucideIcon;
    label: string;
    tone?: 'up' | 'down' | 'flat' | 'none';
    value: string;
  }> = [
    {
      icon: Hash,
      label: 'Keywords',
      value: stats.count.toLocaleString('en-US'),
    },
    {
      icon: Search,
      label: 'Total volume',
      value: compactNumber(stats.totalVolume),
      hint:
        stats.medianVolume !== null
          ? `median ${compactNumber(stats.medianVolume)}`
          : undefined,
    },
  ];

  if (stats.aggregateTrend.yearly !== null) {
    tiles.push({
      icon: stats.aggregateTrend.yearly >= 0 ? TrendingUp : TrendingDown,
      label: 'Year over year',
      value: signedPercent(stats.aggregateTrend.yearly),
      tone: trendTone(stats.aggregateTrend.yearly),
      hint:
        stats.aggregateTrend.quarterly !== null
          ? `${signedPercent(stats.aggregateTrend.quarterly)} quarter`
          : undefined,
    });
  }

  if (stats.medianCpc !== null) {
    tiles.push({
      icon: Coins,
      label: 'Median CPC',
      value: currency(stats.medianCpc),
    });
  }

  if (stats.medianDifficulty !== null) {
    tiles.push({
      icon: Gauge,
      label: 'Median difficulty',
      value: String(Math.round(stats.medianDifficulty)),
    });
  }

  if (stats.trendCoverage > 0) {
    tiles.push({
      icon: TrendingUp,
      label: 'Rising',
      value: String(stats.rising),
      tone: stats.rising >= stats.falling ? 'up' : 'down',
      hint: `${stats.falling} falling of ${stats.trendCoverage}`,
    });
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <div
          className="rounded-xl border border-white/8 bg-[#1A1A19] px-3 py-2.5"
          key={tile.label}
        >
          <div className="flex items-center gap-1.5 text-[#7D7870]">
            <tile.icon className="size-3" />
            <span className="truncate text-[10px] uppercase tracking-[0.1em]">
              {tile.label}
            </span>
          </div>
          <div
            className="mt-1 truncate font-medium text-lg tabular-nums"
            style={{
              color: tile.tone ? TREND_COLORS[tile.tone] : '#EDE7DC',
            }}
          >
            {tile.value}
          </div>
          {tile.hint ? (
            <div className="truncate text-[#5E5A54] text-[10px]">{tile.hint}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Panel({
  children,
  className,
  icon: Icon,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  icon: LucideIcon;
  subtitle?: string;
  title: string;
}) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-2xl border border-white/8 bg-[#1A1A19] p-3',
        className,
      )}
    >
      <header className="mb-2 flex items-start gap-2">
        <Icon className="mt-0.5 size-3.5 shrink-0 text-[#F2A65A]" />
        <div className="min-w-0">
          <h3 className="font-medium text-[#EDE7DC] text-xs">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-[#7D7870] text-[10px] leading-4">
              {subtitle}
            </p>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  );
}

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="animate-pulse rounded-lg bg-white/[0.03]"
      style={{ height }}
    />
  );
}
