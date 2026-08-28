'use client';

import { useMemo } from 'react';
import { ExportBar } from './ExportBar';
import { genericCell, isRecord, labelize } from './format';
import { KeywordResultView } from './KeywordResultView';
import type { Row } from './keyword-columns';

/**
 * One endpoint's result.
 *
 * Routes on the shape the projector produced rather than on the endpoint name,
 * so a new endpoint gets a usable view without being registered anywhere:
 *
 *   array of objects  -> the sortable, paginated, exportable table
 *   single object     -> the detail view
 *   anything else     -> raw JSON
 *
 * The previous panel capped every result at 8 rows and 6 columns and printed
 * the literal word "Object" for anything nested, which silently hid most of
 * what the provider sent.
 */
export function ResultPanel({ response }: { response: unknown }) {
  const envelope = isRecord(response) ? response : null;
  const data = isRecord(envelope?.data) ? envelope.data : null;
  const results = data?.results;
  const endpointType =
    (typeof data?.type === 'string' && data.type) ||
    (typeof envelope?.type === 'string' && envelope.type) ||
    'result';
  const cost = typeof envelope?.cost === 'number' ? envelope.cost : undefined;
  const raw = envelope?.raw ?? response;
  const meta = isRecord(data?.meta) ? data.meta : null;

  const rows = useMemo<Row[] | null>(() => {
    if (!Array.isArray(results)) return null;
    const records = results.filter(isRecord);
    // A list of plain strings or numbers is not a table.
    return records.length === results.length && records.length > 0
      ? (records as Row[])
      : null;
  }, [results]);

  if (rows) {
    return (
      <KeywordResultView
        cost={cost}
        endpointType={endpointType}
        meta={meta}
        raw={raw}
        rows={rows}
      />
    );
  }

  if (isRecord(results)) {
    return (
      <ObjectResultView
        cost={cost}
        endpointType={endpointType}
        raw={raw}
        record={results as Record<string, unknown>}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#1A1A19]">
      <ExportBar
        cost={cost}
        endpointType={endpointType}
        raw={raw}
        rows={[]}
        visibleColumns={[]}
      />
      <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap break-words p-3 text-[#9F9A92] text-[11px] leading-5">
        {JSON.stringify(results ?? response, null, 2)}
      </pre>
    </div>
  );
}

/**
 * A single-object result: LLM answers, sentiment, trends, task receipts.
 *
 * Long prose gets room to breathe, citations become links, scalars become a
 * definition grid, and nested structures stay expandable rather than being
 * flattened to "Object".
 */
function ObjectResultView({
  cost,
  endpointType,
  raw,
  record,
}: {
  cost?: number;
  endpointType: string;
  raw: unknown;
  record: Record<string, unknown>;
}) {
  const prose =
    typeof record.response_text === 'string' && record.response_text
      ? record.response_text
      : null;
  const citations = Array.isArray(record.citations)
    ? (record.citations.filter(isRecord) as Array<Record<string, unknown>>)
    : [];

  const scalars: Array<[string, unknown]> = [];
  const structures: Array<[string, unknown]> = [];
  for (const [key, value] of Object.entries(record)) {
    if (key === '_full' || key === 'response_text' || key === 'citations') continue;
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value) || isRecord(value)) {
      if (Array.isArray(value) && value.length === 0) continue;
      structures.push([key, value]);
    } else {
      scalars.push([key, value]);
    }
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#1A1A19]">
      <ExportBar
        cost={cost}
        endpointType={endpointType}
        raw={raw}
        rows={[record]}
        visibleColumns={scalars.map(([key]) => key)}
      />

      <div className="grid gap-3 p-3">
        {prose ? (
          <div className="whitespace-pre-wrap rounded-xl border border-white/8 bg-[#151514] px-3 py-2.5 text-[#D7D1C8] text-xs leading-6">
            {prose}
          </div>
        ) : null}

        {citations.length > 0 ? (
          <div className="grid gap-1">
            <div className="text-[#7D7870] text-[10px] uppercase tracking-[0.1em]">
              {citations.length} sources
            </div>
            <ol className="grid gap-1">
              {citations.map((citation, index) => {
                const url = typeof citation.url === 'string' ? citation.url : null;
                const title =
                  typeof citation.title === 'string' && citation.title
                    ? citation.title
                    : (url ?? 'Untitled');
                return (
                  <li
                    className="flex items-baseline gap-2 text-[11px]"
                    key={`${url ?? title}-${index}`}
                  >
                    <span className="tabular-nums text-[#5E5A54]">{index + 1}</span>
                    {url ? (
                      <a
                        className="min-w-0 flex-1 truncate text-[#9FBEDE] transition hover:text-[#C3D8EF] hover:underline"
                        href={url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {title}
                      </a>
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-[#D7D1C8]">
                        {title}
                      </span>
                    )}
                    {typeof citation.domain === 'string' ? (
                      <span className="shrink-0 text-[#5E5A54]">
                        {citation.domain}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}

        {scalars.length > 0 ? (
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
        ) : null}

        {structures.map(([key, value]) => (
          <details key={key}>
            <summary className="cursor-pointer text-[#8E8880] text-[11px] transition hover:text-[#EDE7DC]">
              {labelize(key)}
              <span className="ml-1.5 text-[#5E5A54]">
                {Array.isArray(value) ? `${value.length} items` : 'object'}
              </span>
            </summary>
            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#111110] p-2 text-[#9F9A92] text-[10px] leading-4">
              {JSON.stringify(value, null, 2)}
            </pre>
          </details>
        ))}
      </div>
    </div>
  );
}
