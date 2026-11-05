import { NextResponse } from "next/server";
import { toCSV } from "@/lib/csv";

/** An example CSV showing the columns the importer understands. */
export async function GET() {
  const csv = toCSV([
    ["Name", "Company", "Email", "Phone", "Website", "Social profile", "Source", "Status", "Date contacted", "Follow-up date", "Next action", "Notes"],
    ["Jane Smith", "Smith Coaching", "jane@example.com", "+1 555 0100", "smithcoaching.com", "instagram.com/janesmith", "Instagram", "Contacted", "2026-11-03", "2026-11-10", "Send follow-up DM", "Liked 3 posts this week"],
  ]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="va-hub-leads-template.csv"',
    },
  });
}
