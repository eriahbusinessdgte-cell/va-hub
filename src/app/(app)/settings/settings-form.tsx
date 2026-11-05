"use client";

import { useActionState } from "react";
import { saveSettings } from "./actions";

export function SettingsForm({
  fullName,
  workspaceName,
  timezone,
  timezones,
}: {
  fullName: string;
  workspaceName: string;
  timezone: string;
  timezones: string[];
}) {
  const [state, action, pending] = useActionState(saveSettings, undefined);

  return (
    <form action={action} className="space-y-5 rounded-xl border border-line bg-surface p-6">
      <div>
        <label htmlFor="full_name" className="label">Your name</label>
        <input id="full_name" name="full_name" defaultValue={fullName} className="input" />
      </div>
      <div>
        <label htmlFor="workspace_name" className="label">Workspace name</label>
        <input id="workspace_name" name="workspace_name" defaultValue={workspaceName} required className="input" />
        <p className="mt-1.5 text-[12.5px] text-ink-faint">Shown at the top of the sidebar.</p>
      </div>
      <div>
        <label htmlFor="timezone" className="label">Time zone</label>
        <select id="timezone" name="timezone" defaultValue={timezone} className="input">
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[12.5px] text-ink-faint">
          Decides what counts as &ldquo;today&rdquo; and &ldquo;overdue&rdquo; across the app.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Save changes"}
        </button>
        {state?.message && <span className="text-sm text-success">{state.message}</span>}
        {state?.error && <span className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
