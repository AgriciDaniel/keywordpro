/*
 * SPDX-License-Identifier: Apache-2.0
 */

import type { KeywordAnalytics } from '@/components/research-console/results/charts/analytics';

/**
 * A shareable research report.
 *
 * Drawn with jsPDF's vector primitives rather than by rasterising the page
 * with html2canvas: the text stays selectable and searchable, the file is
 * tens of kilobytes instead of megabytes, and it does not depend on the
 * charts having finished rendering on screen. The charts are redrawn here as
 * simple filled rectangles, which is all a printed page needs.
 *
 * jsPDF is loaded on demand so it never reaches the initial route bundle.
 */

type Row = Record<string, unknown>;

const PAGE = { width: 595.28, height: 841.89 }; // A4 portrait, points
const MARGIN = 40;
const INK = {
  paper: [17, 17, 16] as const,
  heading: [237, 231, 220] as const,
  body: [199, 196, 188] as const,
  muted: [125, 120, 112] as const,
  accent: [242, 166, 90] as const,
  rule: [48, 47, 45] as const,
  positive: [111, 191, 139] as const,
  negative: [224, 138, 122] as const,
};

export type ReportInput = {
  endpointType: string;
  rows: Row[];
  stats: KeywordAnalytics;
  title: string;
};

/** Build the report and hand it to the browser as a download. */
export async function downloadKeywordReport(input: ReportInput): Promise<void> {
  const doc = await buildKeywordReport(input);
  doc.save(`${input.endpointType.replace(/[^a-z0-9._-]+/gi, '-')}.pdf`);
}

/**
 * Build the document without saving it, so the layout can be exercised
 * outside a browser.
 */
