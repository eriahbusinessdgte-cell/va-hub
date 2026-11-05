import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { GlobalUIProvider } from "@/components/global-ui";
import { getWorkspaceToday } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  // Row Level Security means these only ever return your own data.
  const [{ data: clients }, { data: workspace }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, is_internal")
      .is("archived_at", null)
      .order("is_internal", { ascending: false })
      .order("name"),
    supabase.from("workspaces").select("name").limit(1).maybeSingle(),
  ]);
  const { today } = await getWorkspaceToday();
  const clientOptions = (clients ?? []).map(({ id, name }) => ({ id, name }));

  return (
    <GlobalUIProvider clients={clientOptions} today={today}>
      <div className="min-h-screen">
        <AppNav clients={clientOptions} email={auth.user.email ?? ""} workspaceName={workspace?.name ?? "VA Hub"} />
        <main className="pb-24 md:pb-0 md:pl-60">
          <div className="mx-auto max-w-6xl px-5 py-6 md:px-10 md:py-10">{children}</div>
        </main>
      </div>
    </GlobalUIProvider>
  );
}
