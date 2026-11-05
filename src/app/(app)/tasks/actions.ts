"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PRIORITIES } from "@/lib/projects";
import { TASK_STATUSES } from "@/lib/tasks";
import { nextDueDate, parseRecurrence, type Recurrence } from "@/lib/recurrence";
import { getWorkspaceToday } from "@/lib/workspace";

export type TaskFormState = { error?: string; ok?: boolean } | undefined;

function refresh() {
  revalidatePath("/", "layout");
}

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

/** Reads the "Repeat" fields from the task panel. */
function readRecurrence(formData: FormData): Recurrence | null {
  const freq = String(formData.get("repeat") ?? "");
  if (!freq || freq === "none") return null;
  return parseRecurrence({
    freq,
    interval: Number(formData.get("repeat_interval") ?? 1),
    weekdays: formData.getAll("repeat_weekdays").map(Number),
  });
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Marks a task done. If it repeats, the next copy is created with the next due
 * date (same details, checklist unticked), and the repeat moves to the new copy.
 */
async function completeTask(supabase: Supabase, id: string) {
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, description, priority, due_date, client_id, project_id, recurrence, status, checklist_items(text, sort_order)")
    .eq("id", id)
    .single();
  if (!task || task.status === "done") return;

  const rule = parseRecurrence(task.recurrence);
  await supabase
    .from("tasks")
    .update({ status: "done", completed_at: new Date().toISOString(), ...(rule ? { recurrence: null } : {}) })
    .eq("id", id);
  if (!rule) return;

  const { today } = await getWorkspaceToday();
  const { data: next } = await supabase
    .from("tasks")
    .insert({
      title: task.title,
      description: task.description,
      priority: task.priority,
      client_id: task.client_id,
      project_id: task.project_id,
      recurrence: rule,
      due_date: nextDueDate(rule, task.due_date, today),
    })
    .select("id")
    .single();

  const items = (task.checklist_items ?? []) as { text: string; sort_order: number }[];
  if (next && items.length > 0) {
    await supabase
      .from("checklist_items")
      .insert(items.map((i) => ({ task_id: next.id, text: i.text, sort_order: i.sort_order })));
  }
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

  const becomingDone = validStatus === "done" && current?.status !== "done";
  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      description: str(formData, "description"),
      // Completion (and the next repeat) is handled by completeTask below
      status: becomingDone ? current?.status ?? "todo" : validStatus,
      priority: PRIORITIES.some((p) => p.value === priority) ? priority : "medium",
      due_date: str(formData, "due_date"),
      project_id: str(formData, "project_id"),
      recurrence: readRecurrence(formData),
      completed_at: validStatus === "done" ? (current?.completed_at ?? null) : null,
    })
    .eq("id", id);
  if (error) return { error: "Couldn't save. Please try again." };
  if (becomingDone) await completeTask(supabase, id);

  refresh();
  return { ok: true };
}

export async function setTaskDone(id: string, done: boolean) {
  const supabase = await createClient();
  if (done) await completeTask(supabase, id);
  else await supabase.from("tasks").update({ status: "todo", completed_at: null }).eq("id", id);
  refresh();
}

/** Used by the Kanban board when a card is dropped in another column. */
export async function setTaskStatus(id: string, status: string) {
  if (!TASK_STATUSES.some((s) => s.value === status)) return;
  const supabase = await createClient();
  if (status === "done") await completeTask(supabase, id);
  else await supabase.from("tasks").update({ status, completed_at: null }).eq("id", id);
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
