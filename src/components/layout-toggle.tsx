"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Columns3, List } from "lucide-react";
import { cn } from "@/lib/utils";

/** Switches between List and Board; remembered in the URL (?layout=board). */
export function LayoutToggle() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const board = searchParams.get("layout") === "board";

  const hrefFor = (layout: "list" | "board") => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("task");
    if (layout === "board") p.set("layout", "board");
    else p.delete("layout");
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const item = (layout: "list" | "board", label: string, Icon: typeof List, active: boolean) => (
    <Link
      href={hrefFor(layout)}
      scroll={false}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] transition",
        active ? "bg-surface font-medium text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-muted hover:text-ink",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );

  return (
    <div className="flex gap-1 rounded-lg bg-hover p-1">
      {item("list", "List", List, !board)}
      {item("board", "Board", Columns3, board)}
    </div>
  );
}
