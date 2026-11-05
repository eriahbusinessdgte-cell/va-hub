import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { todayIn } from "@/lib/dates";

/** The workspace's time zone and today's date there (loaded once per request). */
export const getWorkspaceToday = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("workspaces").select("timezone").limit(1).maybeSingle();
  const timezone = data?.timezone ?? "UTC";
  return { timezone, today: todayIn(timezone) };
});
