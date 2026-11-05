import { ComingSoon } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { greetingIn, longDateIn, todayIn } from "@/lib/dates";

export const metadata = { title: "Home" };

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data: workspace }, { data: profile }] = await Promise.all([
    supabase.from("workspaces").select("timezone").limit(1).maybeSingle(),
    supabase.from("profiles").select("full_name").limit(1).maybeSingle(),
  ]);
  const tz = workspace?.timezone ?? "UTC";
  const today = todayIn(tz);

  const count = { count: "exact" as const, head: true };
  const [clients, projects, openTasks, overdue, leads] = await Promise.all([
    supabase.from("clients").select("id", count).is("archived_at", null).eq("status", "active"),
    supabase.from("projects").select("id", count).is("archived_at", null).neq("status", "completed"),
    supabase.from("tasks").select("id", count).neq("status", "done"),
    supabase.from("tasks").select("id", count).neq("status", "done").lt("due_date", today),
    supabase.from("leads").select("id", count).is("archived_at", null),
  ]);

  const stats = [
    { label: "Active clients", value: clients.count ?? 0 },
    { label: "Active projects", value: projects.count ?? 0 },
    { label: "Open tasks", value: openTasks.count ?? 0 },
    { label: "Overdue tasks", value: overdue.count ?? 0, alert: (overdue.count ?? 0) > 0 },
    { label: "Leads", value: leads.count ?? 0 },
  ];

  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <>
      <header className="mb-8">
        <p className="text-sm text-ink-muted">{longDateIn(tz)}</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight">
          {greetingIn(tz)}
          {firstName ? `, ${firstName}` : ""}
        </h1>
      </header>

      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-surface px-4 py-4">
            <p className="text-[12.5px] text-ink-muted">{s.label}</p>
            <p
              className={`mt-1.5 text-2xl font-semibold tabular-nums tracking-tight ${
                s.alert ? "text-danger" : ""
              }`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </section>

      <ComingSoon phase="Phase 7">
        Today&apos;s priorities, upcoming deadlines and lead follow-ups will appear here once
        clients, projects, tasks and leads are built.
      </ComingSoon>
    </>
  );
}
