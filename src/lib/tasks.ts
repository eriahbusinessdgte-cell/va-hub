import type { Priority } from "@/lib/projects";

export const TASK_STATUSES = [
  { value: "todo", label: "To do", className: "bg-stone-100 text-stone-600" },
  { value: "in_progress", label: "In progress", className: "bg-blue-50 text-blue-700" },
  { value: "waiting", label: "Waiting", className: "bg-amber-50 text-amber-700" },
  { value: "done", label: "Done", className: "bg-emerald-50 text-emerald-700" },
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number]["value"];

export type TaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  completed_at: string | null;
  client_id: string;
  project_id: string | null;
  clients: { name: string } | null;
  projects: { name: string } | null;
  checklist_items: { is_done: boolean }[];
  recurrence: unknown;
};

export type ChecklistItem = { id: string; text: string; is_done: boolean; sort_order: number };

export type TaskDetail = Omit<TaskRow, "checklist_items"> & {
  description: string | null;
  created_at: string;
  checklist_items: ChecklistItem[];
};

/** Columns for task lists (includes client/project names and checklist progress). */
export const TASK_ROW_FIELDS =
  "id, title, status, priority, due_date, completed_at, client_id, project_id, recurrence, clients(name), projects(name), checklist_items(is_done)";

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/** Soonest due first (no date last), then most important first, then title. */
export function sortTasks<T extends Pick<TaskRow, "due_date" | "priority" | "title">>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (a.due_date !== b.due_date) {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date < b.due_date ? -1 : 1;
    }
    const p = (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);
    if (p !== 0) return p;
    return a.title.localeCompare(b.title);
  });
}

export type TaskGroup<T> = { key: string; label: string; tone?: "danger" | "warning"; tasks: T[] };

/** Splits open tasks into Overdue / Today / Upcoming / No date. */
export function groupByDue<T extends Pick<TaskRow, "due_date" | "priority" | "title">>(
  tasks: T[],
  today: string,
): TaskGroup<T>[] {
  const sorted = sortTasks(tasks);
  const groups: TaskGroup<T>[] = [
    { key: "overdue", label: "Overdue", tone: "danger", tasks: [] },
    { key: "today", label: "Today", tone: "warning", tasks: [] },
    { key: "upcoming", label: "Upcoming", tasks: [] },
    { key: "nodate", label: "No due date", tasks: [] },
  ];
  for (const t of sorted) {
    if (!t.due_date) groups[3].tasks.push(t);
    else if (t.due_date < today) groups[0].tasks.push(t);
    else if (t.due_date === today) groups[1].tasks.push(t);
    else groups[2].tasks.push(t);
  }
  return groups.filter((g) => g.tasks.length > 0);
}

/** Supabase returns embedded one-to-one rows as objects; normalise in case of arrays. */
export function normaliseTask<T extends { clients: unknown; projects: unknown }>(t: T): T {
  const one = (v: unknown) => (Array.isArray(v) ? (v[0] ?? null) : v);
  return { ...t, clients: one(t.clients), projects: one(t.projects) } as T;
}

/** Groups open tasks by project, following the given project order. */
export function groupByProject<T extends Pick<TaskRow, "project_id" | "due_date" | "priority" | "title">>(
  tasks: T[],
  projectsInOrder: { id: string; name: string }[],
  noProjectLabel: string,
): TaskGroup<T>[] {
  const groups: TaskGroup<T>[] = [
    { key: "none", label: noProjectLabel, tasks: [] },
    ...projectsInOrder.map((p) => ({ key: p.id, label: p.name, tasks: [] as T[] })),
  ];
  const byKey = new Map(groups.map((g) => [g.key, g]));
  for (const t of sortTasks(tasks)) (byKey.get(t.project_id ?? "none") ?? groups[0]).tasks.push(t);
  return groups.filter((g) => g.tasks.length > 0);
}
