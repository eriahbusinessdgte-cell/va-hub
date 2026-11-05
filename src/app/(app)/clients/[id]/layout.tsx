import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ClientActions } from "@/components/client-actions";
import { ClientTabs } from "@/components/client-tabs";
import { ClientStatusBadge } from "@/components/status-badge";
import { getClient } from "./data";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(id);
  return { title: client?.name ?? "Client" };
}

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  return (
    <>
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink">
        <ChevronLeft className="h-3.5 w-3.5" /> Clients
      </Link>

      {client.archived_at && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800">
          This client is archived. Everything is kept. Restore them to bring them back to your sidebar.
        </div>
      )}

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[26px] font-semibold tracking-tight">{client.name}</h1>
            <ClientStatusBadge status={client.status} />
          </div>
          {client.business_name && <p className="mt-1 text-sm text-ink-muted">{client.business_name}</p>}
        </div>
        <ClientActions
          id={client.id}
          name={client.name}
          archived={!!client.archived_at}
          isInternal={client.is_internal}
        />
      </header>

      <ClientTabs id={client.id} />
      {children}
    </>
  );
}
