import Link from "next/link";
import { LayoutToggle } from "@/components/layout-toggle";
import { PageHeader } from "@/components/page-header";
import { TaskBoard } from "@/components/task-board";
import { QuickAddTask } from "@/components/quick-add-task";
import { TaskFilters } from "@/components/task-filters";
import { TaskList } from "@/components/task-list";
import { TaskPanel, withoutTask } from "@/components/task-panel";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceToday } from "@/lib/workspace";
import { daysAgoIso } from "@/lib/dates";
import { groupByDue, normaliseTask, sortTasks, TASK_ROW_FIELDS, type TaskRow } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export const metadata = { title: "My Tasks" };

const VIEWS = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "all", label: "All open" },
  { key: "done", label: "Completed" },
] as const;

type Params = { view?: string; client?: string; priority?: string; task?: string; layout?: string };

export default async function MyTasksPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const view = VIEWS.some((v) => v.key === params.view) ? params.view! : "today";

  const supabase = await createClient();
  const { today } = await getWorkspaceToday();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, is_internal")
    .is("archived_at", null)
    .order("is_internal", { ascending: false })
    .order("name");
  const activeClientIds = (clients ?? []).map((c) => c.id);

  let query = supabase.from("tasks").select(TASK_ROW_FIELDS).in("client_id", activeClientIds);
  if (params.client) query = query.eq("client_id", params.client);
  if (params.priority) query = query.eq("priority", params.priority);

  if (view === "done") {
    query = query.eq("status", "done").order("completed_at", { ascending: false }).limit(200);
  } else {
    query = query.neq("status", "done");
    if (view === "today") query = query.lte("due_date", today);
    if (view === "upcoming") query = query.gt("due_date", today);
  }

  const board = params.layout === "board";
  const { data } = await query;
  const tasks = ((data ?? []) as unknown[]).map((t) => normaliseTask(t as TaskRow));

  // The board also shows tasks completed in the last 14 days in its Done column
  let recentDone: TaskRow[] = [];
  if (board && view !== "done") {
    const since = daysAgoIso(14);
    let dq = supabase.from("tasks").select(TASK_ROW_FIELDS).in("client_id", activeClientIds).eq("status", "done").gte("completed_at", since).limit(100);
    if (params.client) dq = dq.eq("client_id", params.client);
    if (params.priority) dq = dq.eq("priority", params.priority);
    const { data: d } = await dq;
    recentDone = ((d ?? []) as unknown[]).map((t) => normaliseTask(t as TaskRow));
  }

  const groups =
    view === "done"
      ? [{ key: "done", label: "", tasks }]
      : view === "upcoming"
        ? [{ key: "upcoming", label: "", tasks: sortTasks(tasks) }]
        : groupByDue(tasks, today);

  // Counts for the tab labels
  const count = { count: "exact" as const, head: true };
  const [todayCount, overdueCount] = await Promise.all([
    supabase.from("tasks").select("id", count).in("client_id", activeClientIds).neq("status", "done").eq("due_date", today),
    supabase.from("tasks").select("id", count).in("client_id", activeClientIds).neq("status", "done").lt("due_date", today),
  ]);

  const closeHref = withoutTask("/tasks", params);
  const linkFor = (v: string) => {
    const qs = new URLSearchParams(
      Object.entries({ view: v, client: params.client, priority: params.priority, layout: params.layout }).filter(([, x]) => x) as [string, string][],
    );
    return `/tasks?${qs.toString()}`;
  };

  return (
    <>
      <PageHeader title="My Tasks" description="Everything on your plate, across all clients." />

      <div className="mb-5">
        <QuickAddTask
          clientOptions={(clients ?? []).map((c) => ({ id: c.id, name: c.name }))}
          defaultDue={view === "today" ? today : undefined}
          placeholder="Add a task… (press Enter)"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-hover p-1">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              href={linkFor(v.key)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] transition",
                view === v.key ? "bg-surface font-medium text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-muted hover:text-ink",
              )}
            >
              {v.label}
              {v.key === "today" && (todayCount.count ?? 0) + (overdueCount.count ?? 0) > 0 && (
                <span className={cn("ml-1.5 text-[12px]", (overdueCount.count ?? 0) > 0 ? "text-danger" : "text-ink-faint")}>
                  {(todayCount.count ?? 0) + (overdueCount.count ?? 0)}
                </span>
              )}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TaskFilters clients={(clients ?? []).map((c) => ({ id: c.id, name: c.name }))} />
          <LayoutToggle />
        </div>
      </div>

      {board ? (
        <TaskBoard tasks={[...tasks, ...recentDone]} today={today} showClient />
      ) : (
      <TaskList
        groups={groups}
        today={today}
        showClient
        emptyMessage={
          view === "today"
            ? "Nothing due today. Nice work."
            : view === "upcoming"
              ? "No upcoming tasks with due dates."
              : view === "done"
                ? "No completed tasks yet."
                : "No open tasks."
        }
      />
      )}

      {params.task && <TaskPanel taskId={params.task} closeHref={closeHref} />}
    </>
  );
}
