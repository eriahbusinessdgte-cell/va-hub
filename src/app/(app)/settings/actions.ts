"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; message?: string } | undefined;

export async function saveSettings(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const workspaceName = String(formData.get("workspace_name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "");

  if (!workspaceName) return { error: "Workspace name can't be empty." };
  if (!Intl.supportedValuesOf("timeZone").includes(timezone) && timezone !== "UTC") {
    return { error: "Please choose a valid time zone." };
  }

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
  if (!membership) return { error: "Only the workspace owner can change these settings." };

  const [p, w] = await Promise.all([
    supabase.from("profiles").update({ full_name: fullName || null }).eq("id", auth.user.id),
    supabase
      .from("workspaces")
      .update({ name: workspaceName, timezone })
      .eq("id", membership.workspace_id),
  ]);
  if (p.error || w.error) return { error: "Couldn't save. Please try again." };

  revalidatePath("/", "layout");
  return { message: "Saved." };
}
