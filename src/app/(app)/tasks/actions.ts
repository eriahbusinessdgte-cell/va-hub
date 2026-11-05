"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PRIORITIES } from "@/lib/projects";
import { TASK_STATUSES } from "@/lib/tasks";

export type TaskFormState = { error?: string; ok?: boolean } | undefined;

function refresh() {
  revalidatePath("/", "layout");
}

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

/** Quick add: title plus whatever context the page provides (client, project, due date). */
export async function createTaskAction(_: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const title = str(formData, "title");
  const clientId = str(formData, "client_id");
  if (!title) return { error: "Type a task first." };
  if (!clientId) return { error: "Choose a client for this task." };

  const priority = String(formData.get("priority") ?? "medium");
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    title,
    client_id: clientId,
    project_id: str(formData, "project_id"),
    due_date: str(formData, "due_date"),
    priority: PRIORITIES.some((p) => p.value === priority) ? priority : "medium",
  });
  if (error) return { error: "Couldn't add the task. Please try again." };

  refresh();
  return { ok: true };
}

/** Saves the task panel's fields. */
export async function updateTaskAction(_: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const id = String(formData.get("id") ?? "");
  const title = str(formData, "title");
  if (!title) return { error: "The task needs a title." };

  const status = String(formData.get("status") ?? "todo");
  const priority = String(formData.get("priority") ?? "medium");
  const validStatus = TASK_STATUSES.some((s) => s.value === status) ? status : "todo";

  const supabase = await createClient();
  const { data: current } = await supabase.from("tasks").select("status, completed_at").eq("id", id).single();

  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      description: str(formData, "description"),
      status: validStatus,
      priority: PRIORITIES.some((p) => p.value === priority) ? priority : "medium",
      due_date: str(formData, "due_date"),
      project_id: str(formData, "project_id"),
      completed_at:
        validStatus === "done" ? (current?.status === "done" ? current.completed_at : new Date().toISOString()) : null,
    })
    .eq("id", id);
  if (error) return { error: "Couldn't save. Please try again." };

  refresh();
  return { ok: true };
}

export async function setTaskDone(id: string, done: boolean) {
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({ status: done ? "done" : "todo", completed_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  refresh();
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", id);
  refresh();
}

// ---------- Checklist ----------

export async function addChecklistItem(taskId: string, text: string) {
  const clean = text.trim();
  if (!clean) return;
  const supabase = await createClient();
  const { count } = await supabase
    .from("checklist_items")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId);
  await supabase.from("checklist_items").insert({ task_id: taskId, text: clean, sort_order: count ?? 0 });
  refresh();
}

export async function toggleChecklistItem(id: string, isDone: boolean) {
  const supabase = await createClient();
  await supabase.from("checklist_items").update({ is_done: isDone }).eq("id", id);
  refresh();
}

export async function deleteChecklistItem(id: string) {
  const supabase = await createClient();
  await supabase.from("checklist_items").delete().eq("id", id);
  refresh();
}
