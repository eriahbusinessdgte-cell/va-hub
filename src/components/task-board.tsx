"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { ListChecks, Repeat } from "lucide-react";
import { DueDate, PriorityLabel } from "@/components/project-badges";
import { setTaskStatus } from "@/app/(app)/tasks/actions";
import { sortTasks, TASK_STATUSES, type TaskRow, type TaskStatus } from "@/lib/tasks";
import { cn } from "@/lib/utils";

function CardBody({ task, today, showClient, showProject }: { task: TaskRow; today: string; showClient: boolean; showProject: boolean }) {
  const done = task.status === "done";
  const total = task.checklist_items?.length ?? 0;
  const checked = task.checklist_items?.filter((c) => c.is_done).length ?? 0;
  return (
    <>
      <p className={cn("text-[13.5px] leading-snug", done && "text-ink-faint line-through")}>{task.title}</p>
      {(showClient || showProject) && (task.clients || task.projects) && (
        <p className="mt-1 truncate text-[12px] text-ink-muted">
          {[showClient ? task.clients?.name : null, showProject ? task.projects?.name : null].filter(Boolean).join(" › ")}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-ink-muted empty:hidden">
        {!done && (task.priority === "high" || task.priority === "urgent") && <PriorityLabel priority={task.priority} />}
        {!done && <DueDate date={task.due_date} today={today} />}
        {total > 0 && (
          <span className="inline-flex items-center gap-1">
            <ListChecks className="h-3 w-3" />
            {checked}/{total}
          </span>
        )}
        {!!task.recurrence && !done && <Repeat className="h-3 w-3" aria-label="Repeats" />}
      </div>
    </>
  );
}

function Card(props: { task: TaskRow; today: string; showClient: boolean; showProject: boolean; href: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: props.task.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cn("touch-manipulation", isDragging && "opacity-30")}>
      <Link
        href={props.href}
        scroll={false}
        draggable={false}
        className="block rounded-lg border border-line bg-surface px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-line-strong"
      >
        <CardBody {...props} />
      </Link>
    </div>
  );
}

function Column({
  status,
  label,
  count,
  children,
}: {
  status: TaskStatus;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[280px] shrink-0 flex-col rounded-xl bg-hover/60 p-2 transition md:w-auto md:min-w-0 md:flex-1",
        isOver && "bg-hover ring-2 ring-accent/20",
      )}
    >
      <div className="flex items-center gap-2 px-1.5 pb-2 pt-1">
        <span className="text-[13px] font-medium">{label}</span>
        <span className="text-[12px] text-ink-faint">{count}</span>
      </div>
      <div className="flex min-h-24 flex-col gap-2">{children}</div>
    </div>
  );
}

export function TaskBoard({
  tasks,
  today,
  showClient = false,
  showProject = true,
}: {
  tasks: TaskRow[];
  today: string;
  showClient?: boolean;
  showProject?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [optimistic, move] = useOptimistic(tasks, (state, m: { id: string; status: TaskStatus }) =>
    state.map((t) => (t.id === m.id ? { ...t, status: m.status } : t)),
  );

  // Small movement threshold so taps still open a task; long-press to drag on phones
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  const href = (id: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("task", id);
    return `${pathname}?${p.toString()}`;
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const id = String(e.active.id);
    const to = e.over?.id as TaskStatus | undefined;
    const task = optimistic.find((t) => t.id === id);
    if (!to || !task || task.status === to) return;
    startTransition(async () => {
      move({ id, status: to });
      await setTaskStatus(id, to);
    });
  };

  const active = optimistic.find((t) => t.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={onDragEnd}
    >
      <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-4 md:mx-0 md:px-0">
        {TASK_STATUSES.map((s) => {
          const column = sortTasks(optimistic.filter((t) => t.status === s.value));
          return (
            <Column key={s.value} status={s.value} label={s.label} count={column.length}>
              {column.map((t) => (
                <Card key={t.id} task={t} today={today} showClient={showClient} showProject={showProject} href={href(t.id)} />
              ))}
            </Column>
          );
        })}
      </div>
      <DragOverlay>
        {active && (
          <div className="w-[264px] rotate-1 rounded-lg border border-line-strong bg-surface px-3 py-2.5 shadow-xl">
            <CardBody task={active} today={today} showClient={showClient} showProject={showProject} />
          </div>
        )}
      </DragOverlay>
      <p className="mt-1 text-[12px] text-ink-faint">
        Drag cards between columns to change their status. On a phone, press and hold a card first.
      </p>
    </DndContext>
  );
}
