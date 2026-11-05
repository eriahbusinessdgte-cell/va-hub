import { PageHeader } from "@/components/page-header";
import { LeadPanel } from "@/components/lead-panel";
import { LeadBoard, LeadQuickAdd, LeadTable, LeadToolbar } from "@/components/lead-views";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceToday } from "@/lib/workspace";
import {
  filterLeads,
  followUpState,
  LEAD_FIELDS,
  normaliseLead,
  sortLeads,
  STATUS_FIELDS,
  type Lead,
  type LeadFilters,
  type LeadStatus,
  uniqueSources,
} from "@/lib/leads";

export const metadata = { title: "All Leads" };

type Params = LeadFilters & { lead?: string; layout?: string };

export default async function AllLeadsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, is_internal")
    .is("archived_at", null)
    .order("is_internal", { ascending: false })
    .order("name");
  const clientIds = (clients ?? []).map((c) => c.id);

  const [{ data: leadRows }, { today }] = await Promise.all([
    supabase.from("leads").select(LEAD_FIELDS).in("client_id", clientIds).is("archived_at", null).limit(10000),
    getWorkspaceToday(),
  ]);
  const all = ((leadRows ?? []) as unknown as Lead[]).map(normaliseLead);
  const sources = uniqueSources(all.map((l) => l.source));
  const leads = sortLeads(filterLeads(all, sp, today), sp.sort);

  // Pipeline needs one client's stages
  let statuses: LeadStatus[] = [];
  if (sp.layout === "board" && sp.client) {
    const { data } = await supabase.from("lead_statuses").select(STATUS_FIELDS).eq("client_id", sp.client).order("sort_order");
    statuses = (data ?? []) as LeadStatus[];
  }

  const overdue = all.filter((l) => followUpState(l, today) === "overdue").length;
  const dueToday = all.filter((l) => followUpState(l, today) === "today").length;
  const open = all.filter((l) => (l.lead_statuses?.kind ?? "open") === "open").length;
  const won = all.filter((l) => l.lead_statuses?.kind === "won").length;

  const closeHref = (() => {
    const rest = Object.entries(sp).filter(([k, v]) => k !== "lead" && v) as [string, string][];
    const qs = new URLSearchParams(rest).toString();
    return `/leads${qs ? `?${qs}` : ""}`;
  })();

  const stat = (label: string, value: number, tone?: "danger" | "warning") => (
    <div className="rounded-xl border border-line bg-surface px-4 py-3.5">
      <p className="text-[12.5px] text-ink-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tone === "danger" && value > 0 ? "text-danger" : tone === "warning" && value > 0 ? "text-warning" : ""}`}>
        {value}
      </p>
    </div>
  );

  return (
    <>
      <PageHeader title="All Leads" description="Leads from every client in one place." />

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat("Open leads", open)}
        {stat("Follow-ups overdue", overdue, "danger")}
        {stat("Follow-ups today", dueToday, "warning")}
        {stat("Won", won)}
      </section>

      <div className="mb-4">
        <LeadQuickAdd clientOptions={(clients ?? []).map((c) => ({ id: c.id, name: c.name }))} />
      </div>

      <div className="mb-4">
        <LeadToolbar sources={sources} clients={(clients ?? []).map((c) => ({ id: c.id, name: c.name }))} />
      </div>

      {sp.layout === "board" ? (
        sp.client ? (
          <LeadBoard leads={leads} statuses={statuses} today={today} />
        ) : (
          <p className="rounded-xl border border-dashed border-line-strong bg-surface px-5 py-10 text-center text-sm text-ink-muted">
            Each client has its own pipeline stages. Choose a client in the filter above to see its pipeline.
          </p>
        )
      ) : (
        <LeadTable leads={leads} today={today} showClient />
      )}

      {sp.lead && <LeadPanel leadId={sp.lead} closeHref={closeHref} today={today} />}
    </>
  );
}
