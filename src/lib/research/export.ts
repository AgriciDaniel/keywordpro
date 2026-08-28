/*
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Getting research data back out of the app.
 *
 * Every run keeps three shapes and each is worth exporting for a different
 * reason: the untouched provider envelope (`raw`) for debugging and for fields
 * no projector reads yet, the projected rows for analysis, and CSV for a
 * spreadsheet. Pure and DOM-free apart from `downloadFile`, so the shaping is
 * testable without a browser.
 */

/** Columns whose value is a nested object or long series, unhelpful in a cell. */
const CSV_SKIP_PREFIX = '_';

export function toCsv(
  rows: Array<Record<string, unknown>>,
  columns?: string[],
): string {
  if (rows.length === 0) return '';

  const headers =
    columns ??
    [...new Set(rows.flatMap((row) => Object.keys(row)))].filter(
      (key) => !key.startsWith(CSV_SKIP_PREFIX),
    );

  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header])).join(','));
  }
  return lines.join('\r\n');
}

/**
 * One CSV field.
 *
 * Excel and Sheets read a leading `=`, `+`, `-` or `@` as a formula, so a
 * keyword like `-seo` would execute rather than display. Prefixing a tab
 * neutralises that: the cell displays as intended, though the stored value
 * does gain the leading tab, which matters if it is copied back out.
 *
 * The guard applies to text only. A trend of `-97` is a number, not a
 * formula, and tab-prefixing it would land in the spreadsheet as text and
 * break every calculation downstream.
 */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';

  let text: string;
  if (Array.isArray(value)) {
    text = value.length === 0 ? '' : JSON.stringify(value);
  } else if (typeof value === 'object') {
    text = JSON.stringify(value);
  } else {
    text = String(value);
    if (/^[=+\-@]/.test(text)) text = `\t${text}`;
  }

  if (/[",\r\n\t]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function safeStringify(value: unknown, indent = 2): string {
  try {
    return JSON.stringify(value, null, indent) ?? '';
  } catch {
    // Circular or otherwise unserialisable: fall back rather than throw at the
    // click of a download button.
    return String(value);
  }
}

/** A filesystem-safe stem, e.g. `labs.google.related_keywords.live` -> same. */
export function exportFilename(endpointType: string, extension: string): string {
  const stem = endpointType.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '');
  return `${stem || 'research'}.${extension}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Clipboard is permission-gated and throws in insecure contexts.
  }
  return false;
}

export function downloadFile(
  filename: string,
  contents: string,
  mimeType: string,
): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([contents], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
