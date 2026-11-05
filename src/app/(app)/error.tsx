"use client";

import Link from "next/link";

/** Friendly message if something goes wrong on a page (your data is safe). */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-[12px] font-medium uppercase tracking-wider text-ink-faint">Something went wrong</p>
      <h1 className="mt-2 text-xl font-semibold">This page didn&apos;t load properly.</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Your data is safe. This is usually a brief connection hiccup. Try again, and if it keeps happening, take a
        screenshot of this page.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={reset} className="btn-primary">Try again</button>
        <Link href="/" className="btn-ghost">Go home</Link>
      </div>
    </div>
  );
}
