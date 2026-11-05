import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProjectForm } from "@/components/project-form";
import { descendantIds } from "@/lib/projects";
import { updateProjectAction } from "../../actions";
import { getParentOptions, getProjectContext } from "../../data";

export const metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getProjectContext(id);
  if (!ctx) notFound();
  const { project, client, allProjects } = ctx;

  // A project can't be moved inside itself or its own subprojects
  const parentOptions = await getParentOptions(client.id, descendantIds(allProjects, id));

  return (
    <>
      <Link href={`/projects/${id}`} className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink">
        <ChevronLeft className="h-3.5 w-3.5" /> {project.name}
      </Link>
      <PageHeader title="Edit project" description={client.name} />
      <ProjectForm
        action={updateProjectAction}
        clientId={client.id}
        project={project}
        parentOptions={parentOptions}
        cancelHref={`/projects/${id}`}
        submitLabel="Save changes"
      />
    </>
  );
}
