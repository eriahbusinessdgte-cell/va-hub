"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PRIORITIES, PROJECT_STATUSES, descendantIds } from "@/lib/projects";

export type ProjectFormState = { error?: string } | undefined;

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

function readFields(formData: FormData) {
  const status = String(formData.get("status") ?? "");
  const priority = String(formData.get("priority") ?? "");
  return {
    name: str(formData, "name"),
    description: str(formData, "description"),
    status: PROJECT_STATUSES.some((s) => s.value === status) ? status : "not_started",
    priority: PRIORITIES.some((p) => p.value === priority) ? priority : "medium",
    start_date: str(formData, "start_date"),
    due_date: str(formData, "due_date"),
    parent_id: str(formData, "parent_id"),
  };
}

function validate(f: ReturnType<typeof readFields>): string | null {
  if (!f.name) return "Project name is required.";
  if (f.start_date && f.due_date && f.due_date < f.start_date) return "The due date is before the start date.";
  return null;
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function createProjectAction(_: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const clientId = String(formData.get("client_id") ?? "");
  const fields = readFields(formData);
  const problem = validate(fields);
  if (problem) return { error: problem };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...fields, client_id: clientId })
    .select("id")
    .single();
  if (error || !data) return { error: "Couldn't save the project. Please try again." };

  refresh();
  redirect(`/projects/${data.id}`);
}

export async function updateProjectAction(_: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const id = String(formData.get("id") ?? "");
  const fields = readFields(formData);
  const problem = validate(fields);
  if (problem) return { error: problem };

  const supabase = await createClient();

  // A project can't be moved inside itself or one of its own subprojects.
  if (fields.parent_id) {
    const { data: current } = await supabase.from("projects").select("client_id").eq("id", id).single();
    const { data: siblings } = await supabase
      .from("projects")
      .select("id, parent_id")
      .eq("client_id", current?.client_id ?? "");
    if (descendantIds(siblings ?? [], id).has(fields.parent_id)) {
      return { error: "A project can't be placed inside itself or one of its own subprojects." };
    }
  }

  const { error } = await supabase.from("projects").update(fields).eq("id", id);
  if (error) return { error: "Couldn't save changes. Please try again." };

  refresh();
  redirect(`/projects/${id}`);
}

export async function setProjectStatus(id: string, status: string) {
  if (!PROJECT_STATUSES.some((s) => s.value === status)) return;
  const supabase = await createClient();
  await supabase.from("projects").update({ status }).eq("id", id);
  refresh();
}

/** Archiving a project also archives its subprojects. */
async function setArchived(id: string, archived: boolean) {
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("client_id").eq("id", id).single();
  if (!project) return;
  const { data: all } = await supabase.from("projects").select("id, parent_id").eq("client_id", project.client_id);
  const ids = [...descendantIds(all ?? [], id)];
  await supabase
    .from("projects")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .in("id", ids);
  refresh();
}

export async function archiveProject(id: string) {
  await setArchived(id, true);
}

export async function restoreProject(id: string) {
  await setArchived(id, false);
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("client_id").eq("id", id).single();
  // Subprojects are deleted with it; tasks stay with the client but lose the project link.
  await supabase.from("projects").delete().eq("id", id);
  refresh();
  redirect(project ? `/clients/${project.client_id}/projects` : "/clients");
}
