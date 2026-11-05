"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/(auth)/actions";

type Field = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
};

/** Small reusable form used by the login and password pages. */
export function AuthForm({
  action,
  fields,
  submitLabel,
  pendingLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  fields: Field[];
  submitLabel: string;
  pendingLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className="label">
            {f.label}
          </label>
          <input
            id={f.name}
            name={f.name}
            type={f.type ?? "text"}
            autoComplete={f.autoComplete}
            required
            className="input"
          />
        </div>
      ))}

      {state?.error && (
        <p role="alert" className="rounded-md bg-danger/8 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p role="status" className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
