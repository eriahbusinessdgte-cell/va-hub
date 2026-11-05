"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { createTaskAction } from "@/app/(app)/tasks/actions";
import { PRIORITIES } from "@/lib/projects";

type Option = { id: string; name: string; depth?: number };

/**
 * One-line task entry. Type a title and press Enter.
 * Client and project are fixed by the page, or chosen from small dropdowns.
 */
export function QuickAddTask({
  clientId,
  clientOptions,
  projectId,
  projectOptions,
  defaultDue,
  placeholder = "Add a task…",
}: {
  clientId?: string;
  clientOptions?: Option[];
  projectId?: string;
  projectOptions?: Option[];
  defaultDue?: string;
  placeholder?: string;
}) {
  const [state, formAction, pending] = useActionState(createTaskAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);

  // After a successful add: clear the title and keep typing
  useEffect(() => {
    if (state?.ok && titleRef.current) {
      titleRef.current.value = "";
      titleRef.current.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="rounded-xl border border-line bg-surface px-4 py-2.5 focus-within:border-line-strong">
      {clientId && <input type="hidden" name="client_id" value={clientId} />}
      {projectId && <input type="hidden" name="project_id" value={projectId} />}

      <div className="flex items-center gap-3">
        <Plus className="h-4 w-4 shrink-0 text-ink-faint" />
        <input
          ref={titleRef}
          name="title"
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setExpanded(true)}
          className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-ink-faint"
        />
        <button type="submit" disabled={pending} className="btn-primary px-3 py-1 text-[13px]">
          {pending ? "Adding…" : "Add"}
        </button>
      </div>

      {/* Options stay in the form (so defaults are sent) but only show once you start typing */}
      <div className={expanded ? "mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2.5 pl-7" : "hidden"}>
          {!clientId && clientOptions && (
            <select name="client_id" defaultValue={clientOptions[0]?.id} aria-label="Client" className="input w-auto py-1 text-[13px]">
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {!projectId && projectOptions && projectOptions.length > 0 && (
            <select name="project_id" defaultValue="" aria-label="Project" className="input w-auto max-w-[220px] py-1 text-[13px]">
              <option value="">No project</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {"  ".repeat(p.depth ?? 0)}
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <label className="flex items-center gap-1.5 text-[13px] text-ink-muted">
            <CalendarDays className="h-3.5 w-3.5" />
            <input name="due_date" type="date" defaultValue={defaultDue} aria-label="Due date" className="input w-auto py-1 text-[13px]" />
          </label>
          <select name="priority" defaultValue="medium" aria-label="Priority" className="input w-auto py-1 text-[13px]">
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label} priority</option>
            ))}
          </select>
      </div>

      {state?.error && <p className="mt-2 pl-7 text-[13px] text-danger">{state.error}</p>}
    </form>
  );
}
