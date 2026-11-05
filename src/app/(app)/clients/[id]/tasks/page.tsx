import { QuickAddTask } from "@/components/quick-add-task";
import { TaskList } from "@/components/task-list";
import { TaskPanel, withoutTask } from "@/components/task-panel";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceToday } from "@/lib/workspace";
import { buildProjectTree, flattenTree, PROJECT_FIELDS, type Project } from "@/lib/projects";
import { groupByProject, normaliseTask, TASK_ROW_FIELDS, type TaskRow } from "@/lib/tasks";

export default async function ClientTasksTab({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ task?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const [{ data: open }, { data: done }, { data: projects }, { today }] = await Promise.all([
    supabase.from("tasks").select(TASK_ROW_FIELDS).eq("client_id", id).neq("status", "done"),
    supabase.from("tasks").select(TASK_ROW_FIELDS).eq("client_id", id).eq("status", "done").order("completed_at", { ascending: false }).limit(100),
    supabase.from("projects").select(PROJECT_FIELDS).eq("client_id", id),
    getWorkspaceToday(),
  ]);

  const ordered = flattenTree(buildProjectTree((projects ?? []) as Project[]));
  const openTasks = ((open ?? []) as unknown[]).map((t) => normaliseTask(t as TaskRow));
  const doneTasks = ((done ?? []) as unknown[]).map((t) => normaliseTask(t as TaskRow));
  const groups = groupByProject(openTasks, ordered.map((p) => ({ id: p.id, name: p.name })), "General");

  return (
    <>
      <div className="mb-6">
        <QuickAddTask
          clientId={id}
          projectOptions={ordered.filter((p) => !p.archived_at).map((p) => ({ id: p.id, name: p.name, depth: p.depth }))}
          placeholder="Add a task for this client… (press Enter)"
        />
      </div>
      <TaskList
        groups={groups}
        completed={doneTasks}
        today={today}
        showProject={false}
        emptyMessage="No open tasks for this client."
      />
      {sp.task && <TaskPanel taskId={sp.task} closeHref={withoutTask(`/clients/${id}/tasks`, sp)} />}
    </>
  );
}
