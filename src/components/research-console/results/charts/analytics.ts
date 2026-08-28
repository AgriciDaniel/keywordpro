/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { median, num } from '../format';

/**
 * Everything the keyword dashboard draws, computed once from the projected
 * rows.
 *
 * Pure on purpose: the charts are lazily loaded client components, so keeping
 * the maths out of them means it can be verified without a browser and the
 * numbers in the tiles can never disagree with the numbers in the charts.
 */

export type Row = Record<string, unknown>;

export type MonthPoint = {
  /** `2026-05`, sortable and stable across locales. */
  key: string;
  label: string;
  volume: number;
  /** How many keywords reported a figure for this month. */
  coverage: number;
};

export type RankedItem = {
  label: string;
  value: number;
  /** 0-100, relative to the largest value in the set. */
  share: number;
  meta?: string;
};

export type Slice = { name: string; value: number; color: string };

export type ScatterPoint = {
  keyword: string;
  difficulty: number;
  volume: number;
  cpc: number;
  intent: string;
};

export type KeywordAnalytics = {
  count: number;
  totalVolume: number;
  medianVolume: number | null;
  medianCpc: number | null;
  medianDifficulty: number | null;
  /** Keywords whose month-over-month trend is positive. */
  rising: number;
  falling: number;
  trendCoverage: number;
  topByVolume: RankedItem[];
  easiestWins: RankedItem[];
  intentSplit: Slice[];
  difficultyBands: Slice[];
  /** Full-coverage months only. See splitByCoverage for why. */
  monthly: MonthPoint[];
  /** Months dropped because too few keywords reported them. */
  partialMonths: number;
  scatter: ScatterPoint[];
  /** Aggregate change across the whole set, in percent. */
  aggregateTrend: { monthly: number | null; quarterly: number | null; yearly: number | null };
};

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Half-open bands, so nothing can fall between them.
 *
 * Inclusive integer ranges (0-19, 20-39, ...) silently dropped any difficulty
 * that was not a whole number in range: 19.5 matched no band and vanished from
 * the donut, and because the donut normalises against the surviving total the
 * loss was invisible.
 */
const DIFFICULTY_BANDS: Array<{ name: string; min: number }> = [
  { name: 'Very easy', min: 0 },
  { name: 'Easy', min: 20 },
  { name: 'Medium', min: 40 },
  { name: 'Hard', min: 60 },
  { name: 'Very hard', min: 80 },
];

export function computeKeywordAnalytics(
  rows: Row[],
  palette: {
    intentColor: (intent: unknown) => string;
    difficultyColors: string[];
  },
): KeywordAnalytics {
  const volumes = collect(rows, 'search_volume');
  const cpcs = collect(rows, 'cpc').filter((value) => value > 0);
  const difficulties = collect(rows, 'difficulty');

  const trends = rows
    .map((row) => num(row.monthly_trend))
    .filter((value): value is number => value !== null);

  const allMonths = aggregateMonthly(rows);
  const reliable = splitByCoverage(allMonths);

  return {
    count: rows.length,
    totalVolume: volumes.reduce((sum, value) => sum + value, 0),
    medianVolume: median(volumes),
    medianCpc: median(cpcs),
    medianDifficulty: median(difficulties),
    rising: trends.filter((value) => value > 0).length,
    falling: trends.filter((value) => value < 0).length,
    trendCoverage: trends.length,
    topByVolume: topByVolume(rows),
    easiestWins: easiestWins(rows),
    intentSplit: intentSplit(rows, palette.intentColor),
    difficultyBands: difficultyBands(rows, palette.difficultyColors),
    monthly: reliable,
    partialMonths: allMonths.length - reliable.length,
    scatter: scatterPoints(rows),
    aggregateTrend: aggregateTrend(reliable, allMonths),
  };
}

/**
 * Keep only the months enough keywords actually reported.
 *
 * Per-keyword series are not aligned: in a real 98-keyword run the middle
 * eleven months are reported by all 98, while the first is reported by 34 and
 * the last by 64. Summing them raw draws a cliff at both ends and produces a
 * -20% "month over month" that is entirely an artifact of who reported, not
 * of demand. Both the chart and the percentages therefore use the plateau.
 */
function splitByCoverage(months: MonthPoint[]): MonthPoint[] {
  if (months.length === 0) return months;
  const maxCoverage = Math.max(...months.map((point) => point.coverage));
  // Rounded up, not down: with two keywords reporting, `floor(2 * 0.9)` is 1,
  // so a month only half the set covered passed as reliable.
  const threshold = Math.max(1, Math.ceil(maxCoverage * 0.9));
  return months.filter((point) => point.coverage >= threshold);
}

