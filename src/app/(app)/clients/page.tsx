import Link from "next/link";
import { ComingSoon, PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Clients" };

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, business_name, status")
    .is("archived_at", null)
    .order("is_internal", { ascending: false })
    .order("name");

  return (
    <>
      <PageHeader title="Clients" description="Each client has its own projects, tasks and leads." />
      <div className="mb-8 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {(clients ?? []).map((c) => (
          <Link
            key={c.id}
            href={`/clients/${c.id}`}
            className="flex items-center justify-between px-5 py-4 transition hover:bg-canvas"
          >
            <div>
              <p className="text-sm font-medium">{c.name}</p>
              {c.business_name && <p className="text-[13px] text-ink-muted">{c.business_name}</p>}
            </div>
            <span className="rounded-full bg-hover px-2.5 py-0.5 text-[12px] capitalize text-ink-muted">
              {c.status}
            </span>
          </Link>
        ))}
      </div>
      <ComingSoon phase="Phase 1">Adding, editing and archiving clients comes next.</ComingSoon>
    </>
  );
}
