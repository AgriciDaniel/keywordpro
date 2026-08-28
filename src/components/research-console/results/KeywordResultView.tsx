'use client';

import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from 'lucide-react';
import { Fragment, useMemo, useRef, useState } from 'react';
import {
  compactNumber,
  currency,
  labelize,
  median,
  num,
  orderedMonthly,
  genericCell,
  isRecord,
} from './format';
import {
  computeKeywordAnalytics,
  hasKeywordShape,
} from './charts/analytics';
import { DIFFICULTY_COLORS, intentColor } from './charts/palette';
import { ExportBar } from './ExportBar';
import { BundlePanels } from './BundlePanels';
import { KeywordDashboard } from './KeywordDashboard';
import { downloadFile, exportFilename, safeStringify, toCsv } from '@/lib/research/export';
import { ReportActions } from './ReportActions';
import { RunReport } from './RunReport';
import type { SourceReport } from '@/lib/research/keyword-merge';
import { type Column, type Row, resolveKeywordColumns } from './keyword-columns';
import { Sparkline } from './Sparkline';

const PAGE_SIZE = 25;

type SortState = { key: string; direction: 'asc' | 'desc' } | null;

export function KeywordResultView({
  cost,
  endpointType,
  meta,
  raw,
  rows,
}: {
  cost?: number;
  endpointType: string;
  meta?: Record<string, unknown> | null;
  raw: unknown;
  rows: Row[];
}) {
  const { primary, extra } = useMemo(() => resolveKeywordColumns(rows), [rows]);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);

  /**
   * The expander is a position, not an identity, and this component is not
   * remounted between searches: every simple-mode result carries the same key.
   * A streaming run also replaces `rows` about forty times as it fills in.
   * Without this, an open detail panel stayed pinned to row 7 while row 7
   * became a different keyword under it, and a new search inherited the
   * previous one's sort and page.
   */
  const rowsIdentity = useRef(rows);
  if (rowsIdentity.current !== rows) {
    rowsIdentity.current = rows;
    if (expanded !== null) setExpanded(null);
  }

  const columns = useMemo(
    () => (showAllColumns ? [...primary, ...extra] : primary),
    [extra, primary, showAllColumns],
  );

  /**
   * Every populated field, in table order first.
   *
   * The CSV used to be handed only the columns the table renders, which
   * quietly dropped `competition_level`, `categories`, `serp_item_types` and
   * the clickstream distributions from the spreadsheet: fields that are on
   * screen but not in the file the user takes away.
   */
  const exportColumns = useMemo(() => {
    const ordered = [...primary, ...extra].map((column) => column.key);
    const seen = new Set(ordered);
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (key.startsWith('_') || seen.has(key)) continue;
        seen.add(key);
        ordered.push(key);
      }
    }
    return ordered;
  }, [extra, primary, rows]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return rows;

    const read = (row: Row) =>
      column.sortValue ? column.sortValue(row) : (row[column.key] ?? null);

    // Index-tagged so equal values keep their original order.
    return rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const left = read(a.row);
        const right = read(b.row);
        // Missing data sinks to the bottom whichever way the column is sorted.
        if (left === null || left === undefined) return 1;
        if (right === null || right === undefined) return -1;

        let comparison: number;
        if (typeof left === 'number' && typeof right === 'number') {
          comparison = left - right;
        } else {
          comparison = String(left).localeCompare(String(right));
        }
        if (comparison === 0) return a.index - b.index;
        return sort.direction === 'asc' ? comparison : -comparison;
      })
      .map((entry) => entry.row);
  }, [columns, rows, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function toggleSort(key: string) {
    setExpanded(null);
    setPage(0);
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'desc' };
      if (current.direction === 'desc') return { key, direction: 'asc' };
      return null;
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-[#1A1A19] p-4 text-[#9F9A92] text-sm">
        The endpoint answered successfully but returned no rows.
      </div>
    );
  }

  // Charts only earn their place when the rows carry keyword measures. A SERP
  // or content result gets the table and its tiles, not an empty scatter plot.
  const showDashboard = hasKeywordShape(rows);

  // Present only on a bundle run. A single hand-picked endpoint has neither.
  const bundlePanels =
    meta && typeof meta.panels === 'object' && meta.panels !== null
      ? (meta.panels as Record<string, unknown>)
      : null;
  const bundleSources = Array.isArray(meta?.sources)
    ? (meta.sources as SourceReport[])
    : null;

  // The report reflects what is on screen, so it follows the active sort.
  // `seed` on a bundle, `seed_keyword` on a single Labs endpoint. Reading
  // only the latter titled every bundle report "Keyword research".
  const reportTitle = (() => {
    const seed =
      (typeof meta?.seed === 'string' && meta.seed) ||
      (typeof meta?.seed_keyword === 'string' && meta.seed_keyword) ||
      null;
    return seed ? `Keyword research: ${seed}` : 'Keyword research';
  })();

  async function downloadPdf() {
    const { downloadKeywordReport } = await import('@/lib/research/pdf-report');
    await downloadKeywordReport({
      endpointType,
      rows: sorted,
      stats: computeKeywordAnalytics(sorted, {
        intentColor,
        difficultyColors: DIFFICULTY_COLORS,
      }),
      title: reportTitle,
    });
  }

  function downloadCsv() {
    const shaped = sorted.map((row) => {
      const { _full, ...rest } = row;
      return rest;
    });
    downloadFile(exportFilename(endpointType, 'csv'), toCsv(shaped, exportColumns), 'text/csv');
  }

  function downloadJson() {
    downloadFile(
      exportFilename(endpointType, 'json'),
      safeStringify({ endpoint: endpointType, rows: sorted, raw }),
      'application/json',
    );
  }

  return (
    <div className="grid gap-3">
      {showDashboard ? (
        <ReportActions
          cost={
            typeof meta?.totalCost === 'number'
              ? meta.totalCost
              : typeof cost === 'number'
                ? cost
                : null
          }
          onDownloadCsv={downloadCsv}
          onDownloadJson={downloadJson}
          onDownloadPdf={downloadPdf}
          sourcesOk={bundleSources ? bundleSources.filter((source) => source.ok).length : null}
          sourcesTotal={bundleSources ? bundleSources.length : null}
          subtitle={`${rows.length.toLocaleString('en-US')} keywords`}
          title={reportTitle}
        />
      ) : null}
      {showDashboard ? <KeywordDashboard rows={rows} /> : null}

      {bundlePanels ? <BundlePanels panels={bundlePanels} /> : null}

      {bundleSources ? (
        <RunReport
          sources={bundleSources}
          totalCost={
            typeof meta?.totalCost === 'number' ? meta.totalCost : null
          }
        />
      ) : null}

      <div className="min-w-0 rounded-2xl border border-white/8 bg-[#1A1A19]">
      {/* Social rows have their own dashboard above; "Keywords 12, volume 0"
          would be nonsense over a list of posts. */}
      {showDashboard || String(meta?.kind ?? '').startsWith('social') ? null : (
        <SummaryTiles meta={meta} rows={rows} />
      )}

      <ExportBar
        cost={cost}
        endpointType={endpointType}
        extraColumnCount={extra.length}
        onDownloadPdf={showDashboard ? downloadPdf : undefined}
        onToggleColumns={() => {
          setExpanded(null);
          setShowAllColumns((value) => !value);
        }}
        raw={raw}
        rows={sorted}
        showAllColumns={showAllColumns}
        visibleColumns={exportColumns}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-white/8 border-b bg-white/[0.02]">
              <th
                className="sticky left-0 z-20 w-8 bg-[#1D1D1C] px-2 py-2"
                scope="col"
              >
                <span className="sr-only">Expand row</span>
              </th>
              {columns.map((column, index) => (
                <SortableHeader
                  column={column}
                  key={column.key}
                  onSort={toggleSort}
                  sort={sort}
                  // The keyword names the row, so it stays put while the
                  // remaining columns scroll under it.
                  sticky={index === 0 && column.key === 'keyword'}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => {
              const absoluteIndex = safePage * PAGE_SIZE + index;
              const isOpen = expanded === absoluteIndex;
              return (
                <Fragment key={`kw-${absoluteIndex}`}>
                  <tr
                    className={cn(
                      'border-white/6 border-b transition-colors',
                      isOpen ? 'bg-white/[0.045]' : 'hover:bg-white/[0.025]',
                    )}
                    key={`row-${absoluteIndex}`}
                  >
                    <td
                      className={cn(
                        'sticky left-0 z-10 px-2 py-2 align-middle',
                        isOpen ? 'bg-[#201F1E]' : 'bg-[#1A1A19]',
                      )}
                    >
                      <button
                        aria-expanded={isOpen}
                        aria-label={isOpen ? 'Hide all fields' : 'Show all fields'}
                        className="inline-flex size-5 items-center justify-center rounded-md text-[#7D7870] transition hover:bg-white/10 hover:text-[#EDE7DC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A65A]/45"
                        onClick={() => setExpanded(isOpen ? null : absoluteIndex)}
                        type="button"
                      >
                        <ChevronRight
                          className={cn(
                            'size-3.5 transition-transform duration-200',
                            isOpen && 'rotate-90',
                          )}
                        />
                      </button>
                    </td>
                    {columns.map((column, columnIndex) => {
                      const sticky =
                        columnIndex === 0 && column.key === 'keyword';
                      return (
                        <td
                          className={cn(
                            'px-3 py-2 align-middle',
                            column.numeric && 'text-right',
                            sticky &&
                              cn(
                                'sticky left-8 z-10',
                                isOpen ? 'bg-[#201F1E]' : 'bg-[#1A1A19]',
                              ),
                          )}
                          key={column.key}
                        >
                          {column.render(row)}
                        </td>
                      );
                    })}
                  </tr>
                  {isOpen ? (
                    <tr key={`detail-${absoluteIndex}`}>
                      <td
                        className="border-white/6 border-b bg-[#151514] px-4 py-3"
                        colSpan={columns.length + 1}
                      >
                        <RowDetail row={row} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pager
        onChange={(next) => {
          setExpanded(null);
          setPage(next);
        }}
        page={safePage}
        pageCount={pageCount}
        total={sorted.length}
      />
      </div>
    </div>
  );
}

function SortableHeader({
  column,
  onSort,
  sort,
  sticky,
}: {
  column: Column;
  onSort: (key: string) => void;
  sort: SortState;
  sticky?: boolean;
}) {
  const active = sort?.key === column.key;
  return (
    <th
      className={cn(
        'px-3 py-2 font-medium',
        column.width,
        sticky && 'sticky left-8 z-20 bg-[#1D1D1C]',
      )}
      scope="col"
      title={column.title}
    >
      <button
        className={cn(
          'inline-flex w-full items-center gap-1 text-[10px] uppercase tracking-[0.1em] transition',
          column.numeric && 'justify-end',
          active ? 'text-[#F2A65A]' : 'text-[#8E8880] hover:text-[#EDE7DC]',
        )}
        onClick={() => onSort(column.key)}
        type="button"
      >
        <span className="truncate">{column.label}</span>
        {active ? (
          sort.direction === 'asc' ? (
            <ChevronUp className="size-3 shrink-0" />
          ) : (
            <ChevronDown className="size-3 shrink-0" />
          )
        ) : null}
      </button>
    </th>
  );
}

/**
 * Everything the projector kept for this row, including the fields too
 * structural for a table cell and the untouched provider object on `_full`.
 */
function RowDetail({ row }: { row: Row }) {
  const full = row._full;
  const scalars: Array<[string, unknown]> = [];
  const structures: Array<[string, unknown]> = [];

  for (const [key, value] of Object.entries(row)) {
    if (key === '_full') continue;
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value) || isRecord(value)) {
      if (Array.isArray(value) && value.length === 0) continue;
      structures.push([key, value]);
    } else {
      scalars.push([key, value]);
    }
  }

  const history = orderedMonthly(row.monthly_searches);

  return (
    <div className="grid gap-3">
      {history.length >= 2 ? (
        <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-[#1A1A19] px-3 py-2">
          <Sparkline height={34} values={history} width={220} />
          <div className="text-[11px] text-[#9F9A92] leading-4">
            <div className="text-[#EDE7DC]">
              {history.length} months of history
            </div>
            <div>
              peak {compactNumber(Math.max(...history))} · low{' '}
              {compactNumber(Math.min(...history))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {scalars.map(([key, value]) => (
          <div
            className="flex items-baseline justify-between gap-3 border-white/5 border-b py-1"
            key={key}
          >
            <span className="text-[#7D7870] text-[11px]">{labelize(key)}</span>
            <span className="truncate text-[#D7D1C8] text-[11px]">
              {genericCell(value)}
            </span>
          </div>
        ))}
      </div>

      {structures.length > 0 ? (
        <div className="grid gap-1.5">
          {structures.map(([key, value]) => (
            <details className="group" key={key}>
              <summary className="cursor-pointer text-[#8E8880] text-[11px] transition hover:text-[#EDE7DC]">
                {labelize(key)}
                <span className="ml-1.5 text-[#5E5A54]">
                  {Array.isArray(value) ? `${value.length} items` : 'object'}
                </span>
              </summary>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#111110] p-2 text-[#9F9A92] text-[10px] leading-4">
                {JSON.stringify(value, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      ) : null}

      {full ? (
        <details>
          <summary className="cursor-pointer text-[#8E8880] text-[11px] transition hover:text-[#EDE7DC]">
            Complete provider record for this keyword
          </summary>
          <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#111110] p-2 text-[#9F9A92] text-[10px] leading-4">
            {JSON.stringify(full, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

function SummaryTiles({
  meta,
  rows,
}: {
  meta?: Record<string, unknown> | null;
  rows: Row[];
}) {
  const stats = useMemo(() => {
    const volumes = rows.map((row) => num(row.search_volume)).filter((v): v is number => v !== null);
    const cpcs = rows.map((row) => num(row.cpc)).filter((v): v is number => v !== null && v > 0);
    const difficulties = rows
      .map((row) => num(row.difficulty))
      .filter((v): v is number => v !== null);

    const intents = new Map<string, number>();
    for (const row of rows) {
      if (typeof row.main_intent === 'string' && row.main_intent) {
        intents.set(row.main_intent, (intents.get(row.main_intent) ?? 0) + 1);
      }
    }
    const topIntent = [...intents.entries()].sort((a, b) => b[1] - a[1])[0];

    const rising = rows.filter((row) => (num(row.monthly_trend) ?? 0) > 0).length;

    return {
      totalVolume: volumes.reduce((sum, value) => sum + value, 0),
      medianCpc: median(cpcs),
      medianDifficulty: median(difficulties),
      topIntent,
      rising,
      hasTrend: rows.some((row) => num(row.monthly_trend) !== null),
    };
  }, [rows]);

  const total = num(meta?.total_count);

  const tiles: Array<{ label: string; value: string; hint?: string }> = [
    {
      label: 'Keywords',
      value: rows.length.toLocaleString('en-US'),
      hint: total && total > rows.length ? `of ${compactNumber(total)} available` : undefined,
    },
    { label: 'Total volume', value: compactNumber(stats.totalVolume) },
  ];

  if (stats.medianCpc !== null) {
    tiles.push({ label: 'Median CPC', value: currency(stats.medianCpc) });
  }
  if (stats.medianDifficulty !== null) {
    tiles.push({
      label: 'Median difficulty',
      value: String(Math.round(stats.medianDifficulty)),
    });
  }
  if (stats.hasTrend) {
    tiles.push({
      label: 'Rising',
      value: `${stats.rising}`,
      hint: `of ${rows.length} month over month`,
    });
  }
  if (stats.topIntent) {
    tiles.push({
      label: 'Top intent',
      value: stats.topIntent[0],
      hint: `${stats.topIntent[1]} keywords`,
    });
  }

  return (
    <div className="grid grid-cols-2 gap-px border-white/8 border-b bg-white/[0.06] sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <div className="bg-[#1A1A19] px-3 py-2.5" key={tile.label}>
          <div className="text-[#7D7870] text-[10px] uppercase tracking-[0.1em]">
            {tile.label}
          </div>
          <div className="mt-0.5 truncate font-medium text-[#EDE7DC] text-sm capitalize">
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

function Pager({
  onChange,
  page,
  pageCount,
  total,
}: {
  onChange: (page: number) => void;
  page: number;
  pageCount: number;
  total: number;
}) {
  const from = page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex items-center justify-between gap-3 border-white/8 border-t px-3 py-2 text-[#7D7870] text-[11px]">
      <span className="tabular-nums">
        {from.toLocaleString('en-US')}–{to.toLocaleString('en-US')} of{' '}
        {total.toLocaleString('en-US')}
      </span>
      {pageCount > 1 ? (
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous page"
            className="inline-flex size-6 items-center justify-center rounded-md transition hover:bg-white/10 hover:text-[#EDE7DC] disabled:opacity-35 disabled:hover:bg-transparent"
            disabled={page === 0}
            onClick={() => onChange(page - 1)}
            type="button"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="tabular-nums px-1">
            {page + 1} / {pageCount}
          </span>
          <button
            aria-label="Next page"
            className="inline-flex size-6 items-center justify-center rounded-md transition hover:bg-white/10 hover:text-[#EDE7DC] disabled:opacity-35 disabled:hover:bg-transparent"
            disabled={page >= pageCount - 1}
            onClick={() => onChange(page + 1)}
            type="button"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
