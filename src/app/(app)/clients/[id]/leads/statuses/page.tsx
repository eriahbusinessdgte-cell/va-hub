import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { StatusManager } from "@/components/status-manager";
import { createClient } from "@/lib/supabase/server";
import { STATUS_FIELDS, type LeadStatus } from "@/lib/leads";

export default async function LeadStatusesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: statuses }, { data: leads }] = await Promise.all([
    supabase.from("lead_statuses").select(STATUS_FIELDS).eq("client_id", id).order("sort_order"),
    supabase.from("leads").select("status_id").eq("client_id", id).limit(10000),
  ]);
  const counts: Record<string, number> = {};
  for (const l of leads ?? []) if (l.status_id) counts[l.status_id] = (counts[l.status_id] ?? 0) + 1;

  return (
    <div className="max-w-3xl">
      <Link href={`/clients/${id}/leads`} className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to leads
      </Link>
      <h2 className="text-lg font-semibold tracking-tight">Pipeline statuses</h2>
      <p className="mb-6 mt-1 text-sm text-ink-muted">
        These are the stages for this client&apos;s leads, in pipeline order. Rename, recolour, reorder or remove
        them. &ldquo;Won&rdquo; and &ldquo;Lost&rdquo; stages count as closed, so their follow-ups never show as overdue.
      </p>
      <StatusManager clientId={id} statuses={(statuses ?? []) as LeadStatus[]} counts={counts} />
    </div>
  );
}
