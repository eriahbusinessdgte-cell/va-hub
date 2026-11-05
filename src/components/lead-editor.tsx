"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ExternalLink, Mail, Phone, Trash2, X } from "lucide-react";
import { deleteLead, saveLead } from "@/app/(app)/leads/actions";
import type { Lead, LeadStatus } from "@/lib/leads";

function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  placeholder,
  list,
  inputRef,
  action,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
  type?: string;
  placeholder?: string;
  list?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={name} className="label">{label}</label>
        {action}
      </div>
      <input
        ref={inputRef}
        id={name}
        name={name}
        type={type}
        list={list}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="input"
      />
    </div>
  );
}

export function LeadEditor({
  lead,
  statuses,
  sources,
  today,
  closeHref,
}: {
  lead: Lead;
  statuses: LeadStatus[];
  sources: string[];
  today: string;
  closeHref: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveLead, undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const contactedRef = useRef<HTMLInputElement>(null);
  const followRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(closeHref, { scroll: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, closeHref]);

  const setFollow = (days: number) => {
    if (followRef.current) followRef.current.value = addDays(today, days);
  };

  const chip = "rounded-md border border-line px-2 py-0.5 text-[12px] text-ink-muted hover:border-line-strong hover:text-ink";

  return (
    <div className="fixed inset-0 z-50">
      <Link href={closeHref} scroll={false} aria-label="Close" className="absolute inset-0 bg-black/15" />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-3.5">
          <p className="truncate text-[13px] text-ink-muted">{lead.clients?.name} · Lead</p>
          <Link href={closeHref} scroll={false} aria-label="Close" className="rounded-md p-1.5 text-ink-muted hover:bg-hover">
            <X className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* One-tap contact links */}
          {(lead.email || lead.phone || lead.social_url || lead.website) && (
            <div className="mb-5 flex flex-wrap gap-2">
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="btn-ghost border border-line py-1 text-[13px]">
                  <Mail className="h-3.5 w-3.5" /> Email
                </a>
              )}
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="btn-ghost border border-line py-1 text-[13px]">
                  <Phone className="h-3.5 w-3.5" /> Call
                </a>
              )}
              {lead.social_url && (
                <a href={lead.social_url} target="_blank" rel="noopener noreferrer" className="btn-ghost border border-line py-1 text-[13px]">
                  <ExternalLink className="h-3.5 w-3.5" /> Profile
                </a>
              )}
              {lead.website && (
                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="btn-ghost border border-line py-1 text-[13px]">
                  <ExternalLink className="h-3.5 w-3.5" /> Website
                </a>
              )}
            </div>
          )}

          <form id="lead-form" action={formAction} className="space-y-4">
            <input type="hidden" name="id" value={lead.id} />
            <input
              name="name"
              defaultValue={lead.name}
              required
              aria-label="Lead name"
              placeholder="Name"
              className="w-full bg-transparent text-lg font-semibold outline-none"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="status_id" className="label">Status</label>
                <select id="status_id" name="status_id" defaultValue={lead.status_id ?? ""} className="input">
                  <option value="">No status</option>
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <Field name="source" label="Source" defaultValue={lead.source} list="lead-sources" placeholder="e.g. Instagram" />
              <Field
                name="date_contacted"
                label="Date contacted"
                type="date"
                defaultValue={lead.date_contacted}
                inputRef={contactedRef}
                action={
                  <button type="button" className="mb-1.5 text-[12px] text-accent hover:underline" onClick={() => contactedRef.current && (contactedRef.current.value = today)}>
                    Today
                  </button>
                }
              />
              <Field name="follow_up_date" label="Follow-up date" type="date" defaultValue={lead.follow_up_date} inputRef={followRef} />
            </div>
            <div className="-mt-2 flex flex-wrap items-center justify-end gap-1.5">
              <span className="mr-1 text-[12px] text-ink-faint">Follow up in</span>
              <button type="button" className={chip} onClick={() => setFollow(1)}>1 day</button>
              <button type="button" className={chip} onClick={() => setFollow(3)}>3 days</button>
              <button type="button" className={chip} onClick={() => setFollow(7)}>1 week</button>
              <button type="button" className={chip} onClick={() => setFollow(14)}>2 weeks</button>
            </div>

            <Field name="next_action" label="Next action" defaultValue={lead.next_action} placeholder="e.g. Send follow-up DM with offer" />

            <div className="grid grid-cols-2 gap-3">
              <Field name="company" label="Company" defaultValue={lead.company} />
              <Field name="email" label="Email" type="email" defaultValue={lead.email} />
              <Field name="phone" label="Phone" type="tel" defaultValue={lead.phone} />
              <Field name="website" label="Website" defaultValue={lead.website} placeholder="example.com" />
            </div>
            <Field name="social_url" label="Social media profile" defaultValue={lead.social_url} placeholder="instagram.com/username" />

            <div>
              <label htmlFor="notes" className="label">Notes</label>
              <textarea id="notes" name="notes" rows={5} defaultValue={lead.notes ?? ""} className="input resize-y leading-relaxed" />
            </div>

            <datalist id="lead-sources">
              {sources.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </form>
        </div>

        <div className="border-t border-line px-6 py-3.5">
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-auto text-sm">Delete this lead permanently?</span>
              <button
                onClick={() =>
                  startDelete(async () => {
                    await deleteLead(lead.id);
                    router.push(closeHref, { scroll: false });
                  })
                }
                disabled={deleting}
                className="btn bg-danger text-white hover:bg-danger/90"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn-ghost">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button type="submit" form="lead-form" disabled={pending} className="btn-primary">
                {pending ? "Saving…" : "Save"}
              </button>
              {state?.ok && !pending && <span className="text-[13px] text-success">Saved</span>}
              {state?.error && <span className="text-[13px] text-danger">{state.error}</span>}
              <button onClick={() => setConfirmDelete(true)} className="btn-ghost ml-auto hover:text-danger" aria-label="Delete lead">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
