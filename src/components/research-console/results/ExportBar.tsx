'use client';

import {
  copyToClipboard,
  downloadFile,
  exportFilename,
  safeStringify,
  toCsv,
} from '@/lib/research/export';
import { cn } from '@/lib/utils';
import { Check, Columns3, Copy, Download, FileText, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Row = Record<string, unknown>;

/**
 * Getting the data out.
 *
 * Four shapes, because they answer different questions: the projected rows for
 * analysis, CSV for a spreadsheet, and the untouched provider envelope for
 * anything the projector does not surface yet.
 *
 * Exports follow the table's current sort so what is downloaded matches what
 * is on screen.
 */
export function ExportBar({
  cost,
  endpointType,
  onDownloadPdf,
  extraColumnCount = 0,
  onToggleColumns,
  raw,
  rows,
  showAllColumns,
  visibleColumns,
}: {
  cost?: number;
  endpointType: string;
  extraColumnCount?: number;
  /** Present only for keyword results, which are what the report renders. */
  onDownloadPdf?: () => Promise<void>;
  onToggleColumns?: () => void;
  raw: unknown;
  rows: Row[];
  showAllColumns?: boolean;
  visibleColumns: string[];
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [buildingPdf, setBuildingPdf] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  async function copy(id: string, text: string) {
    const ok = await copyToClipboard(text);
    setCopied(ok ? id : null);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    if (ok) {
      copyTimer.current = setTimeout(() => setCopied(null), 1600);
    }
  }

  // The rows carry `_full`, which duplicates the provider record. Strip it from
  // the tabular exports and keep it in the JSON one.
  const shaped = rows.map((row) => {
    const { _full, ...rest } = row;
    return rest;
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-white/8 border-b px-3 py-2">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-[#7D7870]">
        <span className="truncate">{endpointType}</span>
        {typeof cost === 'number' ? (
          <span className="rounded-full border border-white/10 px-1.5 py-0.5 tabular-nums normal-case tracking-normal">
            {cost < 0.01 ? '<$0.01' : `$${cost.toFixed(3)}`}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {onToggleColumns && extraColumnCount > 0 ? (
          <ExportButton
            icon={Columns3}
            label={
              showAllColumns
                ? 'Fewer columns'
                : `${extraColumnCount} more columns`
            }
            onClick={onToggleColumns}
            title="Every field is always in the row expander and the exports; this only changes the table"
          />
        ) : null}
        <ExportButton
          done={copied === 'rows'}
          icon={Copy}
          label="Copy JSON"
          onClick={() => copy('rows', safeStringify(shaped))}
          title="The projected rows, as shown in the table"
        />
        <ExportButton
          done={copied === 'raw'}
          icon={Copy}
          label="Copy raw"
          onClick={() => copy('raw', safeStringify(raw))}
          title="The untouched provider response, envelope and all"
        />
        <ExportButton
          icon={Download}
          label="CSV"
          onClick={() =>
            downloadFile(
              exportFilename(endpointType, 'csv'),
              toCsv(shaped, visibleColumns),
              'text/csv',
            )
          }
          title="Every visible column, in the current sort order"
        />
        <ExportButton
          icon={Download}
          label="JSON"
          onClick={() =>
            downloadFile(
              exportFilename(endpointType, 'json'),
              safeStringify({ endpoint: endpointType, rows, raw }),
              'application/json',
            )
          }
          title="Projected rows plus the complete provider response"
        />
        {onDownloadPdf ? (
          <ExportButton
            busy={buildingPdf}
            icon={FileText}
            label={failed ?? 'PDF'}
            onClick={async () => {
              if (buildingPdf) return;
              setBuildingPdf(true);
              try {
                await onDownloadPdf();
                setFailed(null);
              } catch {
                // Silently resetting the spinner left the user clicking a
                // button that appeared to do nothing.
                setFailed('PDF failed');
              } finally {
                setBuildingPdf(false);
              }
            }}
            title="A shareable report: headline figures, charts and the full table"
          />
        ) : null}
      </div>
    </div>
  );
}

function ExportButton({
  busy,
  done,
  icon: Icon,
  label,
  onClick,
  title,
}: {
  busy?: boolean;
  done?: boolean;
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[11px] transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A65A]/45',
        done
          ? 'border-[#6FBF8B]/40 bg-[#6FBF8B]/10 text-[#6FBF8B]'
          : 'border-white/10 text-[#9F9A92] hover:border-white/20 hover:bg-white/[0.05] hover:text-[#EDE7DC]',
      )}
      disabled={busy}
      onClick={onClick}
      title={title}
      type="button"
    >
      {busy ? (
        <Loader2 className="size-3 animate-spin" />
      ) : done ? (
        <Check className="size-3" />
      ) : (
        <Icon className="size-3" />
      )}
      {done ? 'Copied' : label}
    </button>
  );
}
