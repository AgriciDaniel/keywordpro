'use client';

import { cn } from '@/lib/utils';
import { Download, FileText, Loader2, type LucideIcon, Search } from 'lucide-react';
import { useState } from 'react';

/**
 * The report header at the top of a keyword result.
 *
 * It shows what was researched on the left, the endpoint tally and cost as
 * pills, and exports on the right. The table export bar appears after the
 * charts, so this keeps the primary actions directly under the composer.
 */
export function ReportActions({
  cost,
  onDownloadCsv,
  onDownloadJson,
  onDownloadPdf,
  sourcesOk,
  sourcesTotal,
  subtitle,
  title,
}: {
  cost: number | null;
  onDownloadCsv: () => void;
  onDownloadJson: () => void;
  onDownloadPdf: () => Promise<void>;
  sourcesOk: number | null;
  sourcesTotal: number | null;
  subtitle?: string | null;
  title: string;
}) {
  const [buildingPdf, setBuildingPdf] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const allOk = sourcesOk !== null && sourcesTotal !== null && sourcesOk === sourcesTotal;

  async function downloadPdf() {
    if (buildingPdf) return;
    setBuildingPdf(true);
    try {
      await onDownloadPdf();
      setFailed(null);
    } catch {
      // Silently resetting the spinner left the user clicking a button that
      // appeared to do nothing.
      setFailed('PDF failed');
    } finally {
      setBuildingPdf(false);
    }
  }

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-white/8 bg-[#1A1A19] px-3 py-2.5">
      <div className="flex min-w-[260px] flex-1 items-center gap-2">
        <Search className="size-3.5 shrink-0 text-[#F2A65A]" />
        <div className="min-w-0">
          <span className="block truncate font-medium text-[#EDE7DC] text-sm" title={title}>
            {title}
          </span>
          {subtitle ? <div className="truncate text-[#7D7870] text-[11px]">{subtitle}</div> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[#7D7870] text-[10px] uppercase tracking-[0.1em]">
        {sourcesTotal !== null && sourcesTotal > 0 ? (
          <span
            className="rounded-full border px-2 py-0.5 tabular-nums normal-case tracking-normal"
            style={{
              borderColor: allOk ? 'rgba(111,191,139,0.35)' : 'rgba(232,182,115,0.35)',
              color: allOk ? '#6FBF8B' : '#E8B673',
            }}
          >
            {sourcesOk ?? 0} of {sourcesTotal} endpoints
          </span>
        ) : null}
        {cost !== null ? (
          <span className="rounded-full border border-white/10 px-1.5 py-0.5 tabular-nums normal-case tracking-normal">
            {cost < 0.01 ? '<$0.01' : `$${cost.toFixed(3)}`}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <ExportButton
          busy={buildingPdf}
          icon={FileText}
          label={failed ?? 'PDF'}
          onClick={downloadPdf}
          title="A shareable report: headline figures, charts and the full table"
        />
        <ExportButton
          icon={Download}
          label="CSV"
          onClick={onDownloadCsv}
          title="Every column, every row, in the current sort order"
        />
        <ExportButton
          icon={Download}
          label="JSON"
          onClick={onDownloadJson}
          title="Projected rows plus the complete provider response"
        />
      </div>
    </header>
  );
}

function ExportButton({
  busy,
  icon: Icon,
  label,
  onClick,
  title,
}: {
  busy?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[11px] transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A65A]/45',
        'border-white/10 text-[#9F9A92] hover:border-white/20 hover:bg-white/[0.05] hover:text-[#EDE7DC]',
      )}
      disabled={busy}
      onClick={onClick}
      title={title}
      type="button"
    >
      {busy ? <Loader2 className="size-3 animate-spin" /> : <Icon className="size-3" />}
      {label}
    </button>
  );
}
