"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  addLeadStatus,
  deleteLeadStatus,
  reorderLeadStatuses,
  updateLeadStatus,
} from "@/app/(app)/leads/actions";
import { colorOf, STATUS_COLORS, type LeadStatus } from "@/lib/leads";
import { cn } from "@/lib/utils";

const KINDS = [
  { value: "open", label: "Open (in progress)" },
  { value: "won", label: "Won (closed)" },
  { value: "lost", label: "Lost (closed)" },
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(STATUS_COLORS).map(([key, c]) => (
        <button
          key={key}
          type="button"
          title={c.label}
          aria-label={c.label}
          onClick={() => onChange(key)}
          className={cn("h-5 w-5 rounded-full ring-offset-2 transition", c.dot, value === key ? "ring-2 ring-ink" : "hover:scale-110")}
        />
      ))}
    </div>
  );
}

function Row({
  status,
  others,
  counts,
  isFirst,
  isLast,
  onMove,
}: {
  status: LeadStatus;
  others: LeadStatus[];
  counts: number;
  isFirst: boolean;
  isLast: boolean;
  onMove: (dir: -1 | 1) => void;
}) {
  const [pending, start] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? "");

  return (
    <li className="border-b border-line px-4 py-3.5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col">
          <button type="button" disabled={isFirst || pending} onClick={() => onMove(-1)} aria-label="Move up" className="rounded p-0.5 text-ink-faint hover:text-ink disabled:opacity-30">
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" disabled={isLast || pending} onClick={() => onMove(1)} aria-label="Move down" className="rounded p-0.5 text-ink-faint hover:text-ink disabled:opacity-30">
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", colorOf(status.color).dot)} />
        <input
          defaultValue={status.name}
          aria-label="Status name"
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== status.name) start(() => updateLeadStatus(status.id, { name: v }));
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="input w-44 py-1.5"
        />
        <select
          value={status.kind}
          onChange={(e) => start(() => updateLeadStatus(status.id, { kind: e.target.value }))}
          aria-label="Type"
          className="input w-auto py-1.5 text-[13px]"
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
        <ColorPicker value={status.color} onChange={(c) => start(() => updateLeadStatus(status.id, { color: c }))} />
        <span className="ml-auto text-[12px] text-ink-faint">{counts} lead{counts === 1 ? "" : "s"}</span>
        <button type="button" onClick={() => setDeleting(true)} aria-label="Delete status" className="rounded p-1 text-ink-faint hover:text-danger">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {deleting && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-danger/5 px-3 py-2.5 text-[13px]">
          <span>Delete &ldquo;{status.name}&rdquo;?</span>
          {counts > 0 && others.length > 0 && (
            <>
              <span className="text-ink-muted">Move its {counts} lead{counts === 1 ? "" : "s"} to</span>
              <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="input w-auto py-1 text-[13px]">
                {others.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => start(() => deleteLeadStatus(status.id, counts > 0 ? moveTo || null : null))}
            className="btn bg-danger px-2.5 py-1 text-white hover:bg-danger/90"
          >
            Delete
          </button>
          <button type="button" onClick={() => setDeleting(false)} className="btn-ghost px-2.5 py-1">Cancel</button>
        </div>
      )}
    </li>
  );
}

export function StatusManager({
  clientId,
  statuses,
  counts,
}: {
  clientId: string;
  statuses: LeadStatus[];
  counts: Record<string, number>;
}) {
  const [, start] = useTransition();
  const [order, setOrder] = useState(statuses.map((s) => s.id));
  const [name, setName] = useState("");
  const [color, setColor] = useState("blue");
  const [kind, setKind] = useState("open");

  // Keep local order in sync when statuses are added/removed on the server
  const ids = statuses.map((s) => s.id);
  const sameSet = ids.length === order.length && ids.every((id) => order.includes(id));
  const currentOrder = sameSet ? order : ids;
  const byId = new Map(statuses.map((s) => [s.id, s]));
  const ordered = currentOrder.map((id) => byId.get(id)!).filter(Boolean);

  const move = (index: number, dir: -1 | 1) => {
    const next = [...currentOrder];
    const j = index + dir;
    [next[index], next[j]] = [next[j], next[index]];
    setOrder(next);
    start(() => reorderLeadStatuses(next));
  };

  return (
    <div className="space-y-6">
      <ul className="overflow-hidden rounded-xl border border-line bg-surface">
        {ordered.map((s, i) => (
          <Row
            key={s.id}
            status={s}
            others={ordered.filter((o) => o.id !== s.id)}
            counts={counts[s.id] ?? 0}
            isFirst={i === 0}
            isLast={i === ordered.length - 1}
            onMove={(dir) => move(i, dir)}
          />
        ))}
        {ordered.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-faint">No statuses yet.</li>}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const n = name;
          setName("");
          start(() => addLeadStatus(clientId, n, color, kind));
        }}
        className="space-y-3 rounded-xl border border-line bg-surface p-4"
      >
        <p className="text-[13px] font-medium">Add a status</p>
        <div className="flex flex-wrap items-center gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Proposal sent" className="input w-52 py-1.5" />
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="input w-auto py-1.5 text-[13px]">
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
          <ColorPicker value={color} onChange={setColor} />
          <button type="submit" className="btn-primary py-1.5">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </form>
    </div>
  );
}
