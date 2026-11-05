import { ComingSoon, PageHeader } from "@/components/page-header";

export const metadata = { title: "My Tasks" };

export default function MyTasksPage() {
  return (
    <>
      <PageHeader title="My Tasks" description="Everything on your plate, across all clients." />
      <ComingSoon phase="Phase 3">
        Your tasks from every client will show here, with Today, Upcoming and Overdue tabs and
        list, board and calendar views.
      </ComingSoon>
    </>
  );
}
