"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Briefcase,
  CalendarDays,
  CheckSquare,
  Home,
  LogOut,
  Menu,
  Plus,
  Settings,
  Target,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/(auth)/actions";

export type NavClient = { id: string; name: string };

const MAIN_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/tasks", label: "My Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/leads", label: "All Leads", icon: Target },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13.5px] transition",
        active ? "bg-hover font-medium text-ink" : "text-ink-muted hover:bg-hover hover:text-ink",
      )}
    >
      {Icon ? (
        <Icon className="h-[15px] w-[15px] shrink-0" />
      ) : (
        <span className="ml-[3px] mr-[2px] h-2 w-2 shrink-0 rounded-[3px] bg-ink-faint/60" />
      )}
      <span className="truncate">{label}</span>
    </Link>
  );
}

/** Contents shared by the desktop sidebar and the mobile drawer. */
function SidebarContents({
  clients,
  email,
  workspaceName,
}: {
  clients: NavClient[];
  email: string;
  workspaceName: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 pb-4 pt-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="h-7 w-7" />
        <span className="truncate text-[14px] font-semibold tracking-tight">{workspaceName}</span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-2.5">
        <div className="space-y-0.5">
          {MAIN_LINKS.map((l) => (
            <NavLink key={l.href} {...l} active={isActive(pathname, l.href)} />
          ))}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between px-2.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
              Clients
            </span>
            <Link
              href="/clients/new"
              aria-label="New client"
              className="rounded p-0.5 text-ink-faint transition hover:bg-hover hover:text-ink"
            >
              <Plus className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-0.5">
            {clients.map((c) => (
              <NavLink
                key={c.id}
                href={`/clients/${c.id}`}
                label={c.name}
                active={isActive(pathname, `/clients/${c.id}`)}
              />
            ))}
            <NavLink
              href="/clients"
              label="All clients"
              icon={Briefcase}
              active={pathname === "/clients"}
            />
          </div>
        </div>
      </nav>

      <div className="border-t border-line px-2.5 py-3">
        <NavLink href="/settings" label="Settings" icon={Settings} active={isActive(pathname, "/settings")} />
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13.5px] text-ink-muted transition hover:bg-hover hover:text-ink"
          >
            <LogOut className="h-[15px] w-[15px]" />
            Log out
          </button>
        </form>
        <p className="truncate px-2.5 pt-2 text-[12px] text-ink-faint">{email}</p>
      </div>
    </div>
  );
}

export function AppNav(props: { clients: NavClient[]; email: string; workspaceName: string }) {
  const pathname = usePathname();
  // The drawer remembers which page it was opened on, so it closes
  // automatically as soon as you navigate somewhere else.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const drawerOpen = openedOn === pathname;
  const setDrawerOpen = (open: boolean) => setOpenedOn(open ? pathname : null);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-line bg-sidebar md:block">
        <SidebarContents {...props} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/20"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar shadow-xl">
            <button
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1.5 text-ink-muted hover:bg-hover"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContents {...props} />
          </aside>
        </div>
      )}

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {MAIN_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px]",
                isActive(pathname, href) ? "font-medium text-ink" : "text-ink-faint",
              )}
            >
              <Icon className="h-5 w-5" />
              {label.replace("My ", "").replace("All ", "")}
            </Link>
          ))}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-ink-faint"
          >
            <Menu className="h-5 w-5" />
            Menu
          </button>
        </div>
      </nav>
    </>
  );
}
