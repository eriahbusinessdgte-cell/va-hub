import { NextResponse } from "next/server";
import { strToU8, zipSync } from "fflate";
import { createClient } from "@/lib/supabase/server";
import { toCSV } from "@/lib/csv";
import { getSessionUser, getWorkspaceToday } from "@/lib/workspace";

const TABLES = [
  "workspaces",
  "clients",
  "client_links",
  "projects",
  "tasks",
  "checklist_items",
  "lead_statuses",
  "leads",
] as const;

/** Reads every row of a table, 1,000 at a time. */
async function readAll(supabase: Awaited<ReturnType<typeof createClient>>, table: string) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select("*").order("created_at").range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

/**
 * Full backup: a ZIP with one spreadsheet (CSV) per table plus a complete
 * backup.json. Only your own data is included (the database's security rules apply).
 */
export async function GET() {
  const supabase = await createClient();
  if (!(await getSessionUser())) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { today } = await getWorkspaceToday();
  const files: Record<string, Uint8Array> = {};
  const json: Record<string, unknown> = { exported_at: new Date().toISOString(), app: "VA Hub", version: 1 };

  try {
    for (const table of TABLES) {
      const rows = await readAll(supabase, table);
      json[table] = rows;
      const columns = rows.length ? Object.keys(rows[0]) : [];
      const cell = (v: unknown) => (v !== null && typeof v === "object" ? JSON.stringify(v) : (v as string | number | boolean | null));
      files[`${table}.csv`] = strToU8(toCSV([columns, ...rows.map((r) => columns.map((c) => cell(r[c])))]));
    }
  } catch {
    return NextResponse.json({ error: "Backup failed. Please try again." }, { status: 500 });
  }

  files["backup.json"] = strToU8(JSON.stringify(json, null, 2));
  files["README.txt"] = strToU8(
    `VA Hub backup, ${today}\n\nEach .csv file opens in Excel or Google Sheets.\nbackup.json contains everything in one file, for restoring later.\n`,
  );

  const zip = zipSync(files, { level: 6 });
  return new NextResponse(Buffer.from(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="va-hub-backup-${today}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
