"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CLIENT_STATUSES, normalizeUrl } from "@/lib/clients";

export type ClientFormState = { error?: string } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

function readClientFields(formData: FormData) {
  const status = String(formData.get("status") ?? "active");
  return {
    name: str(formData, "name"),
    business_name: str(formData, "business_name"),
    contact_name: str(formData, "contact_name"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    website: normalizeUrl(String(formData.get("website") ?? "")),
    start_date: str(formData, "start_date"),
    status: CLIENT_STATUSES.some((s) => s.value === status) ? status : "active",
    notes: str(formData, "notes"),
  };
}

function validate(fields: ReturnType<typeof readClientFields>): string | null {
  if (!fields.name) return "Client name is required.";
  if (fields.email && !EMAIL_RE.test(fields.email)) return "That email address doesn't look right.";
  return null;
}

/** Refresh every page that shows clients (sidebar, lists, dashboard). */
function refresh() {
  revalidatePath("/", "layout");
}

export async function createClientAction(_: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const fields = readClientFields(formData);
  const problem = validate(fields);
  if (problem) return { error: problem };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "You're logged out. Please log in again." };

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", auth.user.id)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();
  if (!membership) return { error: "Only the workspace owner can add clients." };

  const { data, error } = await supabase
    .from("clients")
    .insert({ ...fields, workspace_id: membership.workspace_id })
    .select("id")
    .single();
  if (error || !data) return { error: "Couldn't save the client. Please try again." };

  refresh();
  redirect(`/clients/${data.id}`);
}

export async function updateClientAction(_: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const id = String(formData.get("id") ?? "");
  const fields = readClientFields(formData);
  const problem = validate(fields);
  if (problem) return { error: problem };

  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(fields).eq("id", id);
  if (error) return { error: "Couldn't save changes. Please try again." };

  refresh();
  redirect(`/clients/${id}`);
}

export async function archiveClient(id: string) {
  const supabase = await createClient();
  await supabase.from("clients").update({ archived_at: new Date().toISOString() }).eq("id", id).eq("is_internal", false);
  refresh();
}

export async function restoreClient(id: string) {
  const supabase = await createClient();
  await supabase.from("clients").update({ archived_at: null }).eq("id", id);
  refresh();
}

export async function deleteClient(id: string) {
  const supabase = await createClient();
  // "My Business" is protected; everything else (projects, tasks, leads) goes with the client.
  await supabase.from("clients").delete().eq("id", id).eq("is_internal", false);
  refresh();
  redirect("/clients");
}

export async function addClientLink(
  clientId: string,
  _: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const label = String(formData.get("label") ?? "").trim();
  const url = normalizeUrl(String(formData.get("url") ?? ""));
  if (!label || !url) return { error: "Add both a name and a link." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("client_links")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);
  const { error } = await supabase
    .from("client_links")
    .insert({ client_id: clientId, label, url, sort_order: count ?? 0 });
  if (error) return { error: "Couldn't add the link." };

  revalidatePath(`/clients/${clientId}`);
  return {};
}

export async function deleteClientLink(clientId: string, linkId: string) {
  const supabase = await createClient();
  await supabase.from("client_links").delete().eq("id", linkId);
  revalidatePath(`/clients/${clientId}`);
}
