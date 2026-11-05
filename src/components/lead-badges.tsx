import { formatDate } from "@/lib/clients";
import { colorOf, followUpState, type Lead } from "@/lib/leads";
import { cn } from "@/lib/utils";

export function LeadStatusBadge({ status }: { status: { name: string; color: string } | null }) {
  if (!status) return <span className="text-[12px] text-ink-faint">No status</span>;
  const c = colorOf(status.color);
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium", c.badge)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {status.name}
    </span>
  );
}

/** Follow-up date with clear colour: red overdue, orange today. */
export function FollowUp({ lead, today, compact = false }: { lead: Pick<Lead, "follow_up_date" | "lead_statuses">; today: string; compact?: boolean }) {
  if (!lead.follow_up_date) return compact ? null : <span className="text-[12.5px] text-ink-faint">—</span>;
  const s = followUpState(lead, today);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap text-[12.5px] tabular-nums",
        s === "overdue" && "rounded-md bg-red-50 px-1.5 py-0.5 font-medium text-danger",
        s === "today" && "rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-warning",
        (s === "soon" || s === "later") && "text-ink",
        s === "none" && "text-ink-faint",
      )}
    >
      {s === "overdue" ? "Overdue · " : s === "today" ? "Today · " : compact ? "Follow up " : ""}
      {formatDate(lead.follow_up_date)}
    </span>
  );
}
