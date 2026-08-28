/*
 * SPDX-License-Identifier: Apache-2.0
 */

/** Shared formatting for the result tables. Pure, so it renders on the server. */

export type MonthlySearch = {
  year?: number;
  month?: number;
  search_volume?: number | null;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** 12300 -> "12.3K". Keeps columns narrow without losing the magnitude. */
export function compactNumber(value: unknown): string {
  const n = num(value);
  if (n === null) return '-';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${trim(n / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (abs >= 10_000) return `${trim(n / 1000)}K`;
  // Traffic estimates arrive with three decimals ("4,426.145" visits), which
  // is false precision in a count column.
  return Math.round(n).toLocaleString('en-US');
}

function trim(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}

export function fullNumber(value: unknown): string {
  const n = num(value);
  return n === null ? '-' : n.toLocaleString('en-US');
}

export function currency(value: unknown): string {
  const n = num(value);
  if (n === null) return '-';
  return `$${n.toFixed(2)}`;
}

/**
 * A search-volume trend.
 *
 * DataForSEO documents `search_volume_trend.{monthly,quarterly,yearly}` as a
 * change in percent. It is signed and unbounded: real fixtures carry both -97
 * and +1011, so this must never be rendered on a 0-100 scale.
 */
export function signedPercent(value: unknown): string {
  const n = num(value);
  if (n === null) return '-';
  const rounded = Math.abs(n) >= 100 ? Math.round(n) : +n.toFixed(1);
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

export function trendTone(value: unknown): 'up' | 'down' | 'flat' | 'none' {
  const n = num(value);
  if (n === null) return 'none';
  if (n > 0) return 'up';
  if (n < 0) return 'down';
  return 'flat';
}

/** Human label from a snake_case key. */
export function labelize(key: string): string {
  return key
    .replace(/^_/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\bcpc\b/gi, 'CPC')
    .replace(/\bserp\b/gi, 'SERP')
    .replace(/\burl\b/gi, 'URL')
    .replace(/\bid\b/gi, 'ID')
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Chronological volume series.
 *
 * DataForSEO returns `monthly_searches` newest-first; a chart needs it the
 * other way round. Length varies wildly by endpoint: 12 points on
 * `related_keywords`, 92 on `keyword_overview`.
 */
export function orderedMonthly(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0) return [];

  const points = value
    .filter(isRecord)
    .map((point) => ({
      year: num(point.year) ?? 0,
      month: num(point.month) ?? 0,
      volume: num(point.search_volume) ?? 0,
    }))
    .sort((a, b) => a.year - b.year || a.month - b.month);

  return points.map((point) => point.volume);
}

export function median(values: number[]): number | null {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** A cell value for a column with no dedicated renderer. */
export function genericCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return fullNumber(value);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    if (value.every((item) => typeof item === 'string')) return value.join(', ');
    return `${value.length} items`;
  }
  if (isRecord(value)) {
    const keys = Object.keys(value);
    return keys.length === 0 ? '-' : `{${keys.length} fields}`;
  }
  return String(value);
}
