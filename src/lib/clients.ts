export const CLIENT_STATUSES = [
  { value: "onboarding", label: "Onboarding", className: "bg-blue-50 text-blue-700" },
  { value: "active", label: "Active", className: "bg-emerald-50 text-emerald-700" },
  { value: "paused", label: "Paused", className: "bg-amber-50 text-amber-700" },
  { value: "ended", label: "Ended", className: "bg-stone-100 text-stone-600" },
] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number]["value"];

export type Client = {
  id: string;
  name: string;
  business_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  start_date: string | null;
  status: ClientStatus;
  notes: string | null;
  is_internal: boolean;
  archived_at: string | null;
};

export type ClientLink = { id: string; label: string; url: string };

/** Adds https:// when someone types "example.com". */
export function normalizeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export function formatDate(d: string | null): string {
  if (!d) return "—";
  // Dates are stored as YYYY-MM-DD; format without shifting time zones.
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
