'use client';

import { cn } from '@/lib/utils';
import {
  Building2,
  Globe,
  HelpCircle,
  History,
  LineChart,
  ListOrdered,
  MapPin,
  Search,
  Type,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { lazy, Suspense, useMemo } from 'react';
import { compactNumber, currency } from './format';
import {
  extractAutocomplete,
  extractCompetitors,
  extractDemography,
  extractHistory,
  extractInterest,
  extractSerp,
  extractSubregions,
  type NamedValue,
  type Panels,
} from './charts/panels';
import { ACCENT_RAMP, CHART_INK } from './charts/palette';
import { RankedBars } from './charts/RankedBars';

const InterestLines = lazy(() =>
  import('./charts/KeywordCharts').then((m) => ({ default: m.InterestLines })),
);
const HistoryChart = lazy(() =>
  import('./charts/KeywordCharts').then((m) => ({ default: m.HistoryChart })),
);

/**
 * The ten endpoints that do not produce keyword rows.
 *
 * The complete bundle bills for nineteen calls. Nine feed the table above;
 * these ten return their own shapes and, until now, were merged, saved and
 * never shown. Market-aware plans can omit unsupported cross-engine calls.
 * Each panel renders only when its endpoint actually returned something, so an
 * account without the Trends subscription, or a keyword with no Amazon
 * presence, simply sees fewer panels rather than a wall of empty boxes.
 */
export function BundlePanels({ panels }: { panels: Panels }) {
  const demography = useMemo(() => extractDemography(panels), [panels]);
  const subregions = useMemo(() => extractSubregions(panels), [panels]);
  const serp = useMemo(() => extractSerp(panels), [panels]);
  const autocomplete = useMemo(() => extractAutocomplete(panels), [panels]);
  const competitors = useMemo(() => extractCompetitors(panels), [panels]);
  const interest = useMemo(() => extractInterest(panels), [panels]);
  const history = useMemo(() => extractHistory(panels), [panels]);

  const chipPanels: Array<{
    icon: LucideIcon;
    items: string[];
    subtitle?: string;
    title: string;
  }> = [];
  if (autocomplete) {
    chipPanels.push({
      icon: Type,
      items: autocomplete,
      subtitle: 'What Google offers to finish the query with',
      title: 'Autocomplete',
    });
  }
  if (serp && serp.peopleAlsoAsk.length > 0) {
    chipPanels.push({
      icon: HelpCircle,
      items: serp.peopleAlsoAsk,
      title: 'People also ask',
    });
  }
  if (serp && serp.relatedSearches.length > 0) {
    chipPanels.push({
      icon: Search,
      items: serp.relatedSearches,
      title: 'Related searches',
    });
  }

  const anything =
    demography ||
    subregions ||
    serp ||
    autocomplete ||
    competitors ||
    interest ||
    history;
  if (!anything) return null;

  return (
    <div className="grid gap-3">
      {interest ? (
        <Panel
          icon={LineChart}
          subtitle="Relative interest, 0 to 100. A different question from search volume: this is attention, not counts."
          title="Interest over time"
        >
          <Suspense fallback={<Skeleton height={200} />}>
            <InterestLines
              dataforseo={interest.dataforseo}
              google={interest.google}
            />
          </Suspense>
        </Panel>
      ) : null}

      {history ? (
        <Panel
          icon={History}
          subtitle={`${history.length} months of volume, CPC and competition for the seed keyword`}
          title="How the keyword got here"
        >
          <Suspense fallback={<Skeleton height={200} />}>
            <HistoryChart data={history} />
          </Suspense>
        </Panel>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {demography ? (
          <Panel icon={Users} title="Who is searching">
            <div className="grid gap-3">
              {demography.age.length > 0 ? (
                <Distribution
                  label="Age"
                  values={demography.age}
                />
              ) : null}
              {demography.gender.length > 0 ? (
                <Distribution label="Gender" values={demography.gender} />
              ) : null}
            </div>
          </Panel>
        ) : null}

        {subregions ? (
          <Panel
            icon={MapPin}
            subtitle={`Strongest of ${subregions.length} regions`}
            title="Where the demand is"
          >
            <RankedBars
              items={subregions.slice(0, 8).map((entry) => ({
                label: entry.name,
                value: entry.value,
                share: entry.value,
              }))}
            />
          </Panel>
        ) : null}
      </div>

      {/* Two ranked lists of ten, side by side: the pages that hold the
          seed's SERP, and the domains that recur across the whole set. The
          SERP list carries a title and a snippet per row, so it takes the
          wider column. */}
      {serp || competitors ? (
        <div
          className={cn('grid gap-3', serp && competitors && 'lg:grid-cols-3')}
        >
          {serp ? (
            <Panel
              className={cn(competitors && 'lg:col-span-2')}
              icon={ListOrdered}
              subtitle={`${serp.organic.length} organic results of ${serp.total} blocks on the page`}
              title="Who ranks today"
            >
              <div className="grid gap-3">
                {serp.features.length > 1 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {serp.features.map((feature) => (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#9F9A92]"
                        key={feature.name}
                      >
                        {feature.name.replace(/_/g, ' ')}
                        <span className="tabular-nums text-[#7D7870]">
                          {feature.value}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : null}

                <ol className="grid gap-2">
                  {serp.organic.slice(0, 10).map((entry, index) => (
                    <li
                      className="flex items-baseline gap-2 text-xs"
                      key={`${entry.url ?? entry.title}-${index}`}
                    >
                      <span className="w-5 shrink-0 tabular-nums text-[#5E5A54] text-[10px]">
                        {entry.position ?? index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        {entry.url ? (
                          <a
                            className="block truncate text-[#9FBEDE] transition hover:text-[#C3D8EF] hover:underline"
                            href={entry.url}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {entry.title}
                          </a>
                        ) : (
                          <span className="block truncate text-[#D7D1C8]">
                            {entry.title}
                          </span>
                        )}
                        {entry.snippet ? (
                          <span className="mt-0.5 line-clamp-1 text-[#7D7870] text-[11px]">
                            {entry.snippet}
                          </span>
                        ) : null}
                      </span>
                      <span className="max-w-40 shrink-0 truncate text-[#5E5A54] text-[10px]">
                        {entry.domain}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </Panel>
          ) : null}

          {competitors ? (
            <Panel
              icon={Building2}
              subtitle="Domains ranking across this keyword set"
              title="Competitors"
            >
              <ol className="grid gap-2">
                {competitors.slice(0, 10).map((entry, index) => (
                  <li
                    className="flex items-baseline gap-2 text-xs"
                    key={entry.domain}
                  >
                    <span className="w-5 shrink-0 tabular-nums text-[#5E5A54] text-[10px]">
                      {index + 1}
                    </span>
                    <Globe className="size-3 shrink-0 self-center text-[#5E5A54]" />
                    <span className="min-w-0 flex-1 truncate text-[#D7D1C8]">
                      {entry.domain}
                    </span>
                    {entry.intersections !== null ? (
                      <span className="shrink-0 tabular-nums text-[#7D7870] text-[10px]">
                        {compactNumber(entry.intersections)} keywords
                      </span>
                    ) : null}
                    {entry.avgPosition !== null ? (
                      <span
                        className="shrink-0 tabular-nums text-[#9F9A92] text-[10px]"
                        title="Average position across the set"
                      >
                        avg #{entry.avgPosition}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </Panel>
          ) : null}
        </div>
      ) : null}

      {/* The chip panels share one row, as many columns as there are of them,
          so a short "Related searches" never sits beside an empty cell. */}
      {chipPanels.length > 0 ? (
        <div
          className={cn(
            'grid gap-3',
            chipPanels.length === 2 && 'lg:grid-cols-2',
            chipPanels.length >= 3 && 'lg:grid-cols-3',
          )}
        >
          {chipPanels.map((chips) => (
            <Panel
              icon={chips.icon}
              key={chips.title}
              subtitle={chips.subtitle}
              title={chips.title}
            >
              <ChipList items={chips.items} />
            </Panel>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** A 0-100 distribution as labelled bars. Age and gender both arrive this way. */
function Distribution({ label, values }: { label: string; values: NamedValue[] }) {
  const max = Math.max(1, ...values.map((entry) => entry.value));
  return (
    <div className="grid gap-1.5">
      <div className="text-[#7D7870] text-[10px] uppercase tracking-[0.1em]">
        {label}
      </div>
      {values.map((entry, index) => (
        <div className="flex items-center gap-2" key={entry.name}>
          <span className="w-14 shrink-0 text-[#C9C4BC] text-[11px]">
            {entry.name}
          </span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${(entry.value / max) * 100}%`,
                backgroundColor:
                  ACCENT_RAMP[index] ?? ACCENT_RAMP[ACCENT_RAMP.length - 1],
              }}
            />
          </span>
          <span className="w-8 shrink-0 text-right tabular-nums text-[#9F9A92] text-[11px]">
            {Math.round(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.slice(0, 20).map((item, index) => (
        <li
          className="rounded-lg border border-white/8 bg-white/[0.03] px-2 py-1 text-[#C9C4BC] text-[11px]"
          key={`${item}-${index}`}
        >
          {item}
        </li>
      ))}
    </ul>
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

function Skeleton({ height }: { height: number }) {
  return (
    <div
      className="animate-pulse rounded-lg bg-white/[0.03]"
      style={{ height, borderColor: CHART_INK.border }}
    />
  );
}

export { currency };
