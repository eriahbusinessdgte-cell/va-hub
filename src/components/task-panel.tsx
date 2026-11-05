import { TaskEditor } from "@/components/task-editor";
import { createClient } from "@/lib/supabase/server";
import { buildProjectTree, flattenTree, PROJECT_FIELDS, type Project } from "@/lib/projects";
import { normaliseTask, type TaskDetail } from "@/lib/tasks";

/** Loads a task and shows the slide-in editor. Rendered when the URL has ?task=… */
export async function TaskPanel({ taskId, closeHref }: { taskId: string; closeHref: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select(
      `id, title, description, status, priority, due_date, completed_at, created_at, client_id, project_id, recurrence, clients(name, projects(${PROJECT_FIELDS})), projects(name), checklist_items(id, text, is_done, sort_order)`,
    )
    .eq("id", taskId)
    .maybeSingle();
  if (!data) return null;
  const task = normaliseTask(data) as unknown as TaskDetail;

  // The client's projects came back in the same request
  const clientRow = (Array.isArray(data.clients) ? data.clients[0] : data.clients) as { projects?: Project[] } | null;
  const projects = (clientRow?.projects ?? []).filter((p) => !p.archived_at);
  const projectOptions = flattenTree(buildProjectTree(projects)).map((p) => ({
    id: p.id,
    name: p.name,
    depth: p.depth,
  }));
  // Keep the current project selectable even if it's archived
  if (task.project_id && !projectOptions.some((p) => p.id === task.project_id) && task.projects) {
    projectOptions.unshift({ id: task.project_id, name: `${task.projects.name} (archived)`, depth: 0 });
  }

  // key forces a fresh form when switching between tasks
  return <TaskEditor key={task.id} task={task} projectOptions={projectOptions} closeHref={closeHref} />;
}

/** Builds the URL to return to when the panel closes (same page, without ?task). */
export function withoutTask(path: string, params: Record<string, string | undefined>) {
  const rest = Object.entries(params).filter(([k, v]) => k !== "task" && v) as [string, string][];
  const qs = new URLSearchParams(rest).toString();
  return qs ? `${path}?${qs}` : path;
}
