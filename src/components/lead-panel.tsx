import { LeadEditor } from "@/components/lead-editor";
import { createClient } from "@/lib/supabase/server";
import { LEAD_FIELDS, normaliseLead, STATUS_FIELDS, uniqueSources, type Lead, type LeadStatus } from "@/lib/leads";

/** Loads a lead and shows the slide-in editor. Rendered when the URL has ?lead=… */
export async function LeadPanel({ leadId, closeHref, today }: { leadId: string; closeHref: string; today: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("leads").select(LEAD_FIELDS).eq("id", leadId).maybeSingle();
  if (!data) return null;
  const lead = normaliseLead(data as unknown as Lead);

  const [{ data: statuses }, { data: sourceRows }] = await Promise.all([
    supabase.from("lead_statuses").select(STATUS_FIELDS).eq("client_id", lead.client_id).order("sort_order"),
    supabase.from("leads").select("source").eq("client_id", lead.client_id).not("source", "is", null).limit(1000),
  ]);
  const sources = uniqueSources((sourceRows ?? []).map((r) => r.source as string));

  return (
    <LeadEditor
      key={lead.id}
      lead={lead}
      statuses={(statuses ?? []) as LeadStatus[]}
      sources={sources}
      today={today}
      closeHref={closeHref}
    />
  );
}
