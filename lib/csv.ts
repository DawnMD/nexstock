/**
 * CSV generation.
 *
 * Hand-rolled rather than pulling in a dependency: the whole job is quoting, and
 * the rules are short enough to state exactly.
 */

/**
 * Quote a single cell.
 *
 * RFC 4180: a field containing a comma, a quote or a newline is wrapped in
 * quotes, and quotes inside it are doubled. A leading `=`, `+`, `-` or `@` is
 * additionally prefixed with a tab — Excel and Sheets treat those as the start
 * of a formula, so a SKU like `-A100` would otherwise be evaluated rather than
 * displayed, and a crafted value could become a spreadsheet-injection payload.
 */
function escapeCell(value: CsvValue): string {
  if (value == null) return "";

  const raw = value instanceof Date ? value.toISOString() : String(value);

  // Only strings get the guard. A negative *number* is a number: prefixing -42
  // with a tab makes the spreadsheet store it as text, so the column stops
  // summing — and this app exports plenty of them (signed ledger quantities,
  // free capacity on an over-filled rack).
  const needsFormulaGuard =
    typeof value === "string" && /^[=+\-@\t\r]/.test(raw);
  const guarded = needsFormulaGuard ? `\t${raw}` : raw;

  return /[",\n\r\t]/.test(guarded)
    ? `"${guarded.replace(/"/g, '""')}"`
    : guarded;
}

/**
 * What a cell may hold. Deliberately not `unknown`: an object stringifies to
 * `[object Object]`, which is a silently wrong cell rather than a loud error, so
 * the caller is made to convert first.
 */
export type CsvValue = string | number | boolean | Date | null | undefined;

export interface CsvColumn<Row> {
  header: string;
  value: (row: Row) => CsvValue;
}

export function toCsv<Row>(rows: Row[], columns: CsvColumn<Row>[]): string {
  const lines = [columns.map((column) => escapeCell(column.header)).join(",")];

  for (const row of rows) {
    lines.push(
      columns.map((column) => escapeCell(column.value(row))).join(","),
    );
  }

  // CRLF per RFC 4180, and a trailing newline so the file ends cleanly.
  return lines.join("\r\n") + "\r\n";
}

/**
 * A downloadable CSV response.
 *
 * The BOM is what makes Excel open a UTF-8 file as UTF-8 rather than as the
 * system codepage, which otherwise mangles any non-ASCII vendor name.
 */
export function csvResponse(filename: string, body: string): Response {
  return new Response(`﻿${body}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // These are live warehouse numbers; a cached copy is a wrong copy.
      "Cache-Control": "no-store",
    },
  });
}
