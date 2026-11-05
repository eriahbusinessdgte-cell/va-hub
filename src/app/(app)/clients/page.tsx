import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ClientStatusBadge } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/server";
import { formatDate, type Client } from "@/lib/clients";
import { cn } from "@/lib/utils";

export const metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string }>;
}) {
  const { view, q } = await searchParams;
  const archived = view === "archived";
  const search = (q ?? "").trim();

  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select("id, name, business_name, contact_name, email, status, start_date, is_internal, archived_at")
    .order("is_internal", { ascending: false })
    .order("name");
  query = archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (search) {
    const term = search.replace(/[%,()]/g, " ");
    query = query.or(`name.ilike.%${term}%,business_name.ilike.%${term}%,contact_name.ilike.%${term}%,email.ilike.%${term}%`);
  }
  const { data } = await query;
  const clients = (data ?? []) as Client[];

  const tab = (label: string, href: string, active: boolean) => (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-1.5 text-[13px] transition",
        active ? "bg-surface font-medium text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-muted hover:text-ink",
      )}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Clients"
        description="Each client has its own projects, tasks and leads."
        actions={
          <Link href="/clients/new" className="btn-primary">
            <Plus className="h-4 w-4" /> New client
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-hover p-1">
          {tab("Current", "/clients", !archived)}
          {tab("Archived", "/clients?view=archived", archived)}
        </div>
        <form className="relative w-full sm:w-64">
          {archived && <input type="hidden" name="view" value="archived" />}
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input name="q" defaultValue={search} placeholder="Search clients" className="input pl-9" />
        </form>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center text-sm text-ink-muted">
          {search
            ? `No clients match "${search}".`
            : archived
              ? "No archived clients. When you archive a client, they'll be kept here with all their history."
              : "No clients yet."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="hidden grid-cols-[2fr_1.5fr_1fr_1fr] gap-4 border-b border-line px-5 py-2.5 text-[12px] font-medium text-ink-faint sm:grid">
            <span>Client</span>
            <span>Contact</span>
            <span>Status</span>
            <span>Start date</span>
          </div>
          <ul className="divide-y divide-line">
            {clients.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/clients/${c.id}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 transition hover:bg-canvas sm:grid-cols-[2fr_1.5fr_1fr_1fr]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    {c.business_name && <p className="truncate text-[13px] text-ink-muted">{c.business_name}</p>}
                  </div>
                  <div className="hidden min-w-0 text-[13px] text-ink-muted sm:block">
                    <p className="truncate">{c.contact_name ?? "—"}</p>
                    {c.email && <p className="truncate text-ink-faint">{c.email}</p>}
                  </div>
                  <div>
                    <ClientStatusBadge status={c.status} />
                  </div>
                  <span className="hidden text-[13px] text-ink-muted sm:block">{formatDate(c.start_date)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
