'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import {
  compactNumber,
  currency,
  fullNumber,
  genericCell,
  labelize,
  num,
  orderedMonthly,
  signedPercent,
  trendTone,
} from './format';
import { MeterBar, Sparkline } from './Sparkline';

export type Row = Record<string, unknown>;

export type Column = {
  key: string;
  label: string;
  /** Right-aligns and enables numeric sorting. */
  numeric?: boolean;
  /** Header tooltip, for anything a two-word label cannot carry. */
  title?: string;
  width?: string;
  render: (row: Row) => ReactNode;
  /** Value used for sorting; defaults to the raw field. */
  sortValue?: (row: Row) => number | string | null;
};

const INTENT_TONES: Record<string, string> = {
  commercial: 'border-[#E8B673]/35 bg-[#E8B673]/12 text-[#E8B673]',
  informational: 'border-[#7FA8D9]/35 bg-[#7FA8D9]/12 text-[#7FA8D9]',
  navigational: 'border-[#B79BD6]/35 bg-[#B79BD6]/12 text-[#B79BD6]',
  transactional: 'border-[#6FBF8B]/35 bg-[#6FBF8B]/12 text-[#6FBF8B]',
};

export function IntentBadge({ value }: { value: unknown }) {
  if (typeof value !== 'string' || !value) {
    return <span className="text-[#5E5A54]">-</span>;
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide',
        INTENT_TONES[value] ?? 'border-white/12 bg-white/5 text-[#9F9A92]',
      )}
    >
      {value}
    </span>
  );
}

/**
 * A signed, unbounded percentage change.
 *
 * Rendered as a coloured number rather than a bar: the value can be +1011%,
 * so there is no meaningful scale to fill.
 */
export function TrendCell({ value }: { value: unknown }) {
  const tone = trendTone(value);
  return (
    <span
      className={cn(
        'tabular-nums',
        tone === 'up' && 'text-[#6FBF8B]',
        tone === 'down' && 'text-[#E08A7A]',
        tone === 'flat' && 'text-[#9F9A92]',
        tone === 'none' && 'text-[#5E5A54]',
      )}
    >
      {signedPercent(value)}
    </span>
  );
}

/**
 * A ranking position with its movement since the previous check.
 *
 * Green when the domain climbed, red when it slipped, a small "new" when the
 * keyword was not ranked before. The absolute position is what the eye reads
 * first, so the delta stays secondary.
 */
