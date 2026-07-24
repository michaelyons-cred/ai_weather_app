"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Lets the user swap the default city for weather at their real location.
 *
 * `navigator.geolocation` is a browser-only API, so it is called exclusively
 * from the click handler below (never during render / SSR). The lookup is
 * asynchronous and fallible; every outcome is handled distinctly:
 *   - no geolocation support           -> "unsupported"
 *   - PERMISSION_DENIED                 -> "denied"
 *   - POSITION_UNAVAILABLE              -> "unavailable"
 *   - TIMEOUT                           -> "timeout"
 *
 * On success we hand the coordinates to the server by navigating to
 * `/?lat=…&lon=…`; the page's Server Component fetches by coordinates from
 * there, so the weather request never runs in the browser.
 */
export function LocationButton() {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const [locating, setLocating] = useState(false);

  const busy = locating || isNavigating;

  // On any failure we hand off to the server with `?notice=<reason>`, which
  // falls back to the default city and shows an explanatory banner. This keeps
  // one source of truth for the message and guarantees the user ends up seeing
  // Dallas rather than a stale or empty state.
  function showFallback(
    reason: "denied" | "timeout" | "unsupported" | "unavailable",
  ) {
    setLocating(false);
    startTransition(() => {
      router.push(`/?notice=${reason}`);
    });
  }

  function handleClick() {
    if (!("geolocation" in navigator)) {
      showFallback("unsupported");
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
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            showFallback("denied");
            break;
          case geoError.POSITION_UNAVAILABLE:
            showFallback("unavailable");
            break;
          case geoError.TIMEOUT:
            showFallback("timeout");
            break;
          default:
            showFallback("unavailable");
        }
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <div className="mt-3 flex justify-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-busy={busy}
        className="focus-visible:ring-offset-sky-accent inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-4 w-4 animate-spin"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="9" className="opacity-25" />
            <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
          </svg>
        ) : (
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
        )}
        {busy ? "Locating\u2026" : "Use my location"}
      </button>
    </div>
  );
}