function collect(rows: Row[], key: string): number[] {
  return rows
    .map((row) => num(row[key]))
    .filter((value): value is number => value !== null);
}

function keywordOf(row: Row): string {
  return typeof row.keyword === 'string' && row.keyword ? row.keyword : '-';
}

/** The reference app's "Top Videos by Views": rank, label, bar, value. */
function topByVolume(rows: Row[], limit = 8): RankedItem[] {
  const ranked = rows
    .map((row) => ({ row, volume: num(row.search_volume) ?? 0 }))
    .filter((entry) => entry.volume > 0)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);

  const max = ranked[0]?.volume ?? 1;
  return ranked.map((entry) => ({
    label: keywordOf(entry.row),
    value: entry.volume,
    share: (entry.volume / max) * 100,
    meta: formatDifficultyMeta(entry.row),
  }));
}

/**
 * High volume for low difficulty: the actual decision this table exists to
 * support. Scored rather than sorted on one axis, so a 90-difficulty giant
 * cannot crowd out a genuinely winnable term.
 */
function easiestWins(rows: Row[], limit = 8): RankedItem[] {
  const scored = rows
    .map((row) => {
      const volume = num(row.search_volume) ?? 0;
      const difficulty = num(row.difficulty);
      if (volume <= 0 || difficulty === null) return null;
      // Log volume keeps a 9M head term from dominating purely on scale.
      const score = Math.log10(volume + 1) * (100 - difficulty);
      return { row, score, volume, difficulty };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Ordered by the score, but the bar shows ease rather than the score, so
  // the bar and the "KD 16" beside it say the same thing. A score-length bar
  // next to a volume figure reads as a contradiction: an 18K keyword would
  // draw a longer bar than a 33K one with no visible reason.
  return scored.map((entry) => ({
    label: keywordOf(entry.row),
    value: entry.volume,
    share: 100 - entry.difficulty,
    meta: `KD ${Math.round(entry.difficulty)}`,
  }));
}

function formatDifficultyMeta(row: Row): string | undefined {
  const difficulty = num(row.difficulty);
  return difficulty === null ? undefined : `KD ${Math.round(difficulty)}`;
}

function intentSplit(
  rows: Row[],
  color: (intent: unknown) => string,
): Slice[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const intent =
      typeof row.main_intent === 'string' && row.main_intent
        ? row.main_intent
        : 'unknown';
    counts.set(intent, (counts.get(intent) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value, color: color(name) }));
}

function difficultyBands(rows: Row[], colors: string[]): Slice[] {
  const counts = DIFFICULTY_BANDS.map(() => 0);
  for (const row of rows) {
    const difficulty = num(row.difficulty);
    if (difficulty === null) continue;
    // Clamped, then matched on the last band whose floor it clears, so a
    // fractional or out-of-range score still lands somewhere.
    const clamped = Math.min(100, Math.max(0, difficulty));
    let index = 0;
    for (let i = 0; i < DIFFICULTY_BANDS.length; i += 1) {
      if (clamped >= DIFFICULTY_BANDS[i].min) index = i;
    }
    counts[index] += 1;
  }

  return DIFFICULTY_BANDS.map((band, index) => ({
    name: band.name,
    value: counts[index],
    color: colors[index] ?? colors[colors.length - 1],
  })).filter((slice) => slice.value > 0);
}

/**
 * Total searches per calendar month across every keyword in the set.
 *
 * Series lengths differ per keyword (12 months on related_keywords, up to 92
 * on keyword_overview), so months are keyed by date rather than by index and
 * `coverage` records how many keywords actually reported each one. Without
 * that, a month only two keywords cover would look like a cliff.
 */
function aggregateMonthly(rows: Row[]): MonthPoint[] {
  const totals = new Map<string, { volume: number; coverage: number; year: number; month: number }>();

  for (const row of rows) {
    const series = row.monthly_searches;
    if (!Array.isArray(series)) continue;
    for (const rawPoint of series) {
      if (typeof rawPoint !== 'object' || rawPoint === null) continue;
      const point = rawPoint as Record<string, unknown>;
      const year = num(point.year);
      const month = num(point.month);
      const volume = num(point.search_volume);
      if (year === null || month === null) continue;

      const key = `${year}-${String(month).padStart(2, '0')}`;
      const entry = totals.get(key) ?? { volume: 0, coverage: 0, year, month };
      entry.volume += volume ?? 0;
      // Coverage means "reported a figure". Counting a null-volume point would
      // push a month past the reliability threshold while adding nothing to
      // the sum, turning a gap in the data into an apparent collapse.
      if (volume !== null) entry.coverage += 1;
      totals.set(key, entry);
    }
  }

  return [...totals.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, entry]) => ({
      key,
      label: `${MONTH_LABELS[entry.month - 1] ?? entry.month} ${String(entry.year).slice(2)}`,
      volume: entry.volume,
      coverage: entry.coverage,
    }));
}

