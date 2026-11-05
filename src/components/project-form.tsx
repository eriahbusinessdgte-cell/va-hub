"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PRIORITIES, PROJECT_STATUSES, type Project } from "@/lib/projects";
import type { ProjectFormState } from "@/app/(app)/projects/actions";

export type ParentOption = { id: string; name: string; depth: number };

export function ProjectForm({
  action,
  clientId,
  project,
  parentOptions,
  defaultParentId,
  cancelHref,
  submitLabel,
}: {
  action: (state: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  clientId: string;
  project?: Project;
  parentOptions: ParentOption[];
  defaultParentId?: string | null;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <input type="hidden" name="client_id" value={clientId} />
      {project && <input type="hidden" name="id" value={project.id} />}

      <section className="space-y-4 rounded-xl border border-line bg-surface p-6">
        <div>
          <label htmlFor="name" className="label">
            Project name <span className="text-ink-faint">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            autoFocus={!project}
            defaultValue={project?.name ?? ""}
            placeholder="e.g. Website launch"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="parent_id" className="label">Inside project</label>
          <select id="parent_id" name="parent_id" defaultValue={project?.parent_id ?? defaultParentId ?? ""} className="input">
            <option value="">None (top-level project)</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {"   ".repeat(p.depth)}
                {p.depth > 0 ? "↳ " : ""}
                {p.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[12.5px] text-ink-faint">Choose a project to make this a subproject.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="status" className="label">Status</label>
            <select id="status" name="status" defaultValue={project?.status ?? "not_started"} className="input">
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="priority" className="label">Priority</label>
            <select id="priority" name="priority" defaultValue={project?.priority ?? "medium"} className="input">
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="start_date" className="label">Start date</label>
            <input id="start_date" name="start_date" type="date" defaultValue={project?.start_date ?? ""} className="input" />
          </div>
          <div>
            <label htmlFor="due_date" className="label">Due date</label>
            <input id="due_date" name="due_date" type="date" defaultValue={project?.due_date ?? ""} className="input" />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="label">Description</label>
          <textarea
            id="description"
            name="description"
            rows={5}
            defaultValue={project?.description ?? ""}
            placeholder="Goals, scope, anything worth noting…"
            className="input resize-y leading-relaxed"
          />
        </div>
      </section>

      {state?.error && (
        <p role="alert" className="rounded-md bg-danger/8 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className="btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}
