"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/projects";
import {
  archiveProject,
  deleteProject,
  restoreProject,
  setProjectStatus,
} from "@/app/(app)/projects/actions";

export function ProjectActions({
  id,
  name,
  status,
  archived,
  subprojectCount,
}: {
  id: string;
  name: string;
  status: ProjectStatus;
  archived: boolean;
  subprojectCount: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="w-full rounded-xl border border-danger/30 bg-danger/5 p-4 sm:w-auto sm:max-w-sm">
        <p className="text-sm font-medium">Delete &ldquo;{name}&rdquo; permanently?</p>
        <p className="mt-1 text-[13px] text-ink-muted">
          {subprojectCount > 0
            ? `Its ${subprojectCount} subproject${subprojectCount === 1 ? "" : "s"} will be deleted too. `
            : ""}
          Tasks are kept but will no longer be linked to this project. This can&apos;t be undone.
          Archive instead if you want to keep the history.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => startTransition(() => deleteProject(id))}
            disabled={pending}
            className="btn bg-danger text-white hover:bg-danger/90"
          >
            {pending ? "Deleting…" : "Yes, delete"}
          </button>
          <button onClick={() => setConfirming(false)} className="btn-ghost">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <select
        aria-label="Project status"
        value={status}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(() => setProjectStatus(id, next));
        }}
        className="input w-auto py-1.5 pr-8"
      >
        {PROJECT_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <Link href={`/projects/${id}/edit`} className="btn-ghost border border-line bg-surface">
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Link>
      {archived ? (
        <button onClick={() => startTransition(() => restoreProject(id))} disabled={pending} className="btn-ghost">
          <ArchiveRestore className="h-3.5 w-3.5" /> Restore
        </button>
      ) : (
        <button onClick={() => startTransition(() => archiveProject(id))} disabled={pending} className="btn-ghost">
          <Archive className="h-3.5 w-3.5" /> Archive
        </button>
      )}
      <button onClick={() => setConfirming(true)} className="btn-ghost hover:text-danger">
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </div>
  );
}
