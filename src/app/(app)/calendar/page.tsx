import Link from "next/link";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Agenda, ItemChip, KIND_STYLE } from "@/components/calendar-parts";
import { CalendarClientFilter } from "@/components/calendar-client-filter";
import { LeadPanel } from "@/components/lead-panel";
import { TaskPanel } from "@/components/task-panel";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceToday } from "@/lib/workspace";
import { loadCalendarItems, type CalendarItem } from "@/lib/calendar";
import { addDays, addMonths, daysBetween, fmt, isValidDate, rangeFor, startOfMonth } from "@/lib/cal-dates";
import { cn } from "@/lib/utils";

export const metadata = { title: "Calendar" };

type View = "month" | "week" | "day";
type Params = { view?: string; date?: string; client?: string; show?: string; task?: string; lead?: string };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ALL_KINDS = ["task", "project", "followup"] as const;

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const { today } = await getWorkspaceToday();
  const view: View = sp.view === "week" || sp.view === "day" ? sp.view : "month";
  const date = isValidDate(sp.date) ? sp.date : today;
  const kinds = new Set(sp.show ? sp.show.split(",").filter((k) => (ALL_KINDS as readonly string[]).includes(k)) : ALL_KINDS);

  const { start, end } = rangeFor(view, date);
  const supabase = await createClient();
  const [items, { data: clients }] = await Promise.all([
    loadCalendarItems(start, end, { clientId: sp.client, kinds }),
    supabase.from("clients").select("id, name, is_internal").is("archived_at", null).order("is_internal", { ascending: false }).order("name"),
  ]);

  // ----- URL helpers (everything lives in the address, so views can be bookmarked) -----
  const url = (changes: Partial<Params>) => {
    const merged = { ...sp, task: undefined, lead: undefined, ...changes };
    const qs = new URLSearchParams(Object.entries(merged).filter(([, v]) => v) as [string, string][]).toString();
    return `/calendar${qs ? `?${qs}` : ""}`;
  };
  const hrefFor = (i: CalendarItem) =>
    i.kind === "project" ? `/projects/${i.id}` : i.kind === "task" ? url({ task: i.id }) : url({ lead: i.id });
  const step = (dir: 1 | -1) =>
    view === "month" ? addMonths(startOfMonth(date), dir) : addDays(date, dir * (view === "week" ? 7 : 1));
  const toggleKind = (k: string) => {
    const next = new Set(kinds);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    return url({ show: next.size === ALL_KINDS.length ? undefined : [...next].join(",") || "none" });
  };

  const title =
    view === "month"
      ? fmt(date, { month: "long", year: "numeric" })
      : view === "week"
        ? `${fmt(start, { month: "short", day: "numeric" })} – ${fmt(end, { month: "short", day: "numeric", year: "numeric" })}`
        : fmt(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const days = daysBetween(start, end);
  const byDay = new Map<string, CalendarItem[]>();
  for (const i of items) byDay.set(i.date, [...(byDay.get(i.date) ?? []), i]);
  const closeHref = url({});

  return (
    <>
      {/* Header */}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={url({ date: step(-1) })} aria-label="Previous" className="btn-ghost border border-line bg-surface px-2 py-1.5">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link href={url({ date: undefined })} className="btn-ghost border border-line bg-surface px-3 py-1.5 text-[13px]">Today</Link>
          <Link href={url({ date: step(1) })} aria-label="Next" className="btn-ghost border border-line bg-surface px-2 py-1.5">
            <ChevronRight className="h-4 w-4" />
          </Link>
          <h1 className="ml-2 text-xl font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="flex gap-1 rounded-lg bg-hover p-1">
          {(["month", "week", "day"] as View[]).map((v) => (
            <Link
              key={v}
              href={url({ view: v === "month" ? undefined : v })}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] capitalize transition",
                view === v ? "bg-surface font-medium text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-muted hover:text-ink",
              )}
            >
              {v}
            </Link>
          ))}
        </div>
      </header>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-ink-muted">Show:</span>
        {ALL_KINDS.map((k) => {
          const s = KIND_STYLE[k];
          const on = kinds.has(k);
          return (
            <Link
              key={k}
              href={toggleKind(k)}
              scroll={false}
              role="switch"
              aria-checked={on}
              title={on ? `Hide ${s.label.toLowerCase()}` : `Show ${s.label.toLowerCase()}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] transition",
                on ? "border-line-strong bg-surface text-ink hover:border-ink-faint" : "border-dashed border-line-strong text-ink-faint hover:text-ink-muted",
              )}
            >
              <span
                className={cn(
                  "flex h-3.5 w-3.5 items-center justify-center rounded-full",
                  on ? `${s.dot} text-white` : "border border-line-strong",
                )}
              >
                {on && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </span>
              {s.label}
            </Link>
          );
        })}
        <div className="ml-auto">
          <CalendarClientFilter clients={(clients ?? []).map((c) => ({ id: c.id, name: c.name }))} />
        </div>
      </div>

      {/* Month & week grid on larger screens */}
      {view !== "day" && (
        <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
          <div className="grid grid-cols-7 border-b border-line">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-[12px] font-medium text-ink-faint">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d, i) => {
              const list = byDay.get(d) ?? [];
              const outside = view === "month" && d.slice(0, 7) !== date.slice(0, 7);
              const limit = view === "week" ? 12 : 3;
              return (
                <div
                  key={d}
                  className={cn(
                    "border-line p-1.5",
                    view === "week" ? "min-h-[420px]" : "min-h-[112px]",
                    i % 7 !== 6 && "border-r",
                    i < days.length - 7 && "border-b",
                    outside && "bg-canvas",
                  )}
                >
                  <Link
                    href={url({ view: "day", date: d })}
                    className={cn(
                      "mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[12px]",
                      d === today ? "bg-accent font-semibold text-white" : outside ? "text-ink-faint" : "text-ink-muted hover:bg-hover",
                    )}
                  >
                    {Number(d.slice(8))}
                  </Link>
                  <div className="space-y-0.5">
                    {list.slice(0, limit).map((item) => (
                      <ItemChip key={item.key} item={item} href={hrefFor(item)} today={today} />
                    ))}
                    {list.length > limit && (
                      <Link href={url({ view: "day", date: d })} className="block px-1.5 text-[11.5px] text-ink-muted hover:text-ink">
                        +{list.length - limit} more
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day view everywhere, and month/week as a list on phones */}
      <div className={cn(view !== "day" && "md:hidden")}>
        <Agenda
          days={view === "month" ? days.filter((d) => d.slice(0, 7) === date.slice(0, 7)) : days}
          items={items}
          hrefFor={hrefFor}
          today={today}
          dayHref={view === "day" ? undefined : (d) => url({ view: "day", date: d })}
          hideEmptyDays={view !== "day"}
          emptyText={view === "day" ? "Nothing scheduled for this day." : "Nothing scheduled in this period."}
        />
      </div>

      {sp.task && <TaskPanel taskId={sp.task} closeHref={closeHref} />}
      {sp.lead && <LeadPanel leadId={sp.lead} closeHref={closeHref} today={today} />}
    </>
  );
}
