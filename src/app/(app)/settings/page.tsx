import { ComingSoon, PageHeader } from "@/components/page-header";
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
        <ComingSoon phase="Phase 6">
          Export everything (a full backup of your data as spreadsheet files) will live here.
        </ComingSoon>
      </div>
    </>
  );
}
