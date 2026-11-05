import Link from "next/link";
import { CheckSquare, Flag, FolderKanban, Target } from "lucide-react";
import type { CalendarItem } from "@/lib/calendar";
import { fmt } from "@/lib/cal-dates";
import { cn } from "@/lib/utils";

export const KIND_STYLE = {
  task: { label: "Tasks", icon: CheckSquare, chip: "bg-blue-50 text-blue-800 hover:bg-blue-100", dot: "bg-blue-500" },
  project: { label: "Project deadlines", icon: FolderKanban, chip: "bg-violet-50 text-violet-800 hover:bg-violet-100", dot: "bg-violet-500" },
  followup: { label: "Lead follow-ups", icon: Target, chip: "bg-amber-50 text-amber-900 hover:bg-amber-100", dot: "bg-amber-500" },
} as const;

export type HrefFor = (item: CalendarItem) => string;

export function ItemChip({ item, href, today }: { item: CalendarItem; href: string; today: string }) {
  const s = KIND_STYLE[item.kind];
  const overdue = !item.done && item.date < today;
  return (
    <Link
      href={href}
      scroll={false}
      title={`${item.title} · ${item.client}`}
      className={cn(
        "flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11.5px] leading-tight transition",
        s.chip,
        item.done && "opacity-50 line-through",
        overdue && "ring-1 ring-danger/50",
      )}
    >
      {item.kind === "project" && <Flag className="h-2.5 w-2.5 shrink-0" />}
      <span className="truncate">{item.title}</span>
    </Link>
  );
}

/** A day-by-day list. Used for the day view and on phones. */
export function Agenda({
  days,
  items,
  hrefFor,
  today,
  dayHref,
  emptyText = "Nothing scheduled.",
  hideEmptyDays = true,
}: {
  days: string[];
  items: CalendarItem[];
  hrefFor: HrefFor;
  today: string;
  dayHref?: (d: string) => string;
  emptyText?: string;
  hideEmptyDays?: boolean;
}) {
  const byDay = new Map<string, CalendarItem[]>();
  for (const i of items) byDay.set(i.date, [...(byDay.get(i.date) ?? []), i]);
  const shown = hideEmptyDays ? days.filter((d) => byDay.has(d)) : days;

  if (shown.length === 0) {
    return <p className="rounded-xl border border-dashed border-line-strong bg-surface px-5 py-10 text-center text-sm text-ink-faint">{emptyText}</p>;
  }

  return (
    <div className="space-y-4">
      {shown.map((d) => {
        const list = byDay.get(d) ?? [];
        const heading = fmt(d, { weekday: "short", month: "short", day: "numeric" });
        return (
          <section key={d}>
            <h3 className={cn("mb-1.5 text-[12px] font-semibold uppercase tracking-wider", d === today ? "text-accent" : d < today ? "text-ink-faint" : "text-ink-muted")}>
              {dayHref ? <Link href={dayHref(d)} className="hover:underline">{heading}</Link> : heading}
              {d === today && " · Today"}
            </h3>
            {list.length === 0 ? (
              <p className="text-[13px] text-ink-faint">Nothing scheduled.</p>
            ) : (
              <ul className="overflow-hidden rounded-xl border border-line bg-surface">
                {list.map((i) => {
                  const s = KIND_STYLE[i.kind];
                  const Icon = s.icon;
                  const overdue = !i.done && i.date < today;
                  return (
                    <li key={i.key} className="border-b border-line last:border-b-0">
                      <Link href={hrefFor(i)} scroll={false} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-canvas">
                        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", s.chip)}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-sm", i.done && "text-ink-faint line-through")}>{i.title}</span>
                          <span className="block truncate text-[12px] text-ink-muted">
                            {i.client} · {i.kind === "task" ? "Task" : i.kind === "project" ? "Project deadline" : "Follow up"}
                            {overdue && <span className="font-medium text-danger"> · Overdue</span>}
                          </span>
                        </span>
                        {i.urgent && !i.done && <Flag className="h-3.5 w-3.5 shrink-0 text-amber-600" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
