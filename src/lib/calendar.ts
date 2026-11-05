import { createClient } from "@/lib/supabase/server";
import { normaliseTask } from "@/lib/tasks";

export * from "@/lib/cal-dates";

// ---------- Calendar items ----------

export type CalendarItem = {
  key: string;
  date: string;
  kind: "task" | "project" | "followup";
  id: string;
  title: string;
  client: string;
  done: boolean;
  urgent: boolean;
};

export async function loadCalendarItems(
  start: string,
  end: string,
  opts: { clientId?: string; kinds: Set<string> },
): Promise<CalendarItem[]> {
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("id, name").is("archived_at", null);
  const ids = (clients ?? []).map((c) => c.id).filter((id) => !opts.clientId || id === opts.clientId);
  const nameOf = new Map((clients ?? []).map((c) => [c.id, c.name]));
  if (ids.length === 0) return [];

  const [tasks, projects, leads] = await Promise.all([
    opts.kinds.has("task")
      ? supabase
          .from("tasks")
          .select("id, title, status, priority, due_date, client_id, clients(name), projects(name)")
          .in("client_id", ids)
          .gte("due_date", start)
          .lte("due_date", end)
          .limit(2000)
      : Promise.resolve({ data: [] }),
    opts.kinds.has("project")
      ? supabase
          .from("projects")
          .select("id, name, status, priority, due_date, client_id")
          .in("client_id", ids)
          .is("archived_at", null)
          .gte("due_date", start)
          .lte("due_date", end)
      : Promise.resolve({ data: [] }),
    opts.kinds.has("followup")
      ? supabase
          .from("leads")
          .select("id, name, company, follow_up_date, client_id, lead_statuses(kind)")
          .in("client_id", ids)
          .is("archived_at", null)
          .gte("follow_up_date", start)
          .lte("follow_up_date", end)
          .limit(2000)
      : Promise.resolve({ data: [] }),
  ]);

  const items: CalendarItem[] = [];
  for (const raw of (tasks.data ?? []) as unknown[]) {
    const t = normaliseTask(raw as { clients: unknown; projects: unknown } & Record<string, string>) as unknown as {
      id: string; title: string; status: string; priority: string; due_date: string; client_id: string;
    };
    items.push({
      key: `t-${t.id}`, date: t.due_date, kind: "task", id: t.id, title: t.title,
      client: nameOf.get(t.client_id) ?? "", done: t.status === "done", urgent: t.priority === "urgent" || t.priority === "high",
    });
  }
  for (const p of (projects.data ?? []) as { id: string; name: string; status: string; priority: string; due_date: string; client_id: string }[]) {
    items.push({
      key: `p-${p.id}`, date: p.due_date, kind: "project", id: p.id, title: p.name,
      client: nameOf.get(p.client_id) ?? "", done: p.status === "completed", urgent: p.priority === "urgent" || p.priority === "high",
    });
  }
  for (const l of (leads.data ?? []) as { id: string; name: string; company: string | null; follow_up_date: string; client_id: string; lead_statuses: { kind: string } | { kind: string }[] | null }[]) {
    const status = Array.isArray(l.lead_statuses) ? l.lead_statuses[0] : l.lead_statuses;
    if (status?.kind === "won" || status?.kind === "lost") continue; // closed leads don't need follow-up
    items.push({
      key: `l-${l.id}`, date: l.follow_up_date, kind: "followup", id: l.id, title: l.company ? `${l.name} (${l.company})` : l.name,
      client: nameOf.get(l.client_id) ?? "", done: false, urgent: false,
    });
  }

  const order = { project: 0, task: 1, followup: 2 } as const;
  return items.sort((a, b) =>
    a.date !== b.date ? a.date.localeCompare(b.date) : a.done !== b.done ? (a.done ? 1 : -1) : order[a.kind] - order[b.kind] || a.title.localeCompare(b.title),
  );
}
