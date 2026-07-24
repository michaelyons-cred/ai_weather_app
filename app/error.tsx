"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

const PAGE_SHELL =
  "bg-weather-gradient font-sans flex min-h-screen w-full items-center justify-center overflow-x-hidden px-4 py-10";

/**
 * Route-level error boundary. Catches failures thrown while fetching or
 * rendering weather (e.g. the upstream API being unreachable) and offers a
 * retry that re-runs the Server Component.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={PAGE_SHELL}>
      <div className="w-full max-w-[672px] rounded-[3px] bg-white px-6 py-12 text-center shadow-[0_0_15px_0_rgba(0,0,0,0.2)]">
        <h1 className="text-forecast-text text-lg font-semibold">
          Couldn&rsquo;t load the weather
        </h1>
        <p className="text-forecast-text/70 mt-2 text-sm">
          Something went wrong reaching the weather service. Please try again.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="bg-toggle focus-visible:ring-toggle mt-6 cursor-pointer rounded-full px-5 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
