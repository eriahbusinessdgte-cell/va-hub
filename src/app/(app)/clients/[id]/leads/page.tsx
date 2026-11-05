import { LeadPanel } from "@/components/lead-panel";
import { LeadBoard, LeadQuickAdd, LeadTable, LeadToolbar } from "@/components/lead-views";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceToday } from "@/lib/workspace";
import {
  filterLeads,
  LEAD_FIELDS,
  normaliseLead,
  sortLeads,
  STATUS_FIELDS,
  type Lead,
  type LeadFilters,
  type LeadStatus,
  uniqueSources,
} from "@/lib/leads";

type Params = LeadFilters & { lead?: string; layout?: string };

export default async function ClientLeadsTab({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Params>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const [{ data: leadRows }, { data: statusRows }, { today }] = await Promise.all([
    supabase.from("leads").select(LEAD_FIELDS).eq("client_id", id).is("archived_at", null).limit(5000),
    supabase.from("lead_statuses").select(STATUS_FIELDS).eq("client_id", id).order("sort_order"),
    getWorkspaceToday(),
  ]);
  const all = ((leadRows ?? []) as unknown as Lead[]).map(normaliseLead);
  const statuses = (statusRows ?? []) as LeadStatus[];
  const sources = uniqueSources(all.map((l) => l.source));
  const leads = sortLeads(filterLeads(all, sp, today), sp.sort);

  const dueNow = all.filter((l) => {
    if (!l.follow_up_date || l.lead_statuses?.kind === "won" || l.lead_statuses?.kind === "lost") return false;
    return l.follow_up_date <= today;
  }).length;

  const closeHref = (() => {
    const rest = Object.entries(sp).filter(([k, v]) => k !== "lead" && v) as [string, string][];
    const qs = new URLSearchParams(rest).toString();
    return `/clients/${id}/leads${qs ? `?${qs}` : ""}`;
  })();

  return (
    <>
      <div className="mb-4">
        <LeadQuickAdd clientId={id} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
        <span>{all.length} lead{all.length === 1 ? "" : "s"}</span>
        {dueNow > 0 && (
          <span className="font-medium text-danger">
            {dueNow} follow-up{dueNow === 1 ? "" : "s"} due now
          </span>
        )}
        {leads.length !== all.length && <span>Showing {leads.length}</span>}
      </div>

      <div className="mb-4">
        <LeadToolbar
          statuses={statuses}
          sources={sources}
          statusesHref={`/clients/${id}/leads/statuses`}
          importHref={`/clients/${id}/leads/import`}
          clientId={id}
        />
      </div>

      {sp.layout === "board" ? (
        <LeadBoard leads={leads} statuses={statuses} today={today} />
      ) : (
        <LeadTable leads={leads} today={today} />
      )}

      {sp.lead && <LeadPanel leadId={sp.lead} closeHref={closeHref} today={today} />}
    </>
  );
}
