import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { todayIn } from "@/lib/dates";

/**
 * The logged-in person (verified from the login token, without an extra
 * network call when possible). Loaded once per request.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub as string, email: (claims.email as string | undefined) ?? "" };
});

/** Workspace name, time zone and today's date there. Loaded once per request. */
export const getWorkspace = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("workspaces").select("name, timezone").limit(1).maybeSingle();
  const timezone = data?.timezone ?? "UTC";
  return { name: data?.name ?? "VA Hub", timezone, today: todayIn(timezone) };
});

/** The workspace's time zone and today's date there (loaded once per request). */
export const getWorkspaceToday = cache(async () => {
  const { timezone, today } = await getWorkspace();
  return { timezone, today };
});

/** Active (not archived) clients, loaded once per request and shared by the page and sidebar. */
export const getActiveClients = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, status, is_internal")
    .is("archived_at", null)
    .order("is_internal", { ascending: false })
    .order("name");
  return data ?? [];
});
