"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Lets the user swap the hardcoded default city for weather at their real
 * location. The browser Geolocation API is asynchronous and fallible, so the
 * three failure modes each get a friendly message:
 *   - the device/browser has no geolocation support
 *   - the user denies the permission prompt
 *   - the lookup times out or the position is unavailable
 *
 * On success we hand the coordinates to the server by navigating to
 * `/?lat=…&lon=…`; the page's Server Component fetches by coordinates from
 * there, so the weather request never runs in the browser.
 */
export function LocationButton() {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = locating || isNavigating;

  function handleClick() {
    setError(null);

    if (!("geolocation" in navigator)) {
      setError("Your browser doesn't support location.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude, longitude } = position.coords;
        startTransition(() => {
          router.push(`/?lat=${latitude}&lon=${longitude}`);
        });
      },
      (geoError) => {
        setLocating(false);
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            setError("Location access was denied.");
            break;
          case geoError.TIMEOUT:
            setError("Timed out finding your location.");
            break;
          default:
            setError("Couldn't determine your location.");
        }
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <div className="mt-3 flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="focus-visible:ring-offset-sky-accent inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        {busy ? "Locating\u2026" : "Use my location"}
      </button>
      {error ? (
        <p role="status" className="text-sm text-white/90">
          {error}
        </p>
      ) : null}
    </div>
  );
}
