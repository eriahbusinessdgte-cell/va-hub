/**
 * Small, dependency-free CSV helpers.
 * Handles quoted fields, commas/newlines inside quotes, "" escapes, CRLF, BOM,
 * and semicolon- or tab-separated files (common from Excel in some regions).
 */
export function parseCSV(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.slice(0, src.search(/\r?\n/) === -1 ? src.length : src.search(/\r?\n/));
  const count = (ch: string) => firstLine.split(ch).length - 1;
  const delim = [",", ";", "\t"].sort((a, b) => count(b) - count(a))[0];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop completely empty lines
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

/** Makes a CSV string. Starts with a BOM so Excel reads accents/emoji correctly. */
export function toCSV(rows: (string | number | boolean | null | undefined)[][]): string {
  const esc = (v: string | number | boolean | null | undefined) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    // Stop spreadsheet apps treating text as a formula
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Turns common date formats into YYYY-MM-DD, or null if it can't be understood.
 * Accepts 2026-11-05, 11/5/2026 (US month first), 5 Nov 2026, Nov 5 2026, November 5, 2026.
 */
export function parseDate(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  const valid = (y: number, m: number, d: number) => {
    if (y < 100) y += 2000;
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return dt.toISOString().slice(0, 10);
  };
  let m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    // US style (month first) unless the first number can't be a month
    const a = +m[1], b = +m[2];
    return a > 12 ? valid(+m[3], b, a) : valid(+m[3], a, b);
  }
  const monthOf = (word: string) => MONTHS[word.slice(0, 4).toLowerCase()] ?? MONTHS[word.slice(0, 3).toLowerCase()];
  m = v.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{2,4})$/);
  if (m && monthOf(m[2])) return valid(+m[3], monthOf(m[2]), +m[1]);
  m = v.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{2,4})$/);
  if (m) {
    if (monthOf(m[1])) return valid(+m[3], monthOf(m[1]), +m[2]);
  }
  return null;
}
