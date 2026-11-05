import { Flag } from "lucide-react";
import { PRIORITIES, PROJECT_STATUSES, type Priority, type ProjectStatus } from "@/lib/projects";
import { formatDate } from "@/lib/clients";
import { cn } from "@/lib/utils";

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const s = PROJECT_STATUSES.find((x) => x.value === status) ?? PROJECT_STATUSES[0];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium", s.className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function PriorityLabel({ priority, showLow = false }: { priority: Priority; showLow?: boolean }) {
  if (priority === "low" && !showLow) return null;
  const p = PRIORITIES.find((x) => x.value === priority) ?? PRIORITIES[1];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap text-[12px] font-medium", p.className)}>
      <Flag className="h-3 w-3" />
      {p.label}
    </span>
  );
}

export function DueDate({ date, today, done }: { date: string | null; today: string; done?: boolean }) {
  if (!date) return null;
  const overdue = !done && date < today;
  const isToday = !done && date === today;
  return (
    <span
      className={cn(
        "whitespace-nowrap text-[12.5px] tabular-nums",
        overdue ? "font-medium text-danger" : isToday ? "font-medium text-warning" : "text-ink-muted",
      )}
    >
      {overdue ? "Overdue · " : isToday ? "Today · " : "Due "}
      {formatDate(date)}
    </span>
  );
}

export function ProgressBar({ value, className }: { value: number | null; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
        <div
          className={cn("h-full rounded-full transition-all", value === 100 ? "bg-success" : "bg-ink/70")}
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
      <span className="w-9 text-right text-[12px] tabular-nums text-ink-muted">{value === null ? "—" : `${value}%`}</span>
    </div>
  );
}
