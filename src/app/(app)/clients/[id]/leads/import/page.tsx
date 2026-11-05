import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { LeadImporter } from "@/components/lead-importer";
import { createClient } from "@/lib/supabase/server";

export default async function ImportLeadsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: client }, { data: statuses }] = await Promise.all([
    supabase.from("clients").select("id, name").eq("id", id).maybeSingle(),
    supabase.from("lead_statuses").select("name").eq("client_id", id).order("sort_order"),
  ]);
  if (!client) notFound();

  return (
    <>
      <Link href={`/clients/${id}/leads`} className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to leads
      </Link>
      <h2 className="text-lg font-semibold tracking-tight">Import leads from a CSV file</h2>
      <p className="mb-6 mt-1 text-sm text-ink-muted">Leads will be added to {client.name}.</p>
      <LeadImporter clientId={client.id} clientName={client.name} statusNames={(statuses ?? []).map((s) => s.name)} />
    </>
  );
}
