import { LeadEditor } from "@/components/lead-editor";
import { createClient } from "@/lib/supabase/server";
import { LEAD_FIELDS, normaliseLead, STATUS_FIELDS, uniqueSources, type Lead, type LeadStatus } from "@/lib/leads";

/** Loads a lead and shows the slide-in editor. Rendered when the URL has ?lead=… */
export async function LeadPanel({ leadId, closeHref, today }: { leadId: string; closeHref: string; today: string }) {
  const supabase = await createClient();
  // One request: the lead, plus its client's pipeline stages and the sources used before
  const { data } = await supabase
    .from("leads")
    .select(LEAD_FIELDS.replace("clients(name)", `clients(name, lead_statuses(${STATUS_FIELDS}), leads(source))`))
    .eq("id", leadId)
    .maybeSingle();
  if (!data) return null;
  const lead = normaliseLead(data as unknown as Lead);
  const raw = data as unknown as { clients: { lead_statuses?: LeadStatus[]; leads?: { source: string | null }[] } | null };
  const clientRow = Array.isArray(raw.clients) ? raw.clients[0] : raw.clients;
  const statuses = [...(clientRow?.lead_statuses ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const sources = uniqueSources((clientRow?.leads ?? []).map((r: { source: string | null }) => r.source));

  return (
    <LeadEditor
      key={lead.id}
      lead={lead}
      statuses={statuses}
      sources={sources}
      today={today}
      closeHref={closeHref}
    />
  );
}
