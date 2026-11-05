import { ComingSoon, PageHeader } from "@/components/page-header";

export const metadata = { title: "All Leads" };

export default function AllLeadsPage() {
  return (
    <>
      <PageHeader title="All Leads" description="Leads from every client in one place." />
      <ComingSoon phase="Phase 5">
        A searchable table of leads across all clients, with overdue follow-ups highlighted.
      </ComingSoon>
    </>
  );
}
