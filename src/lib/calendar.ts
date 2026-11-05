import { createClient } from "@/lib/supabase/server";
import { normaliseTask } from "@/lib/tasks";
import { getActiveClients } from "@/lib/workspace";

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
  let taskQ = supabase
    .from("tasks")
    .select("id, title, status, priority, due_date, client_id, clients(name), projects(name)")
    .gte("due_date", start)
    .lte("due_date", end)
    .limit(2000);
  let projectQ = supabase
    .from("projects")
    .select("id, name, status, priority, due_date, client_id")
    .is("archived_at", null)
    .gte("due_date", start)
    .lte("due_date", end);
  let leadQ = supabase
    .from("leads")
    .select("id, name, company, follow_up_date, client_id, lead_statuses(kind)")
    .is("archived_at", null)
    .gte("follow_up_date", start)
    .lte("follow_up_date", end)
    .limit(2000);
  if (opts.clientId) {
    taskQ = taskQ.eq("client_id", opts.clientId);
    projectQ = projectQ.eq("client_id", opts.clientId);
    leadQ = leadQ.eq("client_id", opts.clientId);
  }
  const none = Promise.resolve({ data: [] as unknown[] });

  // Everything in parallel; archived clients are filtered out afterwards
  const [clients, tasks, projects, leads] = await Promise.all([
    getActiveClients(),
    opts.kinds.has("task") ? taskQ : none,
    opts.kinds.has("project") ? projectQ : none,
    opts.kinds.has("followup") ? leadQ : none,
  ]);
  const nameOf = new Map(clients.map((c) => [c.id, c.name]));
  const isActive = (row: { client_id: string }) => nameOf.has(row.client_id);

  const items: CalendarItem[] = [];
  for (const raw of ((tasks.data ?? []) as { client_id: string }[]).filter(isActive) as unknown[]) {
    const t = normaliseTask(raw as { clients: unknown; projects: unknown } & Record<string, string>) as unknown as {
      id: string; title: string; status: string; priority: string; due_date: string; client_id: string;
    };
    items.push({
      key: `t-${t.id}`, date: t.due_date, kind: "task", id: t.id, title: t.title,
      client: nameOf.get(t.client_id) ?? "", done: t.status === "done", urgent: t.priority === "urgent" || t.priority === "high",
    });
  }
  for (const p of ((projects.data ?? []) as { id: string; name: string; status: string; priority: string; due_date: string; client_id: string }[]).filter(isActive)) {
    items.push({
      key: `p-${p.id}`, date: p.due_date, kind: "project", id: p.id, title: p.name,
      client: nameOf.get(p.client_id) ?? "", done: p.status === "completed", urgent: p.priority === "urgent" || p.priority === "high",
    });
  }
  for (const l of ((leads.data ?? []) as { id: string; name: string; company: string | null; follow_up_date: string; client_id: string; lead_statuses: { kind: string } | { kind: string }[] | null }[]).filter(isActive)) {
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
