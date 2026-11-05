"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useActionState, useContext, useEffect, useRef, useState, useTransition } from "react";
import {
  Briefcase,
  CalendarDays,
  CheckSquare,
  CornerDownLeft,
  FolderKanban,
  Home,
  Loader2,
  Plus,
  Search,
  Settings,
  Target,
  X,
} from "lucide-react";
import { searchEverything, type SearchResult } from "@/app/(app)/search-actions";
import { createTaskAction } from "@/app/(app)/tasks/actions";
import { quickAddLead } from "@/app/(app)/leads/actions";
import { PRIORITIES } from "@/lib/projects";
import { cn } from "@/lib/utils";

type Ctx = { openSearch: () => void; openQuickAdd: (tab?: "task" | "lead") => void };
const GlobalUI = createContext<Ctx>({ openSearch: () => {}, openQuickAdd: () => {} });
export const useGlobalUI = () => useContext(GlobalUI);

type ClientOption = { id: string; name: string };

const KIND = {
  client: { label: "Clients", icon: Briefcase },
  project: { label: "Projects", icon: FolderKanban },
  task: { label: "Tasks", icon: CheckSquare },
  lead: { label: "Leads", icon: Target },
} as const;

function Modal({ onClose, children, label }: { onClose: () => void; children: React.ReactNode; label: string }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label={label}>
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/25" />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">{children}</div>
    </div>
  );
}

// ---------------- Search (⌘K) ----------------

