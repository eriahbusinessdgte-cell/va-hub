import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { buildProjectTree, flattenTree, PROJECT_FIELDS, type Project } from "@/lib/projects";

/** Everything needed to show one project: itself, its client, its place in the tree. */
export const getProjectContext = cache(async (id: string) => {
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select(PROJECT_FIELDS).eq("id", id).maybeSingle();
  if (!project) return null;

  const [{ data: client }, { data: all }, { data: tasks }] = await Promise.all([
    supabase.from("clients").select("id, name").eq("id", project.client_id).single(),
    supabase.from("projects").select(PROJECT_FIELDS).eq("client_id", project.client_id),
    supabase.from("tasks").select("project_id, status").eq("client_id", project.client_id).not("project_id", "is", null),
  ]);

  const allProjects = (all ?? []) as Project[];
  const byId = new Map(allProjects.map((p) => [p.id, p]));

  // Breadcrumb: parent, grandparent, … up to the top
  const ancestors: Project[] = [];
  let cursor = project.parent_id ? byId.get(project.parent_id) : undefined;
  while (cursor && ancestors.length < 20) {
    ancestors.unshift(cursor);
    cursor = cursor.parent_id ? byId.get(cursor.parent_id) : undefined;
  }

  const tree = buildProjectTree(allProjects, tasks ?? []);
  const node = flattenTree(tree).find((n) => n.id === id)!;

  return { project: project as Project, client: client!, ancestors, node, allProjects, tree };
});

/** Projects that can contain the given project (excludes itself and its subprojects). */
export async function getParentOptions(clientId: string, excludeIds: Set<string> = new Set()) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select(PROJECT_FIELDS)
    .eq("client_id", clientId)
    .is("archived_at", null);
  return flattenTree(buildProjectTree((data ?? []) as Project[]))
    .filter((p) => !excludeIds.has(p.id))
    .map((p) => ({ id: p.id, name: p.name, depth: p.depth }));
}
