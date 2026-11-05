import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Agenda } from "@/components/calendar-parts";
import { FollowUp, LeadStatusBadge } from "@/components/lead-badges";
import { LeadPanel } from "@/components/lead-panel";
import { DueDate, ProgressBar } from "@/components/project-badges";
import { QuickAddTask } from "@/components/quick-add-task";
import { TaskList } from "@/components/task-list";
import { TaskPanel } from "@/components/task-panel";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceToday } from "@/lib/workspace";
import { daysAgoIso, greetingIn, longDateIn } from "@/lib/dates";
import { addDays, daysBetween } from "@/lib/cal-dates";
import { loadCalendarItems } from "@/lib/calendar";
import { followUpState, LEAD_FIELDS, normaliseLead, type Lead } from "@/lib/leads";
import { buildProjectTree, flattenTree, progressOf, PROJECT_FIELDS, type Project } from "@/lib/projects";
import { groupByDue, normaliseTask, TASK_ROW_FIELDS, type TaskRow } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export const metadata = { title: "Home" };

function Card({ title, href, linkLabel, children, className }: { title: string; href?: string; linkLabel?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink">
            {linkLabel ?? "View all"} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line-strong bg-surface px-4 py-6 text-center text-[13px] text-ink-faint">{children}</p>;
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ task?: string; lead?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { timezone, today } = await getWorkspaceToday();

  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, name, status, is_internal")
    .is("archived_at", null)
    .order("is_internal", { ascending: false })
    .order("name");
  const clients = clientRows ?? [];
  const ids = clients.map((c) => c.id);

  const [{ data: profile }, { data: dueTasks }, { data: openTaskRows }, { data: leadRows }, { data: projectRows }, upcoming] = await Promise.all([
    supabase.from("profiles").select("full_name").limit(1).maybeSingle(),
    supabase.from("tasks").select(TASK_ROW_FIELDS).in("client_id", ids).neq("status", "done").lte("due_date", today).limit(200),
    supabase.from("tasks").select("client_id, project_id, status").in("client_id", ids).limit(10000),
    supabase.from("leads").select(LEAD_FIELDS).in("client_id", ids).is("archived_at", null).limit(10000),
    supabase.from("projects").select(PROJECT_FIELDS).in("client_id", ids).is("archived_at", null),
    loadCalendarItems(addDays(today, 1), addDays(today, 7), { kinds: new Set(["task", "project"]) }),
  ]);

  // ----- Tasks -----
  const priorities = ((dueTasks ?? []) as unknown[]).map((t) => normaliseTask(t as TaskRow));
  const taskGroups = groupByDue(priorities, today);
  const allTasks = openTaskRows ?? [];
  const openTasks = allTasks.filter((t) => t.status !== "done");
  const overdueCount = priorities.filter((t) => t.due_date! < today).length;

  // ----- Leads -----
  const leads = ((leadRows ?? []) as unknown as Lead[]).map(normaliseLead);
  const followUps = leads
    .filter((l) => ["overdue", "today"].includes(followUpState(l, today)))
    .sort((a, b) => (a.follow_up_date ?? "").localeCompare(b.follow_up_date ?? ""));
  const weekAgo = daysAgoIso(7);
  const newLeads = leads.filter((l) => l.created_at >= weekAgo).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const openLeads = leads.filter((l) => (l.lead_statuses?.kind ?? "open") === "open");

  // ----- Projects (top-level, unfinished, soonest due first) -----
  const tree = buildProjectTree((projectRows ?? []) as Project[], allTasks);
  const activeProjects = flattenTree(tree).filter((p) => p.status !== "completed");
  const projectList = tree.filter((p) => p.status !== "completed").slice(0, 6);
  const clientName = new Map(clients.map((c) => [c.id, c.name]));

  // ----- Clients with open work -----
  const openByClient = new Map<string, number>();
  for (const t of openTasks) openByClient.set(t.client_id, (openByClient.get(t.client_id) ?? 0) + 1);
  const leadsByClient = new Map<string, number>();
  for (const l of openLeads) leadsByClient.set(l.client_id, (leadsByClient.get(l.client_id) ?? 0) + 1);
  const activeClients = clients.filter((c) => c.status === "active" || c.status === "onboarding");

  const stats = [
    { label: "Active clients", value: activeClients.length, href: "/clients" },
    { label: "Active projects", value: activeProjects.length, href: "/clients" },
    { label: "Open tasks", value: openTasks.length, href: "/tasks?view=all" },
    { label: "Overdue tasks", value: overdueCount, href: "/tasks", tone: "danger" as const },
    { label: "Follow-ups due", value: followUps.length, href: "/leads?followup=due", tone: "warning" as const },
    { label: "Open leads", value: openLeads.length, href: "/leads?status=open" },
  ];

  const firstName = profile?.full_name?.split(" ")[0];
  const closeHref = "/";

  return (
    <>
      <header className="mb-8">
        <p className="text-sm text-ink-muted">{longDateIn(timezone)}</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight">
          {greetingIn(timezone)}
          {firstName ? `, ${firstName}` : ""}
        </h1>
      </header>

      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-xl border border-line bg-surface px-4 py-3.5 transition hover:border-line-strong">
            <p className="text-[12.5px] text-ink-muted">{s.label}</p>
            <p
              className={cn(
                "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
                s.tone === "danger" && s.value > 0 && "text-danger",
                s.tone === "warning" && s.value > 0 && "text-warning",
              )}
            >
              {s.value}
            </p>
          </Link>
        ))}
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* Left column */}
        <div className="space-y-10">
          <Card title="Today's priorities" href="/tasks" linkLabel="My Tasks">
            <div className="mb-4">
              <QuickAddTask
                clientOptions={clients.map((c) => ({ id: c.id, name: c.name }))}
                defaultDue={today}
                placeholder="Add a task for today… (press Enter)"
              />
            </div>
            <TaskList groups={taskGroups} today={today} showClient emptyMessage="Nothing due today. You're all caught up." />
          </Card>

          <Card title="Upcoming deadlines" href="/calendar?view=week" linkLabel="Calendar">
            <p className="-mt-2 mb-3 text-[12.5px] text-ink-faint">Tasks and project deadlines in the next 7 days.</p>
            <Agenda
              days={daysBetween(addDays(today, 1), addDays(today, 7))}
              items={upcoming.filter((i) => !i.done)}
              hrefFor={(i) => (i.kind === "project" ? `/projects/${i.id}` : `/?task=${i.id}`)}
              today={today}
              emptyText="Nothing due in the next 7 days."
            />
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-10">
          <Card title="Lead follow-ups due" href="/leads?followup=due" linkLabel="All Leads">
            {followUps.length === 0 ? (
              <Empty>No follow-ups due today.</Empty>
            ) : (
              <ul className="overflow-hidden rounded-xl border border-line bg-surface">
                {followUps.slice(0, 8).map((l) => (
                  <li key={l.id} className="border-b border-line last:border-b-0">
                    <Link href={`/?lead=${l.id}`} scroll={false} className="block px-4 py-2.5 transition hover:bg-canvas">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{l.name}</span>
                        <FollowUp lead={l} today={today} />
                      </div>
                      <p className="truncate text-[12px] text-ink-muted">
                        {l.clients?.name}
                        {l.next_action ? ` · → ${l.next_action}` : ""}
                      </p>
                    </Link>
                  </li>
                ))}
                {followUps.length > 8 && (
                  <li className="px-4 py-2 text-[12.5px]">
                    <Link href="/leads?followup=due" className="text-ink-muted hover:text-ink">+{followUps.length - 8} more</Link>
                  </li>
                )}
              </ul>
            )}
          </Card>

          <Card title="New leads this week" href="/leads?sort=newest" linkLabel="All Leads">
            {newLeads.length === 0 ? (
              <Empty>No new leads in the last 7 days.</Empty>
            ) : (
              <ul className="overflow-hidden rounded-xl border border-line bg-surface">
                {newLeads.slice(0, 5).map((l) => (
                  <li key={l.id} className="border-b border-line last:border-b-0">
                    <Link href={`/?lead=${l.id}`} scroll={false} className="flex items-center justify-between gap-2 px-4 py-2.5 transition hover:bg-canvas">
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{l.name}</span>
                        <span className="block truncate text-[12px] text-ink-muted">{l.clients?.name}</span>
                      </span>
                      <LeadStatusBadge status={l.lead_statuses} />
                    </Link>
                  </li>
                ))}
                {newLeads.length > 5 && (
                  <li className="px-4 py-2 text-[12.5px] text-ink-muted">{newLeads.length} new leads in total this week</li>
                )}
              </ul>
            )}
          </Card>

          <Card title="Active projects">
            {projectList.length === 0 ? (
              <Empty>No active projects yet.</Empty>
            ) : (
              <ul className="overflow-hidden rounded-xl border border-line bg-surface">
                {projectList.map((p) => (
                  <li key={p.id} className="border-b border-line last:border-b-0">
                    <Link href={`/projects/${p.id}`} className="block px-4 py-3 transition hover:bg-canvas">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{p.name}</span>
                        <DueDate date={p.due_date} today={today} />
                      </div>
                      <p className="mb-1.5 truncate text-[12px] text-ink-muted">{clientName.get(p.client_id)}</p>
                      <ProgressBar value={progressOf(p)} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Active clients" href="/clients" linkLabel="All clients">
            {activeClients.length === 0 ? (
              <Empty>No active clients.</Empty>
            ) : (
              <ul className="overflow-hidden rounded-xl border border-line bg-surface">
                {activeClients.map((c) => (
                  <li key={c.id} className="border-b border-line last:border-b-0">
                    <Link href={`/clients/${c.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 transition hover:bg-canvas">
                      <span className="truncate text-sm">{c.name}</span>
                      <span className="shrink-0 text-[12px] text-ink-muted">
                        {openByClient.get(c.id) ?? 0} tasks · {leadsByClient.get(c.id) ?? 0} leads
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {sp.task && <TaskPanel taskId={sp.task} closeHref={closeHref} />}
      {sp.lead && <LeadPanel leadId={sp.lead} closeHref={closeHref} today={today} />}
    </>
  );
}