function SearchPalette({ onClose, onQuickAdd }: { onClose: () => void; onQuickAdd: (tab: "task" | "lead") => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);
  const [loading, startLoading] = useTransition();

  // Shortcuts shown before you type
  const shortcuts: { title: string; href?: string; action?: () => void; icon: typeof Home }[] = [
    { title: "New task", action: () => onQuickAdd("task"), icon: Plus },
    { title: "New lead", action: () => onQuickAdd("lead"), icon: Plus },
    { title: "Home", href: "/", icon: Home },
    { title: "My Tasks", href: "/tasks", icon: CheckSquare },
    { title: "Calendar", href: "/calendar", icon: CalendarDays },
    { title: "All Leads", href: "/leads", icon: Target },
    { title: "Clients", href: "/clients", icon: Briefcase },
    { title: "Settings", href: "/settings", icon: Settings },
  ];

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const t = setTimeout(() => {
      startLoading(async () => {
        const r = await searchEverything(term);
        setResults(r);
        setActive(0);
      });
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const searching = q.trim().length >= 2;
  const count = searching ? results.length : shortcuts.length;

  const go = (i: number) => {
    if (searching) {
      const r = results[i];
      if (!r) return;
      onClose();
      router.push(r.href);
    } else {
      const s = shortcuts[i];
      if (s.action) s.action();
      else if (s.href) {
        onClose();
        router.push(s.href);
      }
    }
  };

  // Group results by type, keeping a running index for keyboard selection
  let index = -1;
  const groups = (Object.keys(KIND) as (keyof typeof KIND)[])
    .map((k) => ({ kind: k, items: results.filter((r) => r.kind === k) }))
    .filter((g) => g.items.length > 0);

  return (
    <Modal onClose={onClose} label="Search">
      <div className="flex items-center gap-3 border-b border-line px-4">
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-ink-faint" /> : <Search className="h-4 w-4 text-ink-faint" />}
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (e.target.value.trim().length < 2) setResults([]);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, count - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(active);
            }
          }}
          placeholder="Search clients, projects, tasks and leads…"
          className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-faint"
        />
        <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-ink-faint hover:bg-hover hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[55vh] overflow-y-auto p-2">
        {!searching && (
          <ul>
            {shortcuts.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.title}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(i)}
                    className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm", active === i ? "bg-hover" : "")}
                  >
                    <Icon className="h-4 w-4 text-ink-muted" />
                    {s.title}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {searching && !loading && results.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-ink-faint">No matches for &ldquo;{q.trim()}&rdquo;.</p>
        )}

        {searching &&
          groups.map((g) => {
            const Icon = KIND[g.kind].icon;
            return (
              <div key={g.kind} className="mb-1">
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{KIND[g.kind].label}</p>
                <ul>
                  {g.items.map((r) => {
                    index++;
                    const i = index;
                    return (
                      <li key={`${r.kind}-${r.id}`}>
                        <button
                          onMouseEnter={() => setActive(i)}
                          onClick={() => go(i)}
                          className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left", active === i ? "bg-hover" : "")}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-ink-muted" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{r.title}</span>
                            {r.subtitle && <span className="block truncate text-[12px] text-ink-muted">{r.subtitle}</span>}
                          </span>
                          {active === i && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-ink-faint" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
      </div>

      <div className="hidden items-center gap-4 border-t border-line px-4 py-2 text-[11.5px] text-ink-faint sm:flex">
        <span>↑↓ to move</span>
        <span>Enter to open</span>
        <span>Esc to close</span>
      </div>
    </Modal>
  );
}

// ---------------- Quick Add ----------------

function QuickAddDialog({
  initialTab,
  clients,
  today,
  onClose,
}: {
  initialTab: "task" | "lead";
  clients: ClientOption[];
  today: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const [taskState, taskAction, taskPending] = useActionState(createTaskAction, undefined);
  const [leadState, leadAction, leadPending] = useActionState(quickAddLead, undefined);
  const [added, setAdded] = useState<{ title: string; href: string } | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const handled = useRef<unknown>(null);

  useEffect(() => {
    if (taskState?.ok && taskState.id && handled.current !== taskState) {
      handled.current = taskState;
      setAdded({ title: "Task added", href: `/tasks?view=all&task=${taskState.id}` });
      titleRef.current?.focus();
    }
  }, [taskState]);

  useEffect(() => {
    // A new lead opens straight away so the details can be filled in
    if (leadState?.ok && leadState.id && handled.current !== leadState) {
      handled.current = leadState;
      onClose();
      router.push(`/leads?lead=${leadState.id}`);
    }
  }, [leadState, onClose, router]);

  const tabBtn = (t: "task" | "lead", label: string) => (
    <button
      type="button"
      onClick={() => {
        setTab(t);
        setAdded(null);
      }}
      className={cn("rounded-md px-3 py-1.5 text-[13px] transition", tab === t ? "bg-surface font-medium shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-muted hover:text-ink")}
    >
      {label}
    </button>
  );

  return (
    <Modal onClose={onClose} label="Quick add">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex gap-1 rounded-lg bg-hover p-1">
          {tabBtn("task", "Task")}
          {tabBtn("lead", "Lead")}
        </div>
        <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-ink-faint hover:bg-hover hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>

      {tab === "task" ? (
        <form action={taskAction} className="space-y-4 p-5">
          <input
            ref={titleRef}
            name="title"
            autoFocus
            required
            placeholder="What needs to be done?"
            onChange={() => setAdded(null)}
            className="w-full bg-transparent text-[16px] font-medium outline-none placeholder:text-ink-faint"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="label">Client</span>
              <select name="client_id" defaultValue={clients[0]?.id} className="input py-1.5">
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Due</span>
              <input name="due_date" type="date" defaultValue={today} className="input py-1.5" />
            </label>
            <label className="block">
              <span className="label">Priority</span>
              <select name="priority" defaultValue="medium" className="input py-1.5">
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={taskPending} className="btn-primary">
              {taskPending ? "Adding…" : "Add task"}
            </button>
            {added && (
              <span className="text-[13px] text-success">
                ✓ {added.title}.{" "}
                <Link href={added.href} onClick={onClose} className="underline">Open it</Link>
              </span>
            )}
            {taskState?.error && <span className="text-[13px] text-danger">{taskState.error}</span>}
          </div>
          <p className="text-[12px] text-ink-faint">Add a project, notes or checklist by opening the task afterwards.</p>
        </form>
      ) : (
        <form action={leadAction} className="space-y-4 p-5">
          <input
            name="name"
            autoFocus
            required
            placeholder="Lead's name"
            className="w-full bg-transparent text-[16px] font-medium outline-none placeholder:text-ink-faint"
          />
          <label className="block sm:w-1/2">
            <span className="label">For client</span>
            <select name="client_id" defaultValue={clients[0]?.id} className="input py-1.5">
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={leadPending} className="btn-primary">
              {leadPending ? "Adding…" : "Add lead & fill in details"}
            </button>
            {leadState?.error && <span className="text-[13px] text-danger">{leadState.error}</span>}
          </div>
        </form>
      )}
    </Modal>
  );
}

// ---------------- Provider ----------------

export function GlobalUIProvider({
  clients,
  today,
  children,
}: {
  clients: ClientOption[];
  today: string;
  children: React.ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState<null | "task" | "lead">(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuickAdd(null);
        setSearchOpen((o) => !o);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
        setQuickAdd(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ctx: Ctx = {
    openSearch: () => {
      setQuickAdd(null);
      setSearchOpen(true);
    },
    openQuickAdd: (tab = "task") => {
      setSearchOpen(false);
      setQuickAdd(tab);
    },
  };

  return (
    <GlobalUI.Provider value={ctx}>
      {children}
      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} onQuickAdd={(t) => ctx.openQuickAdd(t)} />}
      {quickAdd && (
        <QuickAddDialog initialTab={quickAdd} clients={clients} today={today} onClose={() => setQuickAdd(null)} />
      )}
    </GlobalUI.Provider>
  );
}
