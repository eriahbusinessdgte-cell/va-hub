import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <p className="text-[12px] font-medium uppercase tracking-wider text-ink-faint">Not found</p>
      <h1 className="mt-2 text-xl font-semibold">This page doesn&apos;t exist.</h1>
      <Link href="/" className="btn-ghost mt-5">
        Go home
      </Link>
    </main>
  );
}
