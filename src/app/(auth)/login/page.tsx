import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signIn } from "../actions";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mb-7 mt-1.5 text-sm text-ink-muted">Log in to your workspace.</p>
      <AuthForm
        action={signIn}
        submitLabel="Log in"
        pendingLabel="Logging in…"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
      />
      <p className="mt-5 text-center text-sm">
        <Link href="/forgot-password" className="text-ink-muted hover:text-ink">
          Forgot your password?
        </Link>
      </p>
    </>
  );
}
