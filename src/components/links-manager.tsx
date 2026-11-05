"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ExternalLink, Plus, X } from "lucide-react";
import { addClientLink, deleteClientLink } from "@/app/(app)/clients/actions";
import type { ClientLink } from "@/lib/clients";

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LinksManager({ clientId, links }: { clientId: string; links: ClientLink[] }) {
  const [adding, setAdding] = useState(false);
  const [state, formAction, pending] = useActionState(addClientLink.bind(null, clientId), undefined);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // After a successful add, clear the form so another link can be typed.
  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <div>
      {links.length > 0 && (
        <ul className="mb-3 space-y-1">
          {links.map((l) => (
            <li key={l.id} className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-hover">
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm hover:underline">
                {l.label}
                <span className="ml-2 text-[12px] text-ink-faint">{hostname(l.url)}</span>
              </a>
              <button
                aria-label={`Remove ${l.label}`}
                onClick={() => startTransition(() => deleteClientLink(clientId, l.id))}
                className="rounded p-1 text-ink-faint opacity-100 hover:bg-line hover:text-ink sm:opacity-0 sm:group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form ref={formRef} action={formAction} className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr]">
            <input name="label" placeholder="Name, e.g. Shared Drive" className="input" autoFocus />
            <input name="url" placeholder="Link" className="input" />
          </div>
          {state?.error && <p className="text-[13px] text-danger">{state.error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-primary py-1.5">
              {pending ? "Adding…" : "Add link"}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="btn-ghost py-1.5">
              Done
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="btn-ghost -ml-2 py-1.5">
          <Plus className="h-3.5 w-3.5" /> Add link
        </button>
      )}
    </div>
  );
}
