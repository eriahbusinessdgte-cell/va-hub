import { ClientForm } from "@/components/client-form";
import { PageHeader } from "@/components/page-header";
import { createClientAction } from "../actions";

export const metadata = { title: "New client" };

export default function NewClientPage() {
  return (
    <>
      <PageHeader title="New client" description="You can add projects, tasks and leads once the client is created." />
      <ClientForm action={createClientAction} cancelHref="/clients" submitLabel="Create client" />
    </>
  );
}
