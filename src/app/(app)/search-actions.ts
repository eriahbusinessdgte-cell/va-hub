"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  kind: "client" | "project" | "task" | "lead";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

/** Searches clients, projects, tasks and leads at once (only your own data). */
export async function searchEverything(raw: string): Promise<SearchResult[]> {
  const q = raw.trim().replace(/[%,()*\\]/g, " ").slice(0, 100);
  if (q.length < 2) return [];
  const like = `%${q}%`;
  const supabase = await createClient();

  const [clients, projects, tasks, leads] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, business_name, archived_at")
      .or(`name.ilike.${like},business_name.ilike.${like},contact_name.ilike.${like},email.ilike.${like}`)
      .limit(6),
    supabase.from("projects").select("id, name, status, clients(name)").ilike("name", like).limit(6),
    supabase
      .from("tasks")
      .select("id, title, status, due_date, clients(name), projects(name)")
      .or(`title.ilike.${like},description.ilike.${like}`)
      .order("status")
      .limit(8),
    supabase
      .from("leads")
      .select("id, name, company, email, clients(name)")
      .or(`name.ilike.${like},company.ilike.${like},email.ilike.${like},social_url.ilike.${like}`)
      .limit(8),
  ]);

  const one = (v: unknown) => (Array.isArray(v) ? v[0] : v) as { name: string } | null | undefined;
  const results: SearchResult[] = [];

  for (const c of clients.data ?? []) {
    results.push({
      kind: "client",
      id: c.id,
      title: c.name,
      subtitle: [c.business_name, c.archived_at ? "Archived" : null].filter(Boolean).join(" · ") || "Client",
      href: `/clients/${c.id}`,
    });
  }
  for (const p of projects.data ?? []) {
    results.push({
      kind: "project",
      id: p.id,
      title: p.name,
      subtitle: [one(p.clients)?.name, p.status === "completed" ? "Completed" : null].filter(Boolean).join(" · "),
      href: `/projects/${p.id}`,
    });
  }
  for (const t of tasks.data ?? []) {
    results.push({
      kind: "task",
      id: t.id,
      title: t.title,
      subtitle: [one(t.clients)?.name, one(t.projects)?.name, t.status === "done" ? "Done" : null].filter(Boolean).join(" › "),
      href: `/tasks?view=${t.status === "done" ? "done" : "all"}&task=${t.id}`,
    });
  }
  for (const l of leads.data ?? []) {
    results.push({
      kind: "lead",
      id: l.id,
      title: l.name,
      subtitle: [one(l.clients)?.name, l.company ?? l.email].filter(Boolean).join(" · "),
      href: `/leads?lead=${l.id}`,
    });
  }
  return results;
}
