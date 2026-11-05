"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ClientTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/clients/${id}`;
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/projects`, label: "Projects" },
    { href: `${base}/tasks`, label: "Tasks" },
    { href: `${base}/leads`, label: "Leads" },
  ];

  return (
    <nav className="-mx-5 mb-8 flex gap-1 overflow-x-auto border-b border-line px-5 md:mx-0 md:px-0">
      {tabs.map((t) => {
        const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-[13.5px] transition",
              active ? "border-ink font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
