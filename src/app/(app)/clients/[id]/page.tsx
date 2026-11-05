import { notFound } from "next/navigation";
import { ComingSoon, PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("name, business_name")
    .eq("id", id)
    .maybeSingle();
  if (!client) notFound();

  return (
    <>
      <PageHeader title={client.name} description={client.business_name ?? undefined} />
      <ComingSoon phase="Phase 1">
        This client&apos;s workspace (overview, projects, tasks, leads, notes and links) is built
        next.
      </ComingSoon>
    </>
  );
}
