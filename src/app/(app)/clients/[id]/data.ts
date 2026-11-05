import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/clients";

/** Loads one client once per request, shared by the layout and its tabs. */
export const getClient = cache(async (id: string): Promise<Client | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, business_name, contact_name, email, phone, website, start_date, status, notes, is_internal, archived_at")
    .eq("id", id)
    .maybeSingle();
  return (data as Client | null) ?? null;
});