/**
 * How the whole set moved, from its own aggregate series.
 *
 * Deliberately not an average of the per-keyword percentages: averaging
 * percentages weights a keyword with 10 searches the same as one with 9
 * million. Comparing summed volume answers the question actually being asked,
 * which is whether this topic is growing.
 *
 * Runs on the coverage-filtered series, so a month only half the keywords
 * reported cannot masquerade as a fall in demand.
 */
function aggregateTrend(
  reliable: MonthPoint[],
  all: MonthPoint[],
): KeywordAnalytics['aggregateTrend'] {
  return {
    monthly: windowChange(reliable, all, 1),
    quarterly: windowChange(reliable, all, 3),
    yearly: windowChange(reliable, all, 12),
  };
}

/**
 * Compare the most recent `size` months against the `size` before them.
 *
 * Two things this has to get right, both of which the previous index-based
 * version got wrong.
 *
 * It cannot run on the coverage-filtered plateau alone. In a bundle only the
 * seed keyword carries a long history, so the plateau is about twelve months
 * and a year-over-year comparison, which needs twenty-four, was structurally
 * impossible: the tile and the PDF headline printed a dash on every single
 * run. So the window is taken from the full month list and each month is
 * checked for reliability individually.
 *
 * And it has to be calendar-aware. Filtering months independently can leave
 * holes, and comparing "the last two surviving entries" across a three-month
 * gap while labelling it month-over-month is simply a wrong number. Every
 * month in both windows must be present, reliable, and consecutive.
 */
function windowChange(
  reliable: MonthPoint[],
  all: MonthPoint[],
  size: number,
): number | null {
  if (reliable.length === 0) return null;

  const reliableKeys = new Set(reliable.map((point) => point.key));
  const byKey = new Map(all.map((point) => [point.key, point]));

  // Anchor on the newest month everyone reported, not the newest month present.
  const anchor = reliable[reliable.length - 1].key;
  const keys: string[] = [];
  for (let back = 0; back < size * 2; back += 1) {
    const key = shiftMonth(anchor, -back);
    const point = byKey.get(key);
    if (!point || !reliableKeys.has(key)) return null;
    keys.push(key);
  }

  const sum = (slice: string[]) =>
    slice.reduce((total, key) => total + (byKey.get(key)?.volume ?? 0), 0);

  // keys[0] is the anchor and the list runs backwards.
  const current = sum(keys.slice(0, size));
  const previous = sum(keys.slice(size));
  return percentChange(current, previous);
}

/** `2026-05` shifted by a signed number of calendar months. */
function shiftMonth(key: string, delta: number): string {
  const [yearPart, monthPart] = key.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return key;
  const zeroBased = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(zeroBased / 12);
  const nextMonth = (zeroBased % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

function percentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function scatterPoints(rows: Row[]): ScatterPoint[] {
  return rows
    .map((row) => {
      const difficulty = num(row.difficulty);
      const volume = num(row.search_volume);
      if (difficulty === null || volume === null || volume <= 0) return null;
      return {
        keyword: keywordOf(row),
        difficulty,
        volume,
        cpc: num(row.cpc) ?? 0,
        intent:
          typeof row.main_intent === 'string' && row.main_intent
            ? row.main_intent
            : 'unknown',
      };
    })
    .filter((point): point is ScatterPoint => point !== null);
}

/** True when the rows carry enough for the dashboard to be worth drawing. */
export function hasKeywordShape(rows: Row[]): boolean {
  if (rows.length === 0) return false;
  const sample = rows.slice(0, 20);
  const hasKeyword = sample.some((row) => typeof row.keyword === 'string');
  const hasMeasure = sample.some(
    (row) =>
      num(row.search_volume) !== null ||
      num(row.difficulty) !== null ||
      num(row.cpc) !== null,
  );
  return hasKeyword && hasMeasure;
}
