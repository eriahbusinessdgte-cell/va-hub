"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Columns3, List, Plus, Search, Settings2 } from "lucide-react";
import { FollowUp, LeadStatusBadge } from "@/components/lead-badges";
import { quickAddLead, setLeadStatus } from "@/app/(app)/leads/actions";
import { formatDate } from "@/lib/clients";
import { colorOf, followUpState, type Lead, type LeadStatus } from "@/lib/leads";
import { cn } from "@/lib/utils";

// ---------- URL helpers ----------

function useLeadUrl() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const build = (changes: Record<string, string | null>) => {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  return { searchParams, build, go: (changes: Record<string, string | null>) => router.push(build(changes), { scroll: false }) };
}

// ---------- Quick add ----------

export function LeadQuickAdd({ clientId, clientOptions }: { clientId?: string; clientOptions?: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(quickAddLead, undefined);
  const { go } = useLeadUrl();
  const lastOpened = useRef<string | undefined>(undefined);

  // Open the new lead's panel so the details can be filled in
  useEffect(() => {
    if (state?.ok && state.id && lastOpened.current !== state.id) {
      lastOpened.current = state.id;
      go({ lead: state.id });
    }
  }, [state, go]);

  return (
    <form action={formAction} className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 focus-within:border-line-strong">
      {clientId && <input type="hidden" name="client_id" value={clientId} />}
      <Plus className="h-4 w-4 shrink-0 text-ink-faint" />
      <input
        name="name"
        placeholder="Add a lead: type a name and press Enter"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-ink-faint"
      />
      {!clientId && clientOptions && (
        <select name="client_id" defaultValue={clientOptions[0]?.id} aria-label="Client" className="input w-auto max-w-[160px] py-1 text-[13px]">
          {clientOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
      <button type="submit" disabled={pending} className="btn-primary px-3 py-1 text-[13px]">
        {pending ? "Adding…" : "Add"}
      </button>
      {state?.error && <span className="text-[12px] text-danger">{state.error}</span>}
    </form>
  );
}

// ---------- Filters ----------

export function LeadToolbar({
  statuses,
  sources,
  clients,
  statusesHref,
}: {
  /** Specific statuses (client view). Without them, Open/Won/Lost is offered. */
  statuses?: LeadStatus[];
  sources: string[];
  clients?: { id: string; name: string }[];
  statusesHref?: string;
}) {
  const { searchParams, go, build } = useLeadUrl();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const board = searchParams.get("layout") === "board";

  // Search as you type (short pause first)
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => go({ q: q || null, lead: null }), 300);
    return () => clearTimeout(t);
  }, [q, searchParams, go]);

  const select = (key: string, label: string, options: { value: string; label: string }[]) => (
    <select
      aria-label={label}
      value={searchParams.get(key) ?? ""}
      onChange={(e) => go({ [key]: e.target.value || null, lead: null })}
      className="input w-auto py-1.5 text-[13px]"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );

  const toggle = (layout: "list" | "board", Icon: typeof List, label: string) => (
    <Link
      href={build({ layout: layout === "board" ? "board" : null, lead: null })}
      scroll={false}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] transition",
        (layout === "board") === board ? "bg-surface font-medium text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-muted hover:text-ink",
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </Link>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-56">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leads" className="input py-1.5 pl-9 text-[13px]" />
      </div>
      {clients && select("client", "All clients", clients.map((c) => ({ value: c.id, label: c.name })))}
      {statuses
        ? select("status", "Any status", [...statuses.map((s) => ({ value: s.id, label: s.name })), { value: "none", label: "No status" }])
        : select("status", "Any stage", [
            { value: "open", label: "Open" },
            { value: "won", label: "Won" },
            { value: "lost", label: "Lost" },
          ])}
      {select("followup", "Any follow-up", [
        { value: "due", label: "Due now (overdue + today)" },
        { value: "overdue", label: "Overdue only" },
        { value: "week", label: "Due within 7 days" },
        { value: "none", label: "No follow-up set" },
      ])}
      {sources.length > 0 && select("source", "Any source", sources.map((s) => ({ value: s, label: s })))}
      {!board &&
        select("sort", "Sort: follow-up date", [
          { value: "name", label: "Sort: name" },
          { value: "contacted", label: "Sort: last contacted" },
          { value: "newest", label: "Sort: newest" },
        ])}
      <div className="ml-auto flex items-center gap-2">
        {statusesHref && (
          <Link href={statusesHref} className="btn-ghost py-1.5 text-[13px]">
            <Settings2 className="h-3.5 w-3.5" /> Edit statuses
          </Link>
        )}
        <div className="flex gap-1 rounded-lg bg-hover p-1">
          {toggle("list", List, "Table")}
          {toggle("board", Columns3, "Pipeline")}
        </div>
      </div>
    </div>
  );
}

