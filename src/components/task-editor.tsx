"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Trash2, X } from "lucide-react";
import { TaskCheckbox } from "@/components/task-list";
import {
  addChecklistItem,
  deleteChecklistItem,
  deleteTask,
  toggleChecklistItem,
  updateTaskAction,
} from "@/app/(app)/tasks/actions";
import { PRIORITIES } from "@/lib/projects";
import { TASK_STATUSES, type ChecklistItem, type TaskDetail } from "@/lib/tasks";
import { parseRecurrence, WEEKDAYS } from "@/lib/recurrence";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string; depth: number };

function Checklist({ taskId, items }: { taskId: string; items: ChecklistItem[] }) {
  const [, startTransition] = useTransition();
  const [optimistic, update] = useOptimistic(
    items,
    (state, action: { type: "toggle"; id: string; done: boolean } | { type: "add"; text: string } | { type: "remove"; id: string }) => {
      if (action.type === "toggle") return state.map((i) => (i.id === action.id ? { ...i, is_done: action.done } : i));
      if (action.type === "remove") return state.filter((i) => i.id !== action.id);
      return [...state, { id: `tmp-${state.length}`, text: action.text, is_done: false, sort_order: state.length }];
    },
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const done = optimistic.filter((i) => i.is_done).length;

  const add = () => {
    const text = inputRef.current?.value.trim();
    if (!text) return;
    inputRef.current!.value = "";
    startTransition(async () => {
      update({ type: "add", text });
      await addChecklistItem(taskId, text);
    });
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="label mb-0">Checklist</span>
        {optimistic.length > 0 && (
          <span className="text-[12px] text-ink-faint">
            {done}/{optimistic.length}
          </span>
        )}
      </div>
      {optimistic.length > 0 && (
        <ul className="mb-2 space-y-0.5">
          {[...optimistic]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((item) => (
              <li key={item.id} className="group flex items-center gap-2.5 rounded-md px-1.5 py-1 hover:bg-hover">
                <TaskCheckbox
                  size="sm"
                  done={item.is_done}
                  onToggle={() =>
                    startTransition(async () => {
                      update({ type: "toggle", id: item.id, done: !item.is_done });
                      await toggleChecklistItem(item.id, !item.is_done);
                    })
                  }
                />
                <span className={cn("flex-1 text-sm", item.is_done && "text-ink-faint line-through")}>{item.text}</span>
                <button
                  type="button"
                  aria-label="Remove item"
                  onClick={() =>
                    startTransition(async () => {
                      update({ type: "remove", id: item.id });
                      await deleteChecklistItem(item.id);
                    })
                  }
                  className="rounded p-0.5 text-ink-faint hover:text-ink sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
        </ul>
      )}
      <input
        ref={inputRef}
        placeholder="Add an item and press Enter"
        className="input py-1.5"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
      />
    </div>
  );
}

function RepeatField({ value }: { value: unknown }) {
  const initial = parseRecurrence(value);
  const [freq, setFreq] = useState<string>(initial?.freq ?? "none");
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? []);

  return (
    <div>
      <label htmlFor="repeat" className="label">Repeat</label>
      <div className="flex flex-wrap items-center gap-2">
        <select id="repeat" name="repeat" value={freq} onChange={(e) => setFreq(e.target.value)} className="input w-auto">
          <option value="none">Doesn&apos;t repeat</option>
          <option value="daily">Every day</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="every_x_days">Every X days</option>
        </select>
        {(freq === "every_x_days" || freq === "monthly") && (
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            every
            <input
              name="repeat_interval"
              type="number"
              min={1}
              max={365}
              defaultValue={initial?.interval ?? (freq === "every_x_days" ? 2 : 1)}
              className="input w-20 py-1.5"
            />
            {freq === "monthly" ? "month(s)" : "days"}
          </label>
        )}
      </div>
      {freq === "weekly" && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {WEEKDAYS.map((d, i) => {
            const on = weekdays.includes(i);
            return (
              <label
                key={d}
                className={cn(
                  "cursor-pointer select-none rounded-md border px-2.5 py-1 text-[13px] transition",
                  on ? "border-ink bg-ink text-white" : "border-line text-ink-muted hover:border-line-strong",
                )}
              >
                <input
                  type="checkbox"
                  name="repeat_weekdays"
                  value={i}
                  checked={on}
                  onChange={() => setWeekdays((w) => (on ? w.filter((x) => x !== i) : [...w, i]))}
                  className="sr-only"
                />
                {d}
              </label>
            );
          })}
        </div>
      )}
      {freq !== "none" && (
        <p className="mt-1.5 text-[12.5px] text-ink-faint">
          When you complete this task, the next one is created automatically
          {freq === "weekly" && weekdays.length === 0 ? " one week after the due date" : ""}.
        </p>
      )}
    </div>
  );
}

export function TaskEditor({
  task,
  projectOptions,
  closeHref,
}: {
  task: TaskDetail;
  projectOptions: Option[];
  closeHref: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateTaskAction, undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();

  // Esc closes the panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(closeHref, { scroll: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, closeHref]);

  return (
    <div className="fixed inset-0 z-50">
      <Link href={closeHref} scroll={false} aria-label="Close" className="absolute inset-0 bg-black/15" />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-3.5">
          <p className="truncate text-[13px] text-ink-muted">
            {task.clients?.name}
            {task.projects?.name ? ` › ${task.projects.name}` : ""}
          </p>
          <Link href={closeHref} scroll={false} aria-label="Close" className="rounded-md p-1.5 text-ink-muted hover:bg-hover">
            <X className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form id="task-form" action={formAction} className="space-y-5">
            <input type="hidden" name="id" value={task.id} />
            <textarea
              name="title"
              defaultValue={task.title}
              rows={2}
              required
              aria-label="Task title"
              className="w-full resize-none bg-transparent text-lg font-semibold leading-snug outline-none"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="status" className="label">Status</label>
                <select id="status" name="status" defaultValue={task.status} className="input">
                  {TASK_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="priority" className="label">Priority</label>
                <select id="priority" name="priority" defaultValue={task.priority} className="input">
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="due_date" className="label">Due date</label>
                <input id="due_date" name="due_date" type="date" defaultValue={task.due_date ?? ""} className="input" />
              </div>
              <div>
                <label htmlFor="project_id" className="label">Project</label>
                <select id="project_id" name="project_id" defaultValue={task.project_id ?? ""} className="input">
                  <option value="">No project</option>
                  {projectOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {"  ".repeat(p.depth)}
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <RepeatField value={task.recurrence} />

            <div>
              <label htmlFor="description" className="label">Notes</label>
              <textarea
                id="description"
                name="description"
                rows={5}
                defaultValue={task.description ?? ""}
                placeholder="Details, links, context…"
                className="input resize-y leading-relaxed"
              />
            </div>
          </form>

          <div className="mt-6">
            <Checklist taskId={task.id} items={task.checklist_items} />
          </div>
        </div>

        <div className="border-t border-line px-6 py-3.5">
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-auto text-sm">Delete this task permanently?</span>
              <button
                onClick={() =>
                  startDelete(async () => {
                    await deleteTask(task.id);
                    router.push(closeHref, { scroll: false });
                  })
                }
                disabled={deleting}
                className="btn bg-danger text-white hover:bg-danger/90"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn-ghost">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button type="submit" form="task-form" disabled={pending} className="btn-primary">
                {pending ? "Saving…" : "Save"}
              </button>
              {state?.ok && !pending && <span className="text-[13px] text-success">Saved</span>}
              {state?.error && <span className="text-[13px] text-danger">{state.error}</span>}
              <button onClick={() => setConfirmDelete(true)} className="btn-ghost ml-auto hover:text-danger" aria-label="Delete task">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
