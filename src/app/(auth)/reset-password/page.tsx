import { AuthForm } from "@/components/auth-form";
import { updatePassword } from "../actions";

export const metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mb-7 mt-1.5 text-sm text-ink-muted">At least 10 characters.</p>
      <AuthForm
        action={updatePassword}
        submitLabel="Save password"
        pendingLabel="Saving…"
        fields={[
          { name: "password", label: "New password", type: "password", autoComplete: "new-password" },
          { name: "confirm", label: "Confirm new password", type: "password", autoComplete: "new-password" },
        ]}
      />
    </>
  );
}
