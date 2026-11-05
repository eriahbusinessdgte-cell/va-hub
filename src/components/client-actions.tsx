"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { archiveClient, deleteClient, restoreClient } from "@/app/(app)/clients/actions";

export function ClientActions({
  id,
  name,
  archived,
  isInternal,
}: {
  id: string;
  name: string;
  archived: boolean;
  isInternal: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="w-full rounded-xl border border-danger/30 bg-danger/5 p-4 sm:w-auto sm:max-w-sm">
        <p className="text-sm font-medium text-ink">Delete {name} permanently?</p>
        <p className="mt-1 text-[13px] text-ink-muted">
          This also deletes all of their projects, tasks and leads. It can&apos;t be undone. If you
          just want it out of the way, archive instead.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => startTransition(() => deleteClient(id))}
            disabled={pending}
            className="btn bg-danger text-white hover:bg-danger/90"
          >
            {pending ? "Deleting…" : "Yes, delete"}
          </button>
          <button onClick={() => setConfirming(false)} className="btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Link href={`/clients/${id}/edit`} className="btn-ghost border border-line bg-surface">
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Link>
      {!isInternal &&
        (archived ? (
          <button
            onClick={() => startTransition(() => restoreClient(id))}
            disabled={pending}
            className="btn-ghost"
          >
            <ArchiveRestore className="h-3.5 w-3.5" /> Restore
          </button>
        ) : (
          <button
            onClick={() => startTransition(() => archiveClient(id))}
            disabled={pending}
            className="btn-ghost"
          >
            <Archive className="h-3.5 w-3.5" /> Archive
          </button>
        ))}
      {!isInternal && (
        <button onClick={() => setConfirming(true)} className="btn-ghost hover:text-danger">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      )}
    </div>
  );
}
