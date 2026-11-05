import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { requestPasswordReset } from "../actions";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mb-7 mt-1.5 text-sm text-ink-muted">
        We&apos;ll email you a link to set a new one.
      </p>
      <AuthForm
        action={requestPasswordReset}
        submitLabel="Send reset link"
        pendingLabel="Sending…"
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
      />
      <p className="mt-5 text-center text-sm">
        <Link href="/login" className="text-ink-muted hover:text-ink">
          Back to log in
        </Link>
      </p>
    </>
  );
}
