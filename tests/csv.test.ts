/**
 * CSV escaping.
 *
 * Pure functions with no database, but worth testing precisely because the
 * failure mode is silent: a badly quoted cell does not throw, it just produces a
 * file that opens wrong in a spreadsheet.
 */
import { describe, expect, it } from "vitest";

import { toCsv } from "@/lib/csv";

const single = (value: unknown) =>
  toCsv(
    [{ v: value }],
    [{ header: "v", value: (row) => row.v as string | number | null }],
  );

describe("toCsv", () => {
  it("writes a header row and CRLF line endings", () => {
    const csv = toCsv(
      [
        { sku: "SKU-1", qty: 4 },
        { sku: "SKU-2", qty: 7 },
      ],
      [
        { header: "SKU", value: (row) => row.sku },
        { header: "Qty", value: (row) => row.qty },
      ],
    );

    // RFC 4180 says CRLF, and a trailing newline so the file ends cleanly.
    expect(csv).toBe("SKU,Qty\r\nSKU-1,4\r\nSKU-2,7\r\n");
  });

  it("quotes a cell containing a comma, a quote or a newline", () => {
    expect(single("a,b")).toBe('v\r\n"a,b"\r\n');
    // Quotes inside a quoted field are doubled, not backslash-escaped.
    expect(single('say "hi"')).toBe('v\r\n"say ""hi"""\r\n');
    expect(single("line1\nline2")).toBe('v\r\n"line1\nline2"\r\n');
  });

  it("leaves an ordinary value unquoted", () => {
    expect(single("PLAIN")).toBe("v\r\nPLAIN\r\n");
    expect(single(42)).toBe("v\r\n42\r\n");
  });

  it("writes an empty cell for null and undefined", () => {
    expect(single(null)).toBe("v\r\n\r\n");
    expect(single(undefined)).toBe("v\r\n\r\n");
  });

  it("renders dates as ISO strings", () => {
    const csv = single(new Date("2026-03-04T05:06:07.000Z"));
    expect(csv).toBe("v\r\n2026-03-04T05:06:07.000Z\r\n");
  });

  /**
   * Excel and Sheets evaluate a cell starting with =, +, - or @ as a formula.
   * Left alone, a SKU like `-A100` is computed rather than displayed, and a
   * value someone controls becomes a spreadsheet-injection payload.
   */
  it("defuses a value a spreadsheet would treat as a formula", () => {
    // Prefixed with a tab, which then forces quoting.
    expect(single("=1+1")).toBe('v\r\n"\t=1+1"\r\n');
    expect(single("@SUM(A1)")).toBe('v\r\n"\t@SUM(A1)"\r\n');
    expect(single("-A100")).toBe('v\r\n"\t-A100"\r\n');
    expect(single("+42")).toBe('v\r\n"\t+42"\r\n');

    // A negative number is a number, not a string, so it is untouched.
    expect(single(-42)).toBe("v\r\n-42\r\n");
  });

  it("handles no rows at all", () => {
    expect(toCsv([], [{ header: "SKU", value: () => "" }])).toBe("SKU\r\n");
  });
});
