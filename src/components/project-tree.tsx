"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { DueDate, PriorityLabel, ProgressBar, ProjectStatusBadge } from "@/components/project-badges";
import { progressOf, type ProjectNode } from "@/lib/projects";
import { cn } from "@/lib/utils";

function Row({ node, today }: { node: ProjectNode; today: string }) {
  const [open, setOpen] = useState(node.depth < 2);
  const hasChildren = node.children.length > 0;
  const done = node.status === "completed";

  return (
    <li>
      <div
        className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 border-b border-line px-4 py-3 transition hover:bg-canvas md:grid-cols-[minmax(0,1fr)_120px_110px_150px_140px]"
        style={{ paddingLeft: `${16 + node.depth * 22}px` }}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Collapse" : "Expand"}
            className={cn(
              "rounded p-0.5 text-ink-faint hover:bg-hover hover:text-ink",
              !hasChildren && "invisible",
            )}
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
          </button>
          <Link
            href={`/projects/${node.id}`}
            className={cn("truncate text-sm font-medium hover:underline", done && "text-ink-muted line-through decoration-ink-faint")}
          >
            {node.name}
          </Link>
          {hasChildren && (
            <span className="shrink-0 text-[12px] text-ink-faint">{node.children.length}</span>
          )}
          {node.archived_at && (
            <span className="shrink-0 rounded bg-hover px-1.5 py-px text-[11px] text-ink-muted">Archived</span>
          )}
          <Link
            href={`/projects/new?client=${node.client_id}&parent=${node.id}`}
            title="Add subproject"
            className="ml-1 hidden shrink-0 rounded p-0.5 text-ink-faint hover:bg-hover hover:text-ink group-hover:inline-flex"
          >
            <Plus className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="justify-self-end md:justify-self-start">
          <ProjectStatusBadge status={node.status} />
        </div>
        <div className="hidden md:block">
          <PriorityLabel priority={node.priority} showLow />
        </div>
        <div className="col-span-2 md:col-span-1">
          <DueDate date={node.due_date} today={today} done={done} />
        </div>
        <ProgressBar value={progressOf(node)} className="col-span-2 md:col-span-1" />
      </div>
      {hasChildren && open && (
        <ul>
          {node.children.map((c) => (
            <Row key={c.id} node={c} today={today} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ProjectTree({ nodes, today }: { nodes: ProjectNode[]; today: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="hidden grid-cols-[minmax(0,1fr)_120px_110px_150px_140px] gap-4 border-b border-line px-4 py-2.5 text-[12px] font-medium text-ink-faint md:grid">
        <span className="pl-6">Project</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Due</span>
        <span>Progress</span>
      </div>
      <ul className="-mb-px">
        {nodes.map((n) => (
          <Row key={n.id} node={n} today={today} />
        ))}
      </ul>
    </div>
  );
}
