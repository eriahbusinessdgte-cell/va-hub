/**
 * Recurring task rules.
 * Stored on tasks.recurrence as JSON, e.g. {"freq":"weekly","interval":1,"weekdays":[1,3]}
 */
export type Recurrence = {
  freq: "daily" | "weekly" | "monthly" | "every_x_days";
  interval?: number;
  /** 0 = Sunday … 6 = Saturday (weekly only) */
  weekdays?: number[];
};

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function parseRecurrence(value: unknown): Recurrence | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Recurrence;
  if (!["daily", "weekly", "monthly", "every_x_days"].includes(r.freq)) return null;
  const interval = Math.min(Math.max(Math.floor(Number(r.interval) || 1), 1), 365);
  const weekdays = Array.isArray(r.weekdays)
    ? [...new Set(r.weekdays.map(Number).filter((d) => d >= 0 && d <= 6))].sort()
    : undefined;
  return { freq: r.freq, interval, ...(r.freq === "weekly" && weekdays?.length ? { weekdays } : {}) };
}

export function describeRecurrence(r: Recurrence | null): string {
  if (!r) return "Doesn't repeat";
  const n = r.interval ?? 1;
  switch (r.freq) {
    case "daily":
      return "Every day";
    case "every_x_days":
      return n === 1 ? "Every day" : `Every ${n} days`;
    case "monthly":
      return n === 1 ? "Every month" : `Every ${n} months`;
    case "weekly":
      return r.weekdays?.length ? `Weekly on ${r.weekdays.map((d) => WEEKDAYS[d]).join(", ")}` : "Every week";
  }
}

// ---- Date helpers on plain YYYY-MM-DD strings (no time-zone surprises) ----

function toDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function toStr(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(s: string, n: number) {
  const d = toDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toStr(d);
}
function addMonths(s: string, n: number, dayOfMonth: number) {
  const d = toDate(s);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(dayOfMonth, lastDay));
  return toStr(target);
}

function advance(r: Recurrence, from: string, anchorDay: number): string {
  const n = r.interval ?? 1;
  switch (r.freq) {
    case "daily":
      return addDays(from, 1);
    case "every_x_days":
      return addDays(from, n);
    case "monthly":
      return addMonths(from, n, anchorDay);
    case "weekly": {
      if (!r.weekdays?.length) return addDays(from, 7 * n);
      for (let i = 1; i <= 7; i++) {
        const next = addDays(from, i);
        if (r.weekdays.includes(toDate(next).getUTCDay())) return next;
      }
      return addDays(from, 7);
    }
  }
}

/**
 * The next due date after completing a repeating task.
 * Starts from the task's due date (or today), and never lands in the past.
 */
export function nextDueDate(r: Recurrence, dueDate: string | null, today: string): string {
  const base = dueDate ?? today;
  const anchorDay = toDate(base).getUTCDate();
  let next = advance(r, base, anchorDay);
  for (let i = 0; next < today && i < 1000; i++) next = advance(r, next, anchorDay);
  return next;
}
