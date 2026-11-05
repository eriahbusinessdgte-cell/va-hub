import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { GlobalUIProvider } from "@/components/global-ui";
import { getActiveClients, getSessionUser, getWorkspace } from "@/lib/workspace";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // All at once: login check, clients for the sidebar, workspace name/time zone.
  // Row Level Security means these only ever return your own data.
  const [user, clients, workspace] = await Promise.all([getSessionUser(), getActiveClients(), getWorkspace()]);
  if (!user) redirect("/login");

  const clientOptions = clients.map(({ id, name }) => ({ id, name }));

  return (
    <GlobalUIProvider clients={clientOptions} today={workspace.today}>
      <div className="min-h-screen">
        <AppNav clients={clientOptions} email={user.email} workspaceName={workspace.name} />
        <main className="pb-24 md:pb-0 md:pl-60">
          <div className="mx-auto max-w-6xl px-5 py-6 md:px-10 md:py-10">{children}</div>
        </main>
      </div>
    </GlobalUIProvider>
  );
}