export async function buildKeywordReport({
  endpointType,
  rows,
  stats,
  title,
}: ReportInput): Promise<Doc> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  let y = MARGIN;
  const contentWidth = PAGE.width - MARGIN * 2;

  const paintBackground = () => {
    doc.setFillColor(...INK.paper);
    doc.rect(0, 0, PAGE.width, PAGE.height, 'F');
  };
  paintBackground();

  const newPage = () => {
    doc.addPage();
    paintBackground();
    y = MARGIN;
  };

  const ensure = (needed: number) => {
    if (y + needed > PAGE.height - MARGIN) newPage();
  };

  // Title block
  doc.setTextColor(...INK.heading);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, MARGIN, y + 6);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...INK.muted);
  doc.text(`${endpointType} · ${stats.count} keywords`, MARGIN, y);
  y += 20;

  doc.setDrawColor(...INK.rule);
  doc.line(MARGIN, y, PAGE.width - MARGIN, y);
  y += 22;

  // Headline figures, three across
  const figures: Array<[string, string]> = [
    ['Keywords', stats.count.toLocaleString('en-US')],
    ['Total volume', compact(stats.totalVolume)],
    ['Median CPC', stats.medianCpc === null ? '-' : `$${stats.medianCpc.toFixed(2)}`],
    [
      'Median difficulty',
      stats.medianDifficulty === null ? '-' : String(Math.round(stats.medianDifficulty)),
    ],
    ['Rising', `${stats.rising} of ${stats.trendCoverage}`],
    [
      'Year over year',
      stats.aggregateTrend.yearly === null
        ? '-'
        : `${stats.aggregateTrend.yearly > 0 ? '+' : ''}${Math.round(stats.aggregateTrend.yearly)}%`,
    ],
  ];

  const columnWidth = contentWidth / 3;
  figures.forEach(([label, value], index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = MARGIN + column * columnWidth;
    const top = y + row * 40;

    doc.setFontSize(7);
    doc.setTextColor(...INK.muted);
    doc.text(label.toUpperCase(), x, top);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK.heading);
    doc.text(value, x, top + 16);
    doc.setFont('helvetica', 'normal');
  });
  y += Math.ceil(figures.length / 3) * 40 + 12;

  // Demand over time, as a simple column chart
  if (stats.monthly.length >= 2) {
    ensure(140);
    sectionHeading(doc, 'Search demand over time', MARGIN, y);
    y += 16;

    const chartHeight = 90;
    const max = Math.max(...stats.monthly.map((point) => point.volume)) || 1;
    const barGap = 2;
    const barWidth = Math.max(
      1,
      (contentWidth - barGap * (stats.monthly.length - 1)) / stats.monthly.length,
    );

    stats.monthly.forEach((point, index) => {
      const height = Math.max(1, (point.volume / max) * chartHeight);
      doc.setFillColor(...INK.accent);
      doc.rect(
        MARGIN + index * (barWidth + barGap),
        y + chartHeight - height,
        barWidth,
        height,
        'F',
      );
    });
    y += chartHeight + 10;

    doc.setFontSize(7);
    doc.setTextColor(...INK.muted);
    doc.text(stats.monthly[0].label, MARGIN, y);
    // The bars sit on a zero baseline, so a set that only moves between 15M
    // and 19M looks flat. Print the range so the shape is still readable.
    const min = Math.min(...stats.monthly.map((point) => point.volume));
    doc.text(
      `${compact(min)} to ${compact(max)} per month`,
      PAGE.width / 2,
      y,
      { align: 'center' },
    );
    doc.text(
      stats.monthly[stats.monthly.length - 1].label,
      PAGE.width - MARGIN,
      y,
      { align: 'right' },
    );
    y += 20;
  }

  // Ranked lists
  y = rankedSection(doc, 'Highest volume', stats.topByVolume, y, ensure);
  y = rankedSection(doc, 'Easiest wins', stats.easiestWins, y, ensure);

  // Intent split
  if (stats.intentSplit.length > 0) {
    ensure(30 + stats.intentSplit.length * 14);
    sectionHeading(doc, 'Search intent', MARGIN, y);
    y += 16;
    for (const slice of stats.intentSplit) {
      const share = stats.count > 0 ? Math.round((slice.value / stats.count) * 100) : 0;
      doc.setFillColor(...hexToRgb(slice.color));
      doc.rect(MARGIN, y - 6, 8, 8, 'F');
      doc.setFontSize(9);
      doc.setTextColor(...INK.body);
      doc.text(capitalise(slice.name), MARGIN + 14, y);
      doc.setTextColor(...INK.muted);
      doc.text(`${slice.value} · ${share}%`, PAGE.width - MARGIN, y, {
        align: 'right',
      });
      y += 14;
    }
    y += 12;
  }

  // The full table
  newPage();
  sectionHeading(doc, `All ${rows.length} keywords`, MARGIN, y);
  y += 18;

  const columns: Array<{ align?: 'right'; key: string; label: string; width: number }> = [
    { key: 'keyword', label: 'Keyword', width: 200 },
    { key: 'search_volume', label: 'Volume', width: 58, align: 'right' },
    { key: 'difficulty', label: 'KD', width: 34, align: 'right' },
    { key: 'cpc', label: 'CPC', width: 52, align: 'right' },
    // Right-aligned columns print at x + width, so the next column needs its
    // own gutter or the values butt straight into it.
    { key: 'monthly_trend', label: 'MoM', width: 52, align: 'right' },
    { key: 'spacer', label: '', width: 12 },
    { key: 'main_intent', label: 'Intent', width: 82 },
  ];

  const header = () => {
    doc.setFontSize(7);
    doc.setTextColor(...INK.muted);
    let x = MARGIN;
    for (const column of columns) {
      doc.text(
        column.label.toUpperCase(),
        column.align === 'right' ? x + column.width : x,
        y,
        { align: column.align },
      );
      x += column.width;
    }
    y += 6;
    doc.setDrawColor(...INK.rule);
    doc.line(MARGIN, y, PAGE.width - MARGIN, y);
    y += 12;
  };
  header();

  doc.setFontSize(8);
  for (const row of rows) {
    if (y > PAGE.height - MARGIN) {
      newPage();
      header();
      doc.setFontSize(8);
    }

    let x = MARGIN;
    for (const column of columns) {
      if (column.key === 'spacer') {
        x += column.width;
        continue;
      }
      const raw = row[column.key];
      let text: string;
      let color: readonly [number, number, number] = INK.body;

      if (column.key === 'search_volume') {
        text = typeof raw === 'number' ? compact(raw) : '-';
      } else if (column.key === 'cpc') {
        text = typeof raw === 'number' ? `$${raw.toFixed(2)}` : '-';
      } else if (column.key === 'difficulty') {
        text = typeof raw === 'number' ? String(Math.round(raw)) : '-';
      } else if (column.key === 'monthly_trend') {
        if (typeof raw === 'number') {
          text = `${raw > 0 ? '+' : ''}${Math.round(raw)}%`;
          color = raw > 0 ? INK.positive : raw < 0 ? INK.negative : INK.muted;
        } else {
          text = '-';
        }
      } else {
        text = typeof raw === 'string' && raw ? raw : '-';
        if (column.key === 'keyword') color = INK.heading;
      }

      doc.setTextColor(...color);
      doc.text(
        truncate(doc, text, column.width - 6),
        column.align === 'right' ? x + column.width : x,
        y,
        { align: column.align },
      );
      x += column.width;
    }
    y += 13;
  }

  return doc;
}

