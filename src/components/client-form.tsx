"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CLIENT_STATUSES, type Client } from "@/lib/clients";
import type { ClientFormState } from "@/app/(app)/clients/actions";

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  placeholder,
  required,
  autoFocus,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
        {required && <span className="text-ink-faint"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        className="input"
      />
    </div>
  );
}

export function ClientForm({
  action,
  client,
  cancelHref,
  submitLabel,
}: {
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  client?: Client;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-2xl space-y-8">
      {client && <input type="hidden" name="id" value={client.id} />}

      <section className="space-y-4 rounded-xl border border-line bg-surface p-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-faint">Basics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="name" label="Client name" defaultValue={client?.name} required autoFocus={!client} placeholder="e.g. Jane Smith" />
          <Field name="business_name" label="Business name" defaultValue={client?.business_name} placeholder="e.g. Smith Coaching LLC" />
          <div>
            <label htmlFor="status" className="label">Status</label>
            <select id="status" name="status" defaultValue={client?.status ?? "active"} className="input">
              {CLIENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <Field name="start_date" label="Start date" type="date" defaultValue={client?.start_date} />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-line bg-surface p-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-faint">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="contact_name" label="Contact person" defaultValue={client?.contact_name} />
          <Field name="email" label="Email" type="email" defaultValue={client?.email} />
          <Field name="phone" label="Phone" type="tel" defaultValue={client?.phone} />
          <Field name="website" label="Website" defaultValue={client?.website} placeholder="example.com" />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-line bg-surface p-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-faint">Notes</h2>
        <textarea
          name="notes"
          defaultValue={client?.notes ?? ""}
          rows={6}
          placeholder="Preferences, how they like to communicate, anything worth remembering…"
          className="input resize-y leading-relaxed"
        />
      </section>

      {state?.error && (
        <p role="alert" className="rounded-md bg-danger/8 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className="btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}
