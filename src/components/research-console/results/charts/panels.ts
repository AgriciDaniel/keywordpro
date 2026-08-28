/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { num } from '../format';

/**
 * Turns the ten non-keyword endpoint payloads into things a panel can draw.
 *
 * The complete bundle pays for nineteen endpoints. Six produce keyword rows
 * and three add cross-engine volume, and those reach the table. The remaining
 * ten return their own shapes - a SERP listing, an age split, weekly interest,
 * regional demand - which were merged, saved, and then never rendered: bought
 * and invisible.
 *
 * Every extractor is defensive about shape because these payloads vary by
 * account entitlement and by keyword: a term with no Amazon presence returns
 * an empty array, and a country with no subregion data returns nothing at all.
 * Each returns null when there is nothing worth a panel, so the UI can simply
 * omit it rather than draw an empty box.
 */

export type Panels = Record<string, unknown>;

export type NamedValue = { name: string; value: number };
export type TimePoint = {
  /** Sortable ISO date, so two series can be aligned by calendar. */
  date: string;
  label: string;
  value: number;
};

export type SerpEntry = {
  position: number | null;
  title: string;
  url: string | null;
  domain: string | null;
  snippet: string | null;
};

export type SerpSummary = {
  organic: SerpEntry[];
  /** Every block type the page contained, with counts. */
  features: NamedValue[];
  relatedSearches: string[];
  peopleAlsoAsk: string[];
  total: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const firstRecord = (value: unknown): Record<string, unknown> | null => {
  const first = asArray(value)[0];
  return isRecord(first) ? first : null;
};

/** `{values:[{type,value}]}` wrapped in a per-keyword array. Age and gender. */
function typeValueSeries(value: unknown): NamedValue[] {
  const entry = firstRecord(value);
  if (!entry) return [];
  return asArray(entry.values)
    .filter(isRecord)
    .map((point) => ({
      name: typeof point.type === 'string' ? point.type : '',
      value: num(point.value) ?? 0,
    }))
    .filter((point) => point.name !== '');
}

export function extractDemography(
  panels: Panels,
): { age: NamedValue[]; gender: NamedValue[] } | null {
  const root = firstRecord(panels.demography);
  const demography = root && isRecord(root.demography) ? root.demography : null;
  if (!demography) return null;

  const age = typeValueSeries(demography.age);
  const gender = typeValueSeries(demography.gender);
  return age.length > 0 || gender.length > 0 ? { age, gender } : null;
}

/**
 * Regional demand, strongest first.
 *
 * The provider returns every region including the ones with no interest at
 * all; a list of fifty US states where thirty are zero is noise, so zeros are
 * dropped and the caller takes a top slice.
 */
export function extractSubregions(panels: Panels): NamedValue[] | null {
  const root = firstRecord(panels.subregions);
  const interests = firstRecord(root?.interests);
  if (!interests) return null;

  const values = asArray(interests.values)
    .filter(isRecord)
    .map((entry) => ({
      name: typeof entry.geo_name === 'string' ? entry.geo_name : '',
      value: num(entry.value) ?? 0,
    }))
    .filter((entry) => entry.name !== '' && entry.value > 0)
    .sort((a, b) => b.value - a.value);

  return values.length > 0 ? values : null;
}

export function extractSerp(panels: Panels): SerpSummary | null {
  const items = asArray(panels.serp).filter(isRecord);
  if (items.length === 0) return null;

  const counts = new Map<string, number>();
  const organic: SerpEntry[] = [];
  const relatedSearches: string[] = [];
  const peopleAlsoAsk: string[] = [];

  for (const item of items) {
    const type = typeof item.type === 'string' ? item.type : 'unknown';
    counts.set(type, (counts.get(type) ?? 0) + 1);

    if (type === 'organic') {
      organic.push({
        position: num(item.position),
        title: typeof item.title === 'string' ? item.title : '(untitled)',
        url: typeof item.url === 'string' ? item.url : null,
        domain: typeof item.domain === 'string' ? item.domain : null,
        snippet: typeof item.snippet === 'string' ? item.snippet : null,
      });
      continue;
    }
    // Both blocks carry their payload under a few different keys depending on
    // the SERP feature, so take whichever strings are there.
    const bucket = type === 'related_searches' ? relatedSearches : peopleAlsoAsk;
    if (type === 'related_searches' || type === 'people_also_ask') {
      for (const candidate of [item.items, item.title, item.snippet]) {
        if (typeof candidate === 'string') bucket.push(candidate);
        for (const nested of asArray(candidate)) {
          if (typeof nested === 'string') bucket.push(nested);
          else if (isRecord(nested) && typeof nested.title === 'string') {
            bucket.push(nested.title);
          }
        }
      }
    }
  }

  organic.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

  return {
    organic,
    features: [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    relatedSearches: [...new Set(relatedSearches)],
    peopleAlsoAsk: [...new Set(peopleAlsoAsk)],
    total: items.length,
  };
}

export function extractAutocomplete(panels: Panels): string[] | null {
  const suggestions = asArray(panels.autocomplete)
    .filter(isRecord)
    .map((entry) =>
      typeof entry.suggestion === 'string' ? entry.suggestion : '',
    )
    .filter(Boolean);
  return suggestions.length > 0 ? suggestions : null;
}

export function extractCompetitors(
  panels: Panels,
): Array<{ domain: string; avgPosition: number | null; intersections: number | null }> | null {
  const rows = asArray(panels.competitors)
    .filter(isRecord)
    .map((entry) => ({
      domain: typeof entry.domain === 'string' ? entry.domain : '',
      avgPosition: num(entry.avg_position),
      intersections: num(entry.intersections),
    }))
    .filter((entry) => entry.domain !== '');
  return rows.length > 0 ? rows : null;
}

/**
 * Relative interest over time.
 *
 * Google Trends and DataForSEO Trends both answer "how did attention move",
 * on a 0-100 relative scale rather than in searches, which is why this is a
 * different chart from the volume series in the keyword table.
 */
export function extractInterest(panels: Panels): {
  google: TimePoint[];
  dataforseo: TimePoint[];
} | null {
  const google = timeSeries(
    isRecord(panels.googleTrends) ? panels.googleTrends.interest_over_time : null,
  );
  const dataforseo = timeSeries(firstRecord(panels.dataforseoTrends)?.data);

  return google.length > 1 || dataforseo.length > 1
    ? { google, dataforseo }
    : null;
}

/**
 * A weekly or monthly interest series, carrying its real date.
 *
 * The two providers sample on different calendars and return different point
 * counts, so aligning them by array index put July next to December on the
 * axis. The date is kept so the chart can merge them by calendar instead.
 */
function timeSeries(value: unknown): TimePoint[] {
  return asArray(value)
    .filter(isRecord)
    .map((point) => {
      const raw = point.date_to ?? point.date_from;
      const date = typeof raw === 'string' ? raw.slice(0, 10) : '';
      return {
        date,
        label: monthLabel(raw),
        value: num(asArray(point.values)[0]) ?? 0,
      };
    })
    .filter((point) => point.date !== '' && point.label !== '')
    .sort((a, b) => a.date.localeCompare(b.date));
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** `2025-08-30` -> `Aug 25`. Weekly points collapse onto their month. */
function monthLabel(value: unknown): string {
  if (typeof value !== 'string') return '';
  const match = /^(\d{4})-(\d{2})/.exec(value);
  if (!match) return '';
  const month = Number(match[2]);
  if (!Number.isFinite(month) || month < 1 || month > 12) return '';
  return `${MONTHS[month - 1]} ${match[1].slice(2)}`;
}

/**
 * Month-by-month history of what the keyword cost and how contested it was.
 * The keyword table shows today's figure; this shows how it got there.
 */
export function extractHistory(
  panels: Panels,
): Array<{ label: string; volume: number | null; cpc: number | null; competition: number | null }> | null {
  const history = asArray(firstRecord(panels.historical)?.history)
    .filter(isRecord)
    .map((entry) => {
      const info = isRecord(entry.keyword_info) ? entry.keyword_info : {};
      const year = num(entry.year);
      const month = num(entry.month);
      return {
        sortKey: (year ?? 0) * 12 + (month ?? 0),
        label:
          year !== null && month !== null && month >= 1 && month <= 12
            ? `${MONTHS[month - 1]} ${String(year).slice(2)}`
            : '',
        volume: num(info.search_volume),
        cpc: num(info.cpc),
        competition: num(info.competition),
      };
    })
    .filter((entry) => entry.label !== '')
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey, ...rest }) => rest);

  return history.length > 1 ? history : null;
}