function PositionCell({ row }: { row: Row }) {
  const position = num(row.position);
  if (position === null) {
    return <span className="text-[#5E5A54]">-</span>;
  }
  const previous = num(row.previous_position);
  const delta = previous === null ? null : previous - position;
  const isNew = row.is_new === true;
  return (
    <span className="inline-flex items-baseline gap-1 tabular-nums">
      <span className="text-[#EDE7DC]">{position}</span>
      {isNew ? (
        <span className="text-[#7FA8D9] text-[9px] uppercase">new</span>
      ) : delta !== null && delta !== 0 ? (
        <span
          className={cn('text-[10px]', delta > 0 ? 'text-[#6FBF8B]' : 'text-[#E08A7A]')}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The keyword table's columns, in decision-relevance order.
 *
 * Only columns with data in the current rows are shown: a batch can mix
 * endpoints with different signatures (search_intent takes no clickstream
 * flag, the Google Ads volume endpoint returns no difficulty), so a fixed
 * column set would leave whole columns empty.
 */
const KEYWORD_COLUMNS: Column[] = [
  {
    key: 'keyword',
    label: 'Keyword',
    width: 'min-w-[200px]',
    render: (row) => (
      <span className="block max-w-[280px] truncate font-medium text-[#EDE7DC]">
        {String(row.keyword ?? '-')}
      </span>
    ),
    sortValue: (row) => (typeof row.keyword === 'string' ? row.keyword : ''),
  },
  // Website mode: the domain's position for the keyword, with its movement.
  // Absent on every keyword-research endpoint, so these never appear there.
  {
    key: 'position',
    label: 'Pos',
    numeric: true,
    title: 'Where the domain ranks for this keyword, and how that changed',
    render: (row) => <PositionCell row={row} />,
  },
  {
    key: 'search_volume',
    label: 'Volume',
    numeric: true,
    title: 'Average monthly searches',
    render: (row) => (
      <span className="tabular-nums text-[#EDE7DC]">
        {compactNumber(row.search_volume)}
      </span>
    ),
  },
  {
    key: 'traffic',
    label: 'Traffic',
    numeric: true,
    title: 'Estimated monthly visits this keyword brings the domain',
    // An estimate with three decimals ("136.314 visits") reads as false
    // precision, so it is rounded before formatting.
    render: (row) => (
      <span className="tabular-nums text-[#D7D1C8]">
        {compactNumber(
          typeof row.traffic === 'number' ? Math.round(row.traffic) : row.traffic,
        )}
      </span>
    ),
  },
  {
    key: 'competitor_position',
    label: 'Rival pos',
    numeric: true,
    title: 'Where the top competitor ranks for the same keyword',
    render: (row) => (
      <span className="tabular-nums text-[#9F9A92]">
        {typeof row.competitor_position === 'number' ? row.competitor_position : '-'}
      </span>
    ),
  },
  {
    key: 'monthly_searches',
    label: 'History',
    title: 'Monthly search volume over the returned period',
    render: (row) => <Sparkline values={orderedMonthly(row.monthly_searches)} />,
    // Sort by how much the series moved end to end.
    sortValue: (row) => {
      const series = orderedMonthly(row.monthly_searches);
      if (series.length < 2) return null;
      return series[series.length - 1] - series[0];
    },
  },
  {
    key: 'monthly_trend',
    label: 'MoM',
    numeric: true,
    title: 'Month-over-month change in percent',
    render: (row) => <TrendCell value={row.monthly_trend} />,
  },
  {
    key: 'quarterly_trend',
    label: 'QoQ',
    numeric: true,
    title: 'Quarter-over-quarter change in percent',
    render: (row) => <TrendCell value={row.quarterly_trend} />,
  },
  {
    key: 'yearly_trend',
    label: 'YoY',
    numeric: true,
    title: 'Year-over-year change in percent',
    render: (row) => <TrendCell value={row.yearly_trend} />,
  },
  {
    key: 'difficulty',
    label: 'Difficulty',
    numeric: true,
    title: 'Keyword difficulty, 0 to 100',
    render: (row) => <MeterBar tone="difficulty" value={num(row.difficulty)} />,
  },
  {
    key: 'main_intent',
    label: 'Intent',
    render: (row) => <IntentBadge value={row.main_intent} />,
    sortValue: (row) =>
      typeof row.main_intent === 'string' ? row.main_intent : '',
  },
  {
    key: 'cpc',
    label: 'CPC',
    numeric: true,
    title: 'Average cost per click',
    render: (row) => (
      <span className="tabular-nums text-[#D7D1C8]">{currency(row.cpc)}</span>
    ),
  },
  {
    key: 'competition',
    label: 'Competition',
    numeric: true,
    title: 'Advertiser competition, shown on a 0 to 100 scale',
    render: (row) => {
      // Labs sends this as a 0-to-1 float. Rounding it for display gave every
      // row a flat "0"; rescale so it reads like the competition index the
      // Ads endpoints return.
      const raw = num(row.competition);
      const value = raw === null ? null : Math.round(raw * 100);
      const level = row.competition_level;
      return (
        <span className="flex items-center gap-1.5">
          <MeterBar value={value} />
          {typeof level === 'string' ? (
            <span className="text-[10px] uppercase tracking-wide text-[#7D7870]">
              {level}
            </span>
          ) : null}
        </span>
      );
    },
  },
  {
    key: 'competition_index',
    label: 'Competition',
    numeric: true,
    title: 'Advertiser competition, normalised to 0 to 100',
    render: (row) => {
      const value = num(row.competition_index);
      const level = row.competition_level;
      return (
        <span className="flex items-center gap-1.5">
          <MeterBar value={value} />
          {typeof level === 'string' ? (
            <span className="text-[10px] uppercase tracking-wide text-[#7D7870]">
              {level}
            </span>
          ) : null}
        </span>
      );
    },
  },
  {
    key: 'low_top_of_page_bid',
    label: 'Bid low',
    numeric: true,
    render: (row) => (
      <span className="tabular-nums text-[#9F9A92]">
        {currency(row.low_top_of_page_bid)}
      </span>
    ),
  },
  {
    key: 'high_top_of_page_bid',
    label: 'Bid high',
    numeric: true,
    render: (row) => (
      <span className="tabular-nums text-[#9F9A92]">
        {currency(row.high_top_of_page_bid)}
      </span>
    ),
  },
  {
    key: 'clickstream_search_volume',
    label: 'Clickstream',
    numeric: true,
    title: 'Panel-derived search volume; present when clickstream is enabled',
    render: (row) => (
      <span className="tabular-nums text-[#D7D1C8]">
        {compactNumber(row.clickstream_search_volume)}
      </span>
    ),
  },
  {
    key: 'referring_domains',
    label: 'Ref. domains',
    numeric: true,
    title: 'Average referring domains of the pages ranking for this keyword',
    render: (row) => (
      <span className="tabular-nums text-[#D7D1C8]">
        {compactNumber(row.referring_domains)}
      </span>
    ),
  },
  {
    key: 'backlinks',
    label: 'Backlinks',
    numeric: true,
    title: 'Average backlinks of the pages ranking for this keyword',
    render: (row) => (
      <span className="tabular-nums text-[#9F9A92]">
        {compactNumber(row.backlinks)}
      </span>
    ),
  },
  {
    key: 'serp_results_count',
    label: 'SERP results',
    numeric: true,
    title: 'Results the engine reports for this query',
    render: (row) => (
      <span className="tabular-nums text-[#9F9A92]">
        {compactNumber(row.serp_results_count)}
      </span>
    ),
  },
  {
    key: 'depth',
    label: 'Depth',
    numeric: true,
    title: 'Distance from the seed keyword in the related-keywords graph',
    render: (row) => (
      <span className="tabular-nums text-[#9F9A92]">
        {fullNumber(row.depth)}
      </span>
    ),
  },
];

/**
 * Cached social post rows from an older private build. The keyword columns know nothing
 * about them, which left `text` and `views` behind the "more columns" toggle
 * while `id` and `platform` led the table.
 */
function count(key: string, label: string, title: string, tone = 'text-[#EDE7DC]'): Column {
  return {
    key,
    label,
    numeric: true,
    title,
    render: (row) => (
      <span className={cn('tabular-nums', tone)}>
        {row[key] === null || row[key] === undefined ? '-' : compactNumber(row[key])}
      </span>
    ),
  };
}

const SOCIAL_POST_COLUMNS: Column[] = [
  {
    key: 'text',
    label: 'Post',
    width: 'min-w-[260px]',
    render: (row) => {
      const text = String(row.text ?? '').replace(/\s+/g, ' ').trim() || String(row.id ?? '-');
      const url = typeof row.url === 'string' ? row.url : null;
      return url ? (
        <a
          className="block max-w-[420px] truncate font-medium text-[#9FBEDE] transition hover:text-[#C3D8EF] hover:underline"
          href={url}
          rel="noopener noreferrer"
          target="_blank"
          title={text}
        >
          {text}
        </a>
      ) : (
        <span className="block max-w-[420px] truncate font-medium text-[#EDE7DC]" title={text}>
          {text}
        </span>
      );
    },
    sortValue: (row) => (typeof row.text === 'string' ? row.text : ''),
  },
  {
    key: 'posted_at',
    label: 'Posted',
    title: 'When the platform says it was published',
    render: (row) => {
      const value = typeof row.posted_at === 'string' ? new Date(row.posted_at) : null;
      return (
        <span className="whitespace-nowrap tabular-nums text-[#9F9A92]">
          {value && !Number.isNaN(value.getTime())
            ? value.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : '-'}
        </span>
      );
    },
    sortValue: (row) => (typeof row.posted_at === 'string' ? row.posted_at : ''),
  },
  count('views', 'Views', 'Views or plays the platform reports'),
  count('likes', 'Likes', 'Likes, hearts, favourites, upvotes or stars'),
  count('comments', 'Comments', 'Comments or replies', 'text-[#D7D1C8]'),
  count('shares', 'Shares', 'Shares, reposts, retweets or forks', 'text-[#D7D1C8]'),
  count('saves', 'Saves', 'Saves, bookmarks or collects', 'text-[#9F9A92]'),
  {
    key: 'media_type',
    label: 'Type',
    render: (row) => (
      <span className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[#9F9A92] text-[10px] uppercase tracking-wide">
        {String(row.media_type ?? '-')}
      </span>
    ),
  },
  {
    key: 'duration_seconds',
    label: 'Length',
    numeric: true,
    title: 'Video length',
    render: (row) => {
      const seconds = num(row.duration_seconds);
      if (seconds === null) return <span className="text-[#5E5A54]">-</span>;
      const minutes = Math.floor(seconds / 60);
      const rest = Math.round(seconds % 60);
      return (
        <span className="tabular-nums text-[#9F9A92]">
          {minutes > 0 ? `${minutes}:${String(rest).padStart(2, '0')}` : `${rest}s`}
        </span>
      );
    },
  },
  {
    key: 'hashtags',
    label: 'Hashtags',
    render: (row) => (
      <span className="block max-w-[220px] truncate text-[#9F9A92]">
        {Array.isArray(row.hashtags) && row.hashtags.length > 0
          ? row.hashtags.map((tag) => `#${String(tag)}`).join(' ')
          : '-'}
      </span>
    ),
    sortValue: (row) => (Array.isArray(row.hashtags) ? row.hashtags.length : 0),
  },
];

/** Social post rows carry a platform and a normalised timestamp. */
function looksLikeSocialPosts(rows: Row[]): boolean {
  const sample = rows[0];
  return (
    sample !== undefined &&
    typeof sample.platform === 'string' &&
    'posted_at' in sample &&
    'media_type' in sample
  );
}

/** True when a value would render as an empty cell. */
function isBlank(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * The columns for these rows, split into what the table shows by default and
 * what it keeps one click away.
 *
 * `related_keywords` populates 27 distinct fields. Rendering all of them by
 * default is the same wall of information the endpoint pills used to be, so
 * the fields with a dedicated renderer lead and the rest sit behind a toggle.
 * Nothing is lost either way: the row expander and both exports always carry
 * every field.
 */
export function resolveKeywordColumns(rows: Row[]): {
  primary: Column[];
  extra: Column[];
} {
  if (rows.length === 0) return { primary: [], extra: [] };

  const populated = new Set<string>();
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (!isBlank(value)) populated.add(key);
    }
  }

  const social = looksLikeSocialPosts(rows);
  const columns = social ? SOCIAL_POST_COLUMNS : KEYWORD_COLUMNS;
  const known = columns.filter((column) => populated.has(column.key));

  // `competition` and `competition_index` are two renderings of one idea; the
  // Labs endpoints send the float, the Ads endpoints the index.
  const primary = known.filter(
    (column) =>
      !(column.key === 'competition_index' && populated.has('competition')),
  );

  const claimed = new Set(columns.map((column) => column.key));
  // Rendered inside the competition cell rather than as a column of its own.
  claimed.add('competition_level');
  // Folded into the Post cell as its link, and constant across a run.
  if (social) {
    claimed.add('url');
    claimed.add('platform');
    claimed.add('id');
  }

  const extra = [...populated]
    .filter((key) => !claimed.has(key) && !key.startsWith('_'))
    // Anything structural belongs in the row expander, not a table cell.
    .filter((key) => !STRUCTURAL_FIELDS.has(key))
    .sort()
    .map<Column>((key) => ({
      key,
      label: labelize(key),
      render: (row) => (
        <span className="block max-w-[220px] truncate text-[#9F9A92]">
          {genericCell(row[key])}
        </span>
      ),
      sortValue: (row) => {
        const value = row[key];
        if (typeof value === 'number') return value;
        return typeof value === 'string' ? value : null;
      },
    }));

  // A result that is not keyword-shaped has no curated set to lead with, so
  // the split would leave the table almost empty. Promote enough generic
  // columns to make it useful and leave the long tail behind the toggle.
  if (primary.length < MIN_PRIMARY_COLUMNS) {
    const promoted = extra.slice(0, GENERIC_PRIMARY_COLUMNS - primary.length);
    return {
      primary: [...primary, ...promoted],
      extra: extra.slice(promoted.length),
    };
  }

  return { primary, extra };
}

/** Below this, the curated set is too thin to be worth leading with alone. */
const MIN_PRIMARY_COLUMNS = 4;
/** How wide a generic table opens before the rest goes behind the toggle. */
const GENERIC_PRIMARY_COLUMNS = 8;

/**
 * Fields that are real data but are objects or long arrays. They travel to the
 * expander and the exports rather than being flattened into a cell.
 */
const STRUCTURAL_FIELDS = new Set([
  'categories',
  'related_keywords',
  'serp_item_types',
  'clickstream_gender_distribution',
  'clickstream_age_distribution',
]);

export { KEYWORD_COLUMNS, STRUCTURAL_FIELDS };
