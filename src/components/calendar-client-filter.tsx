"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function CalendarClientFilter({ clients }: { clients: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <select
      aria-label="Filter by client"
      value={searchParams.get("client") ?? ""}
      onChange={(e) => {
        const p = new URLSearchParams(searchParams.toString());
        if (e.target.value) p.set("client", e.target.value);
        else p.delete("client");
        p.delete("task");
        p.delete("lead");
        router.push(`${pathname}?${p.toString()}`, { scroll: false });
      }}
      className="input w-auto py-1.5 text-[13px]"
    >
      <option value="">All clients</option>
      {clients.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}
