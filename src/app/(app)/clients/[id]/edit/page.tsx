import { notFound } from "next/navigation";
import { ClientForm } from "@/components/client-form";
import { updateClientAction } from "../../actions";
import { getClient } from "../data";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  return (
    <ClientForm
      action={updateClientAction}
      client={client}
      cancelHref={`/clients/${id}`}
      submitLabel="Save changes"
    />
  );
}
