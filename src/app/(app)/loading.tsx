/** Shown instantly while a page loads, so taps always feel responsive. */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="mb-3 h-4 w-32 rounded bg-hover" />
      <div className="mb-8 h-7 w-56 rounded bg-hover" />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-hover" />
        ))}
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-hover" />
        ))}
      </div>
    </div>
  );
}
