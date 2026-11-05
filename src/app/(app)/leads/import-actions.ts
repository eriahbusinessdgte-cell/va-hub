"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeUrl } from "@/lib/clients";
import { duplicateKey, type ImportRow } from "@/lib/lead-import";

/** Adds any status names that don't exist yet for this client (as open stages). */
export async function ensureStatuses(clientId: string, names: string[]) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("lead_statuses")
    .select("name, sort_order")
    .eq("client_id", clientId)
    .order("sort_order");
  const have = new Set((existing ?? []).map((s) => s.name.toLowerCase()));
  const missing = [...new Map(names.map((n) => [n.trim().toLowerCase(), n.trim()])).values()].filter(
    (n) => n && !have.has(n.toLowerCase()),
  );
  if (missing.length === 0) return 0;
  const start = (existing?.at(-1)?.sort_order ?? -1) + 1;
  await supabase
    .from("lead_statuses")
    .insert(missing.map((name, i) => ({ client_id: clientId, name, color: "gray", kind: "open", sort_order: start + i })));
  return missing.length;
}

/**
 * Imports one batch of leads. Called several times for big files.
 * Duplicates (same email, or same name + company) can be skipped,
 * including duplicates that appear twice in the same file.
 */
export async function importLeadBatch(
  clientId: string,
  rows: ImportRow[],
  skipDuplicates: boolean,
): Promise<{ imported: number; skipped: number; error?: string }> {
  const supabase = await createClient();

  const [{ data: statuses }, { data: existing }] = await Promise.all([
    supabase.from("lead_statuses").select("id, name, kind, sort_order").eq("client_id", clientId).order("sort_order"),
    skipDuplicates
      ? supabase.from("leads").select("name, company, email").eq("client_id", clientId).limit(20000)
      : Promise.resolve({ data: [] as { name: string; company: string | null; email: string | null }[] }),
  ]);

  const statusByName = new Map((statuses ?? []).map((s) => [s.name.toLowerCase(), s.id]));
  const defaultStatus = (statuses ?? []).find((s) => s.kind === "open")?.id ?? statuses?.[0]?.id ?? null;
  const seen = new Set((existing ?? []).map(duplicateKey));

  let skipped = 0;
  const toInsert = [];
  for (const r of rows) {
    if (!r.name?.trim()) {
      skipped++;
      continue;
    }
    const key = duplicateKey(r);
    if (skipDuplicates && seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    toInsert.push({
      client_id: clientId,
      name: r.name.trim().slice(0, 300),
      company: r.company,
      email: r.email,
      phone: r.phone,
      website: r.website ? normalizeUrl(r.website) : null,
      social_url: r.social_url ? (/^[@\w.]+$/.test(r.social_url) && !r.social_url.includes(".") ? r.social_url : normalizeUrl(r.social_url)) : null,
      source: r.source,
      status_id: (r.status && statusByName.get(r.status.trim().toLowerCase())) || defaultStatus,
      date_contacted: r.date_contacted,
      follow_up_date: r.follow_up_date,
      next_action: r.next_action,
      notes: r.notes,
    });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("leads").insert(toInsert);
    if (error) return { imported: 0, skipped, error: "Some leads couldn't be saved. Please check the file and try again." };
  }
  revalidatePath("/", "layout");
  return { imported: toInsert.length, skipped };
}
