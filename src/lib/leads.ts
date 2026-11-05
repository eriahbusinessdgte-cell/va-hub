export const STATUS_COLORS = {
  gray: { label: "Gray", badge: "bg-stone-100 text-stone-700", dot: "bg-stone-400" },
  blue: { label: "Blue", badge: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  purple: { label: "Purple", badge: "bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  amber: { label: "Amber", badge: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  green: { label: "Green", badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  red: { label: "Red", badge: "bg-red-50 text-red-700", dot: "bg-red-500" },
  pink: { label: "Pink", badge: "bg-pink-50 text-pink-700", dot: "bg-pink-500" },
  teal: { label: "Teal", badge: "bg-teal-50 text-teal-700", dot: "bg-teal-500" },
} as const;

export type StatusColor = keyof typeof STATUS_COLORS;

export function colorOf(c: string | null | undefined) {
  return STATUS_COLORS[(c as StatusColor) in STATUS_COLORS ? (c as StatusColor) : "gray"];
}

export type LeadStatus = {
  id: string;
  client_id: string;
  name: string;
  color: string;
  kind: "open" | "won" | "lost";
  sort_order: number;
};

export type Lead = {
  id: string;
  client_id: string;
  status_id: string | null;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  social_url: string | null;
  source: string | null;
  date_contacted: string | null;
  follow_up_date: string | null;
  next_action: string | null;
  notes: string | null;
  created_at: string;
  clients: { name: string } | null;
  lead_statuses: { name: string; color: string; kind: string } | null;
};

export const LEAD_FIELDS =
  "id, client_id, status_id, name, company, email, phone, website, social_url, source, date_contacted, follow_up_date, next_action, notes, created_at, clients(name), lead_statuses(name, color, kind)";

export const STATUS_FIELDS = "id, client_id, name, color, kind, sort_order";

export function normaliseLead(l: Lead): Lead {
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
  return { ...l, clients: one(l.clients), lead_statuses: one(l.lead_statuses) };
}

// ---------- Follow-ups ----------

export type FollowUpState = "overdue" | "today" | "soon" | "later" | "none";

function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Closed leads (won/lost) never count as overdue. */
export function followUpState(lead: Pick<Lead, "follow_up_date" | "lead_statuses">, today: string): FollowUpState {
  if (!lead.follow_up_date || lead.lead_statuses?.kind === "won" || lead.lead_statuses?.kind === "lost") return "none";
  if (lead.follow_up_date < today) return "overdue";
  if (lead.follow_up_date === today) return "today";
  if (lead.follow_up_date <= addDays(today, 7)) return "soon";
  return "later";
}

// ---------- Filtering & sorting (done in the app; lead lists are small) ----------

export type LeadFilters = {
  q?: string;
  status?: string; // a status id (client view) or open/won/lost (all-leads view)
  followup?: string; // due | overdue | week | none
  source?: string;
  client?: string;
  sort?: string; // followup | name | contacted | newest
};

export function filterLeads(leads: Lead[], f: LeadFilters, today: string): Lead[] {
  const q = f.q?.trim().toLowerCase();
  return leads.filter((l) => {
    if (q) {
      const hay = [l.name, l.company, l.email, l.phone, l.source, l.next_action, l.notes, l.social_url]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.client && l.client_id !== f.client) return false;
    if (f.status) {
      if (["open", "won", "lost"].includes(f.status)) {
        if ((l.lead_statuses?.kind ?? "open") !== f.status) return false;
      } else if (f.status === "none") {
        if (l.status_id) return false;
      } else if (l.status_id !== f.status) return false;
    }
    if (f.source && (l.source ?? "").toLowerCase() !== f.source.toLowerCase()) return false;
    if (f.followup) {
      const s = followUpState(l, today);
      if (f.followup === "due" && s !== "overdue" && s !== "today") return false;
      if (f.followup === "overdue" && s !== "overdue") return false;
      if (f.followup === "week" && s !== "overdue" && s !== "today" && s !== "soon") return false;
      if (f.followup === "none" && l.follow_up_date) return false;
    }
    return true;
  });
}

export function sortLeads(leads: Lead[], sort: string | undefined): Lead[] {
  const by = sort ?? "followup";
  return [...leads].sort((a, b) => {
    if (by === "name") return a.name.localeCompare(b.name);
    if (by === "newest") return b.created_at.localeCompare(a.created_at);
    if (by === "contacted") {
      if (a.date_contacted === b.date_contacted) return a.name.localeCompare(b.name);
      if (!a.date_contacted) return 1;
      if (!b.date_contacted) return -1;
      return b.date_contacted.localeCompare(a.date_contacted);
    }
    // Follow-up: soonest first, leads without a date last
    if (a.follow_up_date === b.follow_up_date) return a.name.localeCompare(b.name);
    if (!a.follow_up_date) return 1;
    if (!b.follow_up_date) return -1;
    return a.follow_up_date.localeCompare(b.follow_up_date);
  });
}

export function hostOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Distinct sources, ignoring capitalisation differences ("Instagram" = "instagram"). */
export function uniqueSources(values: (string | null)[]): string[] {
  const seen = new Map<string, string>();
  for (const v of values) {
    const t = v?.trim();
    if (t && !seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
