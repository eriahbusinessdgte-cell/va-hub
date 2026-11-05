export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {actions}
    </header>
  );
}

/** Placeholder for sections that arrive in a later phase. */
export function ComingSoon({ phase, children }: { phase: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      <p className="text-[12px] font-medium uppercase tracking-wider text-ink-faint">{phase}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{children}</p>
    </div>
  );
}
