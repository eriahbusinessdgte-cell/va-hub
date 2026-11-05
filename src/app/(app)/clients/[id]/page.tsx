import Link from "next/link";
import { LinksManager } from "@/components/links-manager";
import { createClient } from "@/lib/supabase/server";
import { formatDate, type ClientLink } from "@/lib/clients";
import { getClient } from "./data";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 py-2 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children ?? <span className="text-ink-faint">—</span>}</dd>
    </div>
  );
}

export default async function ClientOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) return null;

  const supabase = await createClient();
  const count = { count: "exact" as const, head: true };
  const [{ data: links }, projects, tasks, leads] = await Promise.all([
    supabase.from("client_links").select("id, label, url").eq("client_id", id).order("sort_order"),
    supabase.from("projects").select("id", count).eq("client_id", id).is("archived_at", null).neq("status", "completed"),
    supabase.from("tasks").select("id", count).eq("client_id", id).neq("status", "done"),
    supabase.from("leads").select("id", count).eq("client_id", id).is("archived_at", null),
  ]);

  const stats = [
    { label: "Active projects", value: projects.count ?? 0, href: `/clients/${id}/projects` },
    { label: "Open tasks", value: tasks.count ?? 0, href: `/clients/${id}/tasks` },
    { label: "Leads", value: leads.count ?? 0, href: `/clients/${id}/leads` },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <Link key={s.label} href={s.href} className="rounded-xl border border-line bg-surface px-4 py-4 transition hover:border-line-strong">
              <p className="text-[12.5px] text-ink-muted">{s.label}</p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{s.value}</p>
            </Link>
          ))}
        </section>

        <section className="rounded-xl border border-line bg-surface p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-faint">Notes</h2>
            <Link href={`/clients/${id}/edit`} className="text-[13px] text-ink-muted hover:text-ink">Edit</Link>
          </div>
          {client.notes ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{client.notes}</p>
          ) : (
            <p className="text-sm text-ink-faint">No notes yet.</p>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-ink-faint">Details</h2>
          <dl className="divide-y divide-line">
            <Row label="Contact">{client.contact_name}</Row>
            <Row label="Email">
              {client.email && <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>}
            </Row>
            <Row label="Phone">
              {client.phone && <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>}
            </Row>
            <Row label="Website">
              {client.website && (
                <a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {client.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                </a>
              )}
            </Row>
            <Row label="Start date">{client.start_date ? formatDate(client.start_date) : null}</Row>
          </dl>
        </section>

        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-ink-faint">Important links</h2>
          <LinksManager clientId={id} links={(links ?? []) as ClientLink[]} />
        </section>
      </div>
    </div>
  );
}
