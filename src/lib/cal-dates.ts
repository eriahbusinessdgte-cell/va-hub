// ---------- Plain YYYY-MM-DD date math (no time-zone surprises) ----------

const toDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const toStr = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(s: string, n: number) {
  const d = toDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toStr(d);
}
export function addMonths(s: string, n: number) {
  const d = toDate(s);
  return toStr(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)));
}
export function weekday(s: string) {
  return toDate(s).getUTCDay(); // 0 = Sunday
}
export function startOfWeek(s: string) {
  return addDays(s, -weekday(s));
}
export function startOfMonth(s: string) {
  return s.slice(0, 8) + "01";
}
export function isValidDate(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && toStr(toDate(s)) === s;
}
export function fmt(s: string, opts: Intl.DateTimeFormatOptions) {
  return toDate(s).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}

/** The visible date range for a view (month grids show whole weeks). */
export function rangeFor(view: "month" | "week" | "day", date: string) {
  if (view === "day") return { start: date, end: date };
  if (view === "week") {
    const start = startOfWeek(date);
    return { start, end: addDays(start, 6) };
  }
  const first = startOfMonth(date);
  const start = startOfWeek(first);
  const lastOfMonth = addDays(addMonths(first, 1), -1);
  const end = addDays(startOfWeek(lastOfMonth), 6);
  return { start, end };
}

export function daysBetween(start: string, end: string) {
  const out: string[] = [];
  for (let d = start; d <= end && out.length < 60; d = addDays(d, 1)) out.push(d);
  return out;
}
