"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeUrl } from "@/lib/clients";
import { STATUS_COLORS } from "@/lib/leads";

export type LeadFormState = { error?: string; ok?: boolean; id?: string } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function refresh() {
  revalidatePath("/", "layout");
}

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

/** The client's first "open" status, used for new leads. */
async function defaultStatusId(supabase: Awaited<ReturnType<typeof createClient>>, clientId: string) {
  const { data } = await supabase
    .from("lead_statuses")
    .select("id, kind")
    .eq("client_id", clientId)
    .order("sort_order")
    .limit(20);
  return (data ?? []).find((s) => s.kind === "open")?.id ?? data?.[0]?.id ?? null;
}

/** Quick add: just a name. Returns the new id so its panel can open. */
export async function quickAddLead(_: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const name = str(formData, "name");
  const clientId = str(formData, "client_id");
  if (!name) return { error: "Type the lead's name first." };
  if (!clientId) return { error: "Choose a client for this lead." };

  const supabase = await createClient();
  const statusId = str(formData, "status_id") ?? (await defaultStatusId(supabase, clientId));
  const { data, error } = await supabase
    .from("leads")
    .insert({ name, client_id: clientId, status_id: statusId })
    .select("id")
    .single();
  if (error || !data) return { error: "Couldn't add the lead. Please try again." };

  refresh();
  return { ok: true, id: data.id };
}

/** Saves every field from the lead panel. */
export async function saveLead(_: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const id = String(formData.get("id") ?? "");
  const name = str(formData, "name");
  const email = str(formData, "email");
  if (!name) return { error: "The lead needs a name." };
  if (email && !EMAIL_RE.test(email)) return { error: "That email address doesn't look right." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({
      name,
      company: str(formData, "company"),
      email,
      phone: str(formData, "phone"),
      website: normalizeUrl(String(formData.get("website") ?? "")),
      social_url: normalizeUrl(String(formData.get("social_url") ?? "")),
      source: str(formData, "source"),
      status_id: str(formData, "status_id"),
      date_contacted: str(formData, "date_contacted"),
      follow_up_date: str(formData, "follow_up_date"),
      next_action: str(formData, "next_action"),
      notes: str(formData, "notes"),
    })
    .eq("id", id);
  if (error) return { error: "Couldn't save. Please try again." };

  refresh();
  return { ok: true };
}

export async function setLeadStatus(id: string, statusId: string) {
  const supabase = await createClient();
  await supabase.from("leads").update({ status_id: statusId }).eq("id", id);
  refresh();
}

export async function deleteLead(id: string) {
  const supabase = await createClient();
  await supabase.from("leads").delete().eq("id", id);
  refresh();
}

// ---------- Pipeline statuses (per client) ----------

function validColor(c: string) {
  return c in STATUS_COLORS ? c : "gray";
}
function validKind(k: string) {
  return ["open", "won", "lost"].includes(k) ? k : "open";
}

export async function addLeadStatus(clientId: string, name: string, color: string, kind: string) {
  const clean = name.trim();
  if (!clean) return;
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("lead_statuses")
    .select("sort_order")
    .eq("client_id", clientId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  await supabase.from("lead_statuses").insert({
    client_id: clientId,
    name: clean,
    color: validColor(color),
    kind: validKind(kind),
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  refresh();
}

export async function updateLeadStatus(id: string, fields: { name?: string; color?: string; kind?: string }) {
  const update: Record<string, string> = {};
  if (fields.name !== undefined && fields.name.trim()) update.name = fields.name.trim();
  if (fields.color !== undefined) update.color = validColor(fields.color);
  if (fields.kind !== undefined) update.kind = validKind(fields.kind);
  if (Object.keys(update).length === 0) return;
  const supabase = await createClient();
  await supabase.from("lead_statuses").update(update).eq("id", id);
  refresh();
}

/** Saves a new order for a client's statuses (list of ids, first to last). */
export async function reorderLeadStatuses(ids: string[]) {
  const supabase = await createClient();
  await Promise.all(ids.map((id, i) => supabase.from("lead_statuses").update({ sort_order: i }).eq("id", id)));
  refresh();
}

/** Deletes a status; its leads move to the status you pick. */
export async function deleteLeadStatus(id: string, moveToId: string | null) {
  const supabase = await createClient();
  if (moveToId) await supabase.from("leads").update({ status_id: moveToId }).eq("status_id", id);
  await supabase.from("lead_statuses").delete().eq("id", id);
  refresh();
}
