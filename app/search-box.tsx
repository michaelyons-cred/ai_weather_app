"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * A subset of Open-Meteo's geocoding result. The endpoint is CORS-enabled and
 * key-less, so autocomplete queries run directly from the browser — the server
 * only gets involved once the user commits to a place.
 */
interface CitySuggestion {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
  country_code?: string;
}

interface GeocodingSearchResponse {
  results?: CitySuggestion[];
}

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

/** Best available region label: state/province, else country. */
function regionOf(suggestion: CitySuggestion): string {
  return suggestion.admin1 || suggestion.country || suggestion.country_code || "";
}

/**
 * City search with type-ahead suggestions.
 *
 * As the user types we debounce and query Open-Meteo's geocoder for matches.
 * Picking a suggestion navigates with its exact coordinates (accurate weather)
 * plus its name/region, so the header reflects precisely what was chosen and
 * the server can skip a reverse-geocode round-trip. Pressing Enter with no
 * matching suggestion falls back to `/?city=<query>`, letting the server render
 * its "no weather found" state.
 */
export function SearchBox() {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Debounced geocoding lookup. Each keystroke supersedes the previous request
  // via AbortController so stale responses can't overwrite fresher results.
  useEffect(() => {
    const trimmed = query.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (trimmed.length < MIN_QUERY_LENGTH) {
        setSuggestions([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const url =
          `${GEOCODING_URL}?name=${encodeURIComponent(trimmed)}` +
          `&count=5&language=en&format=json`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Search failed (${res.status})`);
        }
        const data: GeocodingSearchResponse = await res.json();
        const results = data.results ?? [];
        setSuggestions(results);
        setActiveIndex(-1);
        setError(
          results.length === 0 ? `No cities found for \u201c${trimmed}\u201d.` : null,
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return; // Superseded by a newer keystroke; leave state untouched.
        }
        setSuggestions([]);
        setError("Something went wrong. Please try again.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  // Close the dropdown when focus/clicks move outside the widget.
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function selectSuggestion(suggestion: CitySuggestion) {
    setOpen(false);
    setQuery("");
    setSuggestions([]);
    const params = new URLSearchParams({
      lat: String(suggestion.latitude),
      lon: String(suggestion.longitude),
      city: suggestion.name,
    });
    const region = regionOf(suggestion);
    if (region) {
      params.set("region", region);
    }
    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  }

  function submitQuery() {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    const chosen =
      activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0];
    if (chosen) {
      selectSuggestion(chosen);
      return;
    }
    // Nothing matched — hand the raw query to the server so it can render its
    // "no weather found" state (and keep one source of truth for that message).
    setOpen(false);
    startTransition(() => {
      router.push(`/?city=${encodeURIComponent(trimmed)}`);
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setOpen(true);
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        event.preventDefault();
        submitQuery();
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  }

  const showDropdown = open && query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div ref={containerRef} className="relative mt-3 w-full max-w-[280px]">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-white/70">
          {loading || isNavigating ? (
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
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          )}
        </span>
        <input
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
          }
          value={query}
          placeholder="Search for a city"
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="focus:border-white/50 w-full rounded-full border border-white/25 bg-white/15 py-2 pr-3 pl-9 text-sm text-white backdrop-blur-sm transition placeholder:text-white/60 focus:bg-white/25 focus:outline-none"
        />
      </div>

      {showDropdown ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute inset-x-0 top-full z-10 mt-1.5 overflow-hidden rounded-[6px] bg-white text-left shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
        >
          {loading ? (
            <li className="text-forecast-text/60 px-3 py-2.5 text-sm">
              {"Searching\u2026"}
            </li>
          ) : error ? (
            <li className="text-forecast-text/70 px-3 py-2.5 text-sm">{error}</li>
          ) : (
            suggestions.map((suggestion, index) => {
              const secondary = [suggestion.admin1, suggestion.country]
                .filter(Boolean)
                .join(", ");
              return (
                <li
                  key={suggestion.id}
                  id={`${listboxId}-opt-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectSuggestion(suggestion)}
                    className={`flex w-full items-baseline justify-between gap-2 px-3 py-2.5 text-left transition ${
                      index === activeIndex ? "bg-sky-accent/15" : ""
                    }`}
                  >
                    <span className="text-forecast-text text-sm font-medium">
                      {suggestion.name}
                    </span>
                    {secondary ? (
                      <span className="text-forecast-text/60 shrink-0 text-xs">
                        {secondary}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
