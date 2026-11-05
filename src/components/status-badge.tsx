import { CLIENT_STATUSES, type ClientStatus } from "@/lib/clients";
import { cn } from "@/lib/utils";

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const s = CLIENT_STATUSES.find((x) => x.value === status) ?? CLIENT_STATUSES[1];
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium", s.className)}>
      {s.label}
    </span>
  );
}
