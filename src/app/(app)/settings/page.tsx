import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: profile }, { data: workspace }] = await Promise.all([
    supabase.from("profiles").select("full_name").limit(1).maybeSingle(),
    supabase.from("workspaces").select("name, timezone").limit(1).maybeSingle(),
  ]);

  return (
    <>
      <PageHeader title="Settings" />
      <div className="max-w-xl space-y-8">
        <SettingsForm
          fullName={profile?.full_name ?? ""}
          workspaceName={workspace?.name ?? ""}
          timezone={workspace?.timezone ?? "UTC"}
          timezones={Intl.supportedValuesOf("timeZone")}
        />
        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="text-[15px] font-semibold">Backup &amp; export</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Download everything (clients, projects, tasks, checklists, lead stages and leads) as a ZIP file.
            Each part opens in Excel or Google Sheets. It&apos;s a good habit to do this once a week and keep
            the file in your Google Drive.
          </p>
          <a href="/api/export/backup" className="btn-primary mt-4">
            <Download className="h-4 w-4" /> Download full backup
          </a>
          <p className="mt-3 text-[12.5px] text-ink-faint">
            To export just leads, use the Export button on a client&apos;s Leads tab or on All Leads. It
            downloads exactly the leads you&apos;re viewing, with your filters applied.
          </p>
        </section>
      </div>
    </>
  );
}
