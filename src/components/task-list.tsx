"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { Check, ChevronRight, ListChecks, Repeat } from "lucide-react";
import { DueDate, PriorityLabel } from "@/components/project-badges";
import { setTaskDone } from "@/app/(app)/tasks/actions";
import type { TaskGroup, TaskRow } from "@/lib/tasks";
import { cn } from "@/lib/utils";

function useTaskHref() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("task", id);
    return `${pathname}?${params.toString()}`;
  };
}

export function TaskCheckbox({ done, onToggle, size = "md" }: { done: boolean; onToggle: () => void; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? "Mark as not done" : "Mark as done"}
      onClick={onToggle}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border transition",
        size === "md" ? "h-[18px] w-[18px]" : "h-4 w-4",
        done ? "border-success bg-success text-white" : "border-line-strong hover:border-ink-muted",
      )}
    >
      {done && <Check className="h-3 w-3" strokeWidth={3} />}
    </button>
  );
}

function Row({
  task,
  today,
  showClient,
  showProject,
  href,
}: {
  task: TaskRow;
  today: string;
  showClient: boolean;
  showProject: boolean;
  href: string;
}) {
  const [, startTransition] = useTransition();
  const [done, setOptimisticDone] = useOptimistic(task.status === "done");
  const checklistTotal = task.checklist_items?.length ?? 0;
  const checklistDone = task.checklist_items?.filter((c) => c.is_done).length ?? 0;

  return (
    <li className="group flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-canvas">
      <div className="pt-0.5">
        <TaskCheckbox
          done={done}
          onToggle={() =>
            startTransition(async () => {
              setOptimisticDone(!done);
              await setTaskDone(task.id, !done);
            })
          }
        />
      </div>
      <Link href={href} scroll={false} className="min-w-0 flex-1">
        <p className={cn("text-sm leading-snug", done && "text-ink-faint line-through")}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-muted">
          {showClient && task.clients && <span>{task.clients.name}</span>}
          {showProject && task.projects && (
            <span className="inline-flex items-center gap-1">
              {showClient && <ChevronRight className="-ml-2 h-3 w-3 text-ink-faint" />}
              {task.projects.name}
            </span>
          )}
          {!!task.recurrence && !done && (
            <span className="inline-flex items-center" title="Repeats">
              <Repeat className="h-3 w-3" />
            </span>
          )}
          {checklistTotal > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListChecks className="h-3 w-3" />
              {checklistDone}/{checklistTotal}
            </span>
          )}
          {!done && (task.priority === "high" || task.priority === "urgent") && <PriorityLabel priority={task.priority} />}
          {!done && <DueDate date={task.due_date} today={today} />}
        </div>
      </Link>
    </li>
  );
}

export function TaskList({
  groups,
  completed = [],
  today,
  showClient = false,
  showProject = true,
  emptyMessage = "No tasks here.",
}: {
  groups: TaskGroup<TaskRow>[];
  completed?: TaskRow[];
  today: string;
  showClient?: boolean;
  showProject?: boolean;
  emptyMessage?: string;
}) {
  const taskHref = useTaskHref();
  const [showDone, setShowDone] = useState(false);
  const hasOpen = groups.some((g) => g.tasks.length > 0);

  return (
    <div className="space-y-6">
      {!hasOpen && (
        <p className="rounded-xl border border-dashed border-line-strong bg-surface px-5 py-8 text-center text-sm text-ink-faint">
          {emptyMessage}
        </p>
      )}

      {groups.map((g) =>
        g.tasks.length === 0 ? null : (
          <section key={g.key}>
            {g.label && (
              <h3
                className={cn(
                  "mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider",
                  g.tone === "danger" ? "text-danger" : g.tone === "warning" ? "text-warning" : "text-ink-faint",
                )}
              >
                {g.label}
                <span className="font-normal text-ink-faint">{g.tasks.length}</span>
              </h3>
            )}
            <ul className="overflow-hidden rounded-xl border border-line bg-surface">
              {g.tasks.map((t) => (
                <Row key={t.id} task={t} today={today} showClient={showClient} showProject={showProject} href={taskHref(t.id)} />
              ))}
            </ul>
          </section>
        ),
      )}

      {completed.length > 0 && (
        <section>
          <button
            onClick={() => setShowDone((s) => !s)}
            className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-faint hover:text-ink"
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", showDone && "rotate-90")} />
            Completed <span className="font-normal">{completed.length}</span>
          </button>
          {showDone && (
            <ul className="overflow-hidden rounded-xl border border-line bg-surface">
              {completed.map((t) => (
                <Row key={t.id} task={t} today={today} showClient={showClient} showProject={showProject} href={taskHref(t.id)} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
