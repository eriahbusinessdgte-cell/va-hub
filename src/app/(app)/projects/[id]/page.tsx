import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, FolderPlus } from "lucide-react";
import { ProjectActions } from "@/components/project-actions";
import { DueDate, PriorityLabel, ProgressBar, ProjectStatusBadge } from "@/components/project-badges";
import { ProjectTree } from "@/components/project-tree";
import { LayoutToggle } from "@/components/layout-toggle";
import { QuickAddTask } from "@/components/quick-add-task";
import { TaskBoard } from "@/components/task-board";
import { TaskList } from "@/components/task-list";
import { TaskPanel, withoutTask } from "@/components/task-panel";
import { createClient } from "@/lib/supabase/server";
import { descendantIds } from "@/lib/projects";
import { groupByProject, normaliseTask, TASK_ROW_FIELDS, type TaskRow } from "@/lib/tasks";
import { formatDate } from "@/lib/clients";
import { progressOf } from "@/lib/projects";
import { getWorkspaceToday } from "@/lib/workspace";
import { getProjectContext } from "../data";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getProjectContext(id);
  return { title: ctx?.project.name ?? "Project" };
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ task?: string; layout?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [ctx, { today }] = await Promise.all([getProjectContext(id), getWorkspaceToday()]);
  if (!ctx) notFound();
  const { project, client, ancestors, node } = ctx;

  // Tasks in this project and all of its subprojects
  const inside = descendantIds(ctx.allProjects, id);
  const supabase = await createClient();
  const [{ data: openData }, { data: doneData }] = await Promise.all([
    supabase.from("tasks").select(TASK_ROW_FIELDS).in("project_id", [...inside]).neq("status", "done"),
    supabase.from("tasks").select(TASK_ROW_FIELDS).in("project_id", [...inside]).eq("status", "done").order("completed_at", { ascending: false }).limit(100),
  ]);
  const openTasks = ((openData ?? []) as unknown[]).map((t) => normaliseTask(t as TaskRow));
  const doneTasks = ((doneData ?? []) as unknown[]).map((t) => normaliseTask(t as TaskRow));
  const subprojectOrder = flattenChildren(node.children);
  const taskGroups = groupByProject(
    openTasks.map((t) => (t.project_id === id ? { ...t, project_id: null } : t)),
    subprojectOrder,
    subprojectOrder.length > 0 ? "This project" : "",
  );

  // Hide archived subprojects unless this project itself is archived
  const children = project.archived_at ? node.children : node.children.filter((c) => !c.archived_at);
  const done = project.status === "completed";
  const progress = progressOf(node);

  return (
    <>
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-[13px] text-ink-muted">
        <Link href={`/clients/${client.id}/projects`} className="hover:text-ink">{client.name}</Link>
        {ancestors.map((a) => (
          <span key={a.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-ink-faint" />
            <Link href={`/projects/${a.id}`} className="hover:text-ink">{a.name}</Link>
          </span>
        ))}
      </nav>

      {project.archived_at && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800">
          This project is archived. Its history is kept. Restore it to bring it back.
        </div>
      )}

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[26px] font-semibold tracking-tight">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <PriorityLabel priority={project.priority} showLow />
            <DueDate date={project.due_date} today={today} done={done} />
          </div>
        </div>
        <ProjectActions
          id={project.id}
          name={project.name}
          status={project.status}
          archived={!!project.archived_at}
          subprojectCount={ctx.allProjects.filter((p) => p.id !== project.id && isInside(ctx.allProjects, p.id, project.id)).length}
        />
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-8">
          {project.description && (
            <section className="rounded-xl border border-line bg-surface p-6">
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-ink-faint">Description</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{project.description}</p>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Subprojects</h2>
              <Link href={`/projects/new?client=${client.id}&parent=${project.id}`} className="btn-ghost py-1.5">
                <FolderPlus className="h-4 w-4" /> Add subproject
              </Link>
            </div>
            {children.length > 0 ? (
              <ProjectTree nodes={children} today={today} />
            ) : (
              <p className="rounded-xl border border-dashed border-line-strong bg-surface px-5 py-6 text-center text-sm text-ink-faint">
                No subprojects. Break big projects into smaller parts here.
              </p>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Tasks</h2>
              <LayoutToggle />
            </div>
            <div className="mb-4">
              <QuickAddTask clientId={client.id} projectId={project.id} placeholder="Add a task to this project… (press Enter)" />
            </div>
            {sp.layout === "board" ? (
              <TaskBoard tasks={[...openTasks, ...doneTasks.slice(0, 30)]} today={today} showProject={subprojectOrder.length > 0} />
            ) : (
            <TaskList
              groups={taskGroups}
              completed={doneTasks}
              today={today}
              showProject={false}
              emptyMessage={subprojectOrder.length > 0 ? "No open tasks in this project or its subprojects." : "No open tasks yet."}
            />
            )}
          </section>
        </div>

        <aside className="h-fit space-y-4 rounded-xl border border-line bg-surface p-6">
          <div>
            <p className="mb-2 text-[12.5px] text-ink-muted">Progress</p>
            <ProgressBar value={progress} />
            <p className="mt-1.5 text-[12px] text-ink-faint">
              {node.taskTotal > 0
                ? `${node.taskDone} of ${node.taskTotal} tasks done`
                : "Based on completed tasks once you add some."}
            </p>
          </div>
          <dl className="divide-y divide-line border-t border-line text-sm">
            <div className="flex justify-between py-2.5">
              <dt className="text-ink-muted">Start</dt>
              <dd>{project.start_date ? formatDate(project.start_date) : "—"}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-ink-muted">Due</dt>
              <dd>{project.due_date ? formatDate(project.due_date) : "—"}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-ink-muted">Client</dt>
              <dd>
                <Link href={`/clients/${client.id}`} className="hover:underline">{client.name}</Link>
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      {sp.task && <TaskPanel taskId={sp.task} closeHref={withoutTask(`/projects/${id}`, sp)} />}
    </>
  );
}

function flattenChildren(nodes: { id: string; name: string; children: unknown[] }[]): { id: string; name: string }[] {
  return nodes.flatMap((n) => [
    { id: n.id, name: n.name },
    ...flattenChildren(n.children as { id: string; name: string; children: unknown[] }[]),
  ]);
}

function isInside(all: { id: string; parent_id: string | null }[], id: string, ancestorId: string): boolean {
  const byId = new Map(all.map((p) => [p.id, p]));
  let cur = byId.get(id)?.parent_id;
  for (let i = 0; cur && i < 50; i++) {
    if (cur === ancestorId) return true;
    cur = byId.get(cur)?.parent_id;
  }
  return false;
}