// ---------- Table ----------

export function LeadTable({ leads, today, showClient = false }: { leads: Lead[]; today: string; showClient?: boolean }) {
  const { build } = useLeadUrl();
  const router = useRouter();
  const open = (id: string) => router.push(build({ lead: id }), { scroll: false });

  if (leads.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line-strong bg-surface px-5 py-10 text-center text-sm text-ink-faint">
        No leads match. Add one above, or clear the filters.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      {/* Desktop table */}
      <table className="hidden w-full text-left text-sm md:table">
        <thead className="border-b border-line text-[12px] text-ink-faint">
          <tr>
            <th className="px-4 py-2.5 font-medium">Lead</th>
            {showClient && <th className="px-3 py-2.5 font-medium">Client</th>}
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Source</th>
            <th className="px-3 py-2.5 font-medium">Contacted</th>
            <th className="px-3 py-2.5 font-medium">Follow-up</th>
            <th className="px-3 py-2.5 font-medium">Next action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {leads.map((l) => {
            const overdue = followUpState(l, today) === "overdue";
            return (
              <tr key={l.id} onClick={() => open(l.id)} className={cn("cursor-pointer transition hover:bg-canvas", overdue && "bg-red-50/40")}>
                <td className="max-w-[220px] px-4 py-3">
                  <p className="truncate font-medium">{l.name}</p>
                  {(l.company || l.email) && <p className="truncate text-[12.5px] text-ink-muted">{l.company ?? l.email}</p>}
                </td>
                {showClient && <td className="px-3 py-3 text-[13px] text-ink-muted">{l.clients?.name}</td>}
                <td className="px-3 py-3"><LeadStatusBadge status={l.lead_statuses} /></td>
                <td className="px-3 py-3 text-[13px] text-ink-muted">{l.source ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-[13px] text-ink-muted">{l.date_contacted ? formatDate(l.date_contacted) : "—"}</td>
                <td className="px-3 py-3"><FollowUp lead={l} today={today} /></td>
                <td className="max-w-[240px] truncate px-3 py-3 text-[13px] text-ink-muted">{l.next_action ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Phone cards */}
      <ul className="divide-y divide-line md:hidden">
        {leads.map((l) => (
          <li key={l.id}>
            <button onClick={() => open(l.id)} className="w-full px-4 py-3 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{l.name}</p>
                  <p className="truncate text-[12.5px] text-ink-muted">
                    {[showClient ? l.clients?.name : null, l.company, l.source].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <LeadStatusBadge status={l.lead_statuses} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <FollowUp lead={l} today={today} compact />
                {l.next_action && <span className="truncate text-[12.5px] text-ink-muted">→ {l.next_action}</span>}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Pipeline board ----------

function LeadCard({ lead, today, showClient, onOpen }: { lead: Lead; today: string; showClient: boolean; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      onContextMenu={(e) => e.preventDefault()}
      style={{ WebkitTouchCallout: "none" }}
      className={cn(
        "cursor-pointer touch-manipulation select-none rounded-lg border border-line bg-surface px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-line-strong",
        isDragging && "opacity-30",
      )}
    >
      <LeadCardBody lead={lead} today={today} showClient={showClient} />
    </div>
  );
}

function LeadCardBody({ lead, today, showClient }: { lead: Lead; today: string; showClient: boolean }) {
  return (
    <>
      <p className="text-[13.5px] font-medium leading-snug">{lead.name}</p>
      {(lead.company || (showClient && lead.clients)) && (
        <p className="mt-0.5 truncate text-[12px] text-ink-muted">
          {[showClient ? lead.clients?.name : null, lead.company].filter(Boolean).join(" · ")}
        </p>
      )}
      {lead.next_action && <p className="mt-1.5 line-clamp-2 text-[12px] text-ink-muted">→ {lead.next_action}</p>}
      <div className="mt-1.5 empty:hidden">
        <FollowUp lead={lead} today={today} compact />
      </div>
    </>
  );
}

function StatusColumn({ id, status, count, children }: { id: string; status: LeadStatus | null; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const c = colorOf(status?.color);
  return (
    <div
      ref={setNodeRef}
      className={cn("flex w-[270px] shrink-0 flex-col rounded-xl bg-hover/60 p-2 transition", isOver && "bg-hover ring-2 ring-accent/20")}
    >
      <div className="flex items-center gap-2 px-1.5 pb-2 pt-1">
        <span className={cn("h-2 w-2 rounded-full", c.dot)} />
        <span className="truncate text-[13px] font-medium">{status?.name ?? "No status"}</span>
        <span className="text-[12px] text-ink-faint">{count}</span>
      </div>
      <div className="flex min-h-24 flex-col gap-2">{children}</div>
    </div>
  );
}

export function LeadBoard({ leads, statuses, today }: { leads: Lead[]; statuses: LeadStatus[]; today: string }) {
  const router = useRouter();
  const { build } = useLeadUrl();
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const justDragged = useRef(false);
  const [optimistic, move] = useOptimistic(leads, (state, m: { id: string; statusId: string }) =>
    state.map((l) => {
      if (l.id !== m.id) return l;
      const s = statuses.find((x) => x.id === m.statusId);
      return { ...l, status_id: m.statusId, lead_statuses: s ? { name: s.name, color: s.color, kind: s.kind } : l.lead_statuses };
    }),
  );
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const markDragged = () => {
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 250);
  };
  const open = (id: string) => {
    if (!justDragged.current) router.push(build({ lead: id }), { scroll: false });
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    markDragged();
    const id = String(e.active.id);
    const to = e.over?.id ? String(e.over.id) : null;
    const lead = optimistic.find((l) => l.id === id);
    if (!to || to === "none" || !lead || lead.status_id === to) return;
    startTransition(async () => {
      move({ id, statusId: to });
      await setLeadStatus(id, to);
    });
  };

  const noStatus = optimistic.filter((l) => !l.status_id || !statuses.some((s) => s.id === l.status_id));
  const active = optimistic.find((l) => l.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragCancel={() => {
        setActiveId(null);
        markDragged();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-4 md:mx-0 md:px-0">
        {noStatus.length > 0 && (
          <StatusColumn id="none" status={null} count={noStatus.length}>
            {noStatus.map((l) => (
              <LeadCard key={l.id} lead={l} today={today} showClient={false} onOpen={() => open(l.id)} />
            ))}
          </StatusColumn>
        )}
        {statuses.map((s) => {
          const col = optimistic.filter((l) => l.status_id === s.id);
          return (
            <StatusColumn key={s.id} id={s.id} status={s} count={col.length}>
              {col.map((l) => (
                <LeadCard key={l.id} lead={l} today={today} showClient={false} onOpen={() => open(l.id)} />
              ))}
            </StatusColumn>
          );
        })}
      </div>
      <DragOverlay>
        {active && (
          <div className="w-[254px] rotate-1 rounded-lg border border-line-strong bg-surface px-3 py-2.5 shadow-xl">
            <LeadCardBody lead={active} today={today} showClient={false} />
          </div>
        )}
      </DragOverlay>
      <p className="mt-1 text-[12px] text-ink-faint">
        Drag leads between stages. On a phone, press and hold a card first.
      </p>
    </DndContext>
  );
}
