import { ComingSoon, PageHeader } from "@/components/page-header";

export const metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <>
      <PageHeader title="Calendar" description="Tasks, deadlines and follow-ups by day, week or month." />
      <ComingSoon phase="Phase 7">
        Day, week and month views of your tasks, project deadlines and lead follow-ups.
      </ComingSoon>
    </>
  );
}
