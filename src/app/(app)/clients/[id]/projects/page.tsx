import Link from "next/link";
import { FolderPlus } from "lucide-react";
import { ProjectTree } from "@/components/project-tree";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceToday } from "@/lib/workspace";
import { buildProjectTree, PROJECT_FIELDS, type Project } from "@/lib/projects";
import { cn } from "@/lib/utils";

export default async function ClientProjectsTab({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view } = await searchParams;
  const showArchived = view === "archived";

  const supabase = await createClient();
  let query = supabase.from("projects").select(PROJECT_FIELDS).eq("client_id", id);
  query = showArchived ? query.not("archived_at", "is", null) : query.is("archived_at", null);

  const [{ data: projects }, { data: tasks }, { today }] = await Promise.all([
    query,
    supabase.from("tasks").select("project_id, status").eq("client_id", id).not("project_id", "is", null),
    getWorkspaceToday(),
  ]);
  const tree = buildProjectTree((projects ?? []) as Project[], tasks ?? []);

  const tab = (label: string, href: string, active: boolean) => (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-1.5 text-[13px] transition",
        active ? "bg-surface font-medium text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-muted hover:text-ink",
      )}
    >
      {label}
    </Link>
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-hover p-1">
          {tab("Current", `/clients/${id}/projects`, !showArchived)}
          {tab("Archived", `/clients/${id}/projects?view=archived`, showArchived)}
        </div>
        <Link href={`/projects/new?client=${id}`} className="btn-primary">
          <FolderPlus className="h-4 w-4" /> New project
        </Link>
      </div>

      {tree.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
          <p className="text-sm text-ink-muted">
            {showArchived
              ? "No archived projects. Archived projects keep all their history."
              : "No projects yet for this client."}
          </p>
          {!showArchived && (
            <Link href={`/projects/new?client=${id}`} className="btn-ghost mt-3">
              <FolderPlus className="h-4 w-4" /> Create the first project
            </Link>
          )}
        </div>
      ) : (
        <ProjectTree nodes={tree} today={today} />
      )}
    </>
  );
}
