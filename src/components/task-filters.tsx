"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PRIORITIES } from "@/lib/projects";

/** Client and priority filters for My Tasks; they update the URL so views can be bookmarked. */
export function TaskFilters({ clients }: { clients: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const set = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("task");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <select
        aria-label="Filter by client"
        value={searchParams.get("client") ?? ""}
        onChange={(e) => set("client", e.target.value)}
        className="input w-auto py-1.5 text-[13px]"
      >
        <option value="">All clients</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <select
        aria-label="Filter by priority"
        value={searchParams.get("priority") ?? ""}
        onChange={(e) => set("priority", e.target.value)}
        className="input w-auto py-1.5 text-[13px]"
      >
        <option value="">Any priority</option>
        {PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
    </div>
  );
}
