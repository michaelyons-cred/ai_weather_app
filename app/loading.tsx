const PAGE_SHELL =
  "bg-weather-gradient font-sans flex min-h-screen w-full items-center justify-center overflow-x-hidden px-0 py-6 sm:px-4 sm:py-10";

/**
 * Skeleton shown while the Server Component fetches live weather. It mirrors
 * the real card's layout (header, skyline band, 5 forecast columns) so the
 * page doesn't shift when data arrives.
 */
export default function Loading() {
  return (
    <main className={PAGE_SHELL} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading weather…</span>
      <div className="w-full max-w-[672px] animate-pulse">
        {/* Header placeholder */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="h-5 w-40 rounded bg-white/40" />
          <div className="h-3 w-52 rounded bg-white/30" />
        </div>

        {/* Card placeholder */}
        <div className="overflow-hidden rounded-[3px] shadow-[0_0_15px_0_rgba(0,0,0,0.2)]">
          <div className="aspect-[670/368] w-full bg-[#d6f0fa]" />
          <div className="grid grid-cols-5 bg-white">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className={`flex flex-col items-center gap-3 py-5 ${
                  index > 0 ? "border-divider border-l" : ""
                }`}
              >
                <div className="h-3 w-8 rounded bg-black/10" />
                <div className="h-9 w-9 rounded-full bg-black/10" />
                <div className="h-6 w-8 rounded bg-black/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
