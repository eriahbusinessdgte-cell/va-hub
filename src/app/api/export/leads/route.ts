import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCSV } from "@/lib/csv";
import { filterLeads, LEAD_FIELDS, normaliseLead, sortLeads, type Lead } from "@/lib/leads";
import { getWorkspaceToday } from "@/lib/workspace";

/** Downloads leads as CSV. Uses the same filters as the screen (client, search, status, …). */
export async function GET(request: NextRequest) {
  const sp = Object.fromEntries(request.nextUrl.searchParams.entries());
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  let query = supabase.from("leads").select(LEAD_FIELDS).is("archived_at", null).limit(20000);
  if (sp.client) query = query.eq("client_id", sp.client);
  const [{ data }, { today }] = await Promise.all([query, getWorkspaceToday()]);
  const leads = sortLeads(filterLeads(((data ?? []) as unknown as Lead[]).map(normaliseLead), sp, today), sp.sort);

  const rows = [
    ["Name", "Company", "Email", "Phone", "Website", "Social profile", "Source", "Status", "Date contacted", "Follow-up date", "Next action", "Notes", "Client", "Added"],
    ...leads.map((l) => [
      l.name, l.company, l.email, l.phone, l.website, l.social_url, l.source, l.lead_statuses?.name ?? "",
      l.date_contacted, l.follow_up_date, l.next_action, l.notes, l.clients?.name ?? "", l.created_at.slice(0, 10),
    ]),
  ];

  const label = sp.client && leads[0]?.clients?.name ? leads[0].clients.name : "all-clients";
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new NextResponse(toCSV(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${slug}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