/** The jsPDF instance type, without importing the module at runtime. */
type Doc = InstanceType<typeof import('jspdf').jsPDF>;

function sectionHeading(doc: Doc, text: string, x: number, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...INK.heading);
  doc.text(text, x, y);
  doc.setFont('helvetica', 'normal');
}

function rankedSection(
  doc: Doc,
  title: string,
  items: KeywordAnalytics['topByVolume'],
  startY: number,
  ensure: (needed: number) => void,
): number {
  if (items.length === 0) return startY;

  ensure(30 + items.length * 16);
  let y = startY;
  sectionHeading(doc, title, MARGIN, y);
  y += 16;

  const contentWidth = PAGE.width - MARGIN * 2;
  // 180pt of label on the left, 60pt of value gutter on the right, so a
  // "110.0K" never prints on top of the bar it belongs to.
  const barMax = contentWidth - 180 - 60;

  for (const item of items) {
    doc.setFontSize(8);
    doc.setTextColor(...INK.body);
    doc.text(truncate(doc, item.label, 170), MARGIN, y);

    doc.setFillColor(...INK.rule);
    doc.rect(MARGIN + 180, y - 6, barMax, 5, 'F');
    doc.setFillColor(...INK.accent);
    doc.rect(
      MARGIN + 180,
      y - 6,
      Math.max(1, (item.share / 100) * barMax),
      5,
      'F',
    );

    doc.setTextColor(...INK.muted);
    doc.text(compact(item.value), PAGE.width - MARGIN, y, { align: 'right' });
    y += 16;
  }

  return y + 12;
}

/**
 * Shorten a label to fit, in O(log n) measurements.
 *
 * The previous version removed one character at a time and re-measured the
 * whole remaining string each pass. A 5,000-character keyword took three
 * seconds to lay out and a 100,000-character one never finished, freezing the
 * tab, because this runs synchronously on the click.
 */
function truncate(doc: Doc, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;

  // A cheap upper bound first, so the search never starts from a huge string.
  const perChar = doc.getTextWidth(text) / text.length || 1;
  let high = Math.min(text.length, Math.ceil(maxWidth / perChar) + 8);
  let low = 0;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (doc.getTextWidth(`${text.slice(0, mid)}...`) <= maxWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return `${text.slice(0, Math.max(1, low))}...`;
}

function compact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString('en-US');
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}
