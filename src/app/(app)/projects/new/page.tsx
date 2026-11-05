import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProjectForm } from "@/components/project-form";
import { createClient } from "@/lib/supabase/server";
import { createProjectAction } from "../actions";
import { getParentOptions } from "../data";

export const metadata = { title: "New project" };

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; parent?: string }>;
}) {
  const { client: clientId, parent } = await searchParams;
  if (!clientId) notFound();

  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("id, name").eq("id", clientId).maybeSingle();
  if (!client) notFound();
  const parentOptions = await getParentOptions(client.id);
  const parentName = parentOptions.find((p) => p.id === parent)?.name;
  const back = parent ? `/projects/${parent}` : `/clients/${client.id}/projects`;

  return (
    <>
      <Link href={back} className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink">
        <ChevronLeft className="h-3.5 w-3.5" /> {parentName ?? client.name}
      </Link>
      <PageHeader
        title={parentName ? "New subproject" : "New project"}
        description={parentName ? `Inside "${parentName}" for ${client.name}` : `For ${client.name}`}
      />
      <ProjectForm
        action={createProjectAction}
        clientId={client.id}
        parentOptions={parentOptions}
        defaultParentId={parent ?? null}
        cancelHref={back}
        submitLabel={parentName ? "Create subproject" : "Create project"}
      />
    </>
  );
}
