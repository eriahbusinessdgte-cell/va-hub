export const PROJECT_STATUSES = [
  { value: "not_started", label: "Not started", className: "bg-stone-100 text-stone-600", dot: "bg-stone-400" },
  { value: "in_progress", label: "In progress", className: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  { value: "on_hold", label: "On hold", className: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  { value: "completed", label: "Completed", className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
] as const;

export const PRIORITIES = [
  { value: "low", label: "Low", className: "text-stone-500" },
  { value: "medium", label: "Medium", className: "text-blue-600" },
  { value: "high", label: "High", className: "text-amber-600" },
  { value: "urgent", label: "Urgent", className: "text-red-600" },
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]["value"];
export type Priority = (typeof PRIORITIES)[number]["value"];

export type Project = {
  id: string;
  client_id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: Priority;
  start_date: string | null;
  due_date: string | null;
  sort_order: number;
  archived_at: string | null;
};

export type ProjectNode = Project & {
  children: ProjectNode[];
  depth: number;
  /** Tasks in this project and all its subprojects */
  taskTotal: number;
  taskDone: number;
};

export const PROJECT_FIELDS =
  "id, client_id, parent_id, name, description, status, priority, start_date, due_date, sort_order, archived_at";

/**
 * Turns a flat list of projects into a tree and adds task progress,
 * counting tasks in subprojects towards their parents.
 */
export function buildProjectTree(
  projects: Project[],
  tasks: { project_id: string | null; status: string }[] = [],
): ProjectNode[] {
  const nodes = new Map<string, ProjectNode>();
  for (const p of projects) nodes.set(p.id, { ...p, children: [], depth: 0, taskTotal: 0, taskDone: 0 });

  const roots: ProjectNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const own = new Map<string, { total: number; done: number }>();
  for (const t of tasks) {
    if (!t.project_id) continue;
    const c = own.get(t.project_id) ?? { total: 0, done: 0 };
    c.total += 1;
    if (t.status === "done") c.done += 1;
    own.set(t.project_id, c);
  }

  const sort = (list: ProjectNode[]) =>
    list.sort((a, b) => {
      // Unfinished first, then by due date (soonest first), then name
      const ac = a.status === "completed" ? 1 : 0;
      const bc = b.status === "completed" ? 1 : 0;
      if (ac !== bc) return ac - bc;
      if (a.due_date && b.due_date && a.due_date !== b.due_date) return a.due_date < b.due_date ? -1 : 1;
      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;
      return a.name.localeCompare(b.name);
    });

  const walk = (node: ProjectNode, depth: number) => {
    node.depth = depth;
    const o = own.get(node.id) ?? { total: 0, done: 0 };
    node.taskTotal = o.total;
    node.taskDone = o.done;
    sort(node.children);
    for (const child of node.children) {
      walk(child, depth + 1);
      node.taskTotal += child.taskTotal;
      node.taskDone += child.taskDone;
    }
  };
  sort(roots);
  roots.forEach((r) => walk(r, 0));
  return roots;
}

/** Progress as 0–100, or null when there's nothing to measure yet. */
export function progressOf(node: Pick<ProjectNode, "taskTotal" | "taskDone" | "status">): number | null {
  if (node.taskTotal > 0) return Math.round((node.taskDone / node.taskTotal) * 100);
  return node.status === "completed" ? 100 : null;
}

/** IDs of a project and everything nested under it. */
export function descendantIds(projects: Pick<Project, "id" | "parent_id">[], rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of projects) {
      if (p.parent_id && ids.has(p.parent_id) && !ids.has(p.id)) {
        ids.add(p.id);
        grew = true;
      }
    }
  }
  return ids;
}

/** Flat list in tree order, for "parent project" dropdowns. */
export function flattenTree(nodes: ProjectNode[]): ProjectNode[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)]);
}
