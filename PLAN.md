# Plan: Build Weather Card UI from Figma

Recreate the Figma "Weather" design (node 0:2) as a static, responsive weather card in `app/page.tsx` using Next.js App Router + Tailwind v4. No new npm deps, no TS `any`.

## Design summary (from Figma node 0:2, 1024x880)
- Full-bleed diagonal blue gradient background (light cyan top-right -> deep blue bottom-left).
- Header (above card, white text): "Dallas, TX" + pin icon; date "Saturday, Sep 16, 2018".
- White card (~670px, rounded, soft shadow, overflow-visible) with 3 zones:
  1. Current conditions: big "93" temp + weather icon, "Partly Cloudy / 12 mph", C/F toggle pill top-right. Light-blue tinted band.
  2. Illustration: Dallas skyline + reflection; two cloud shapes overflow card left/right edges.
  3. 5-day forecast: Sun/Mon/Tue/Wed/Thu, each day label + icon + temp, thin vertical dividers.
- Forecast temps: Sun 92, Mon 87, Tue 93, Wed 95, Thu 88.

## Architecture
- Single route: `app/page.tsx` (Server Component, static data). Composition lives here per project constraint.
- Optional sub-components co-located (either inside page.tsx or `app/components/`): Header, CurrentConditions, UnitToggle, SkylineIllustration, Forecast, ForecastDay, WeatherIcon.
- Data: typed constants (no fetching yet). Interfaces: `CurrentWeather`, `ForecastDay`, `Unit = 'C' | 'F'`, `WeatherCondition` union for icon mapping.
- Icons: export from Figma as SVG into `public/` OR inline SVG components. NO icon library (lucide banned).
- Assets in `public/`: skyline (node 0:8), clouds (0:93, 0:100), 5 forecast icons + current icon (Cloud-Sun etc.).
- Styling: Tailwind v4 utility classes; shared color tokens in `app/globals.css` `@theme inline` (gradient, card tint, muted blue text). No tailwind.config.ts.

## Component tree
```
Home (page.tsx)
- Header (location + date)
- WeatherCard
  - CurrentConditions (temp, WeatherIcon, condition/wind text, UnitToggle)
  - SkylineIllustration (skyline image + overflowing clouds)
  - Forecast -> ForecastDay[] (day, WeatherIcon, temp, divider)
```

## Data model
- `Unit = 'C' | 'F'`
- `WeatherCondition = 'partly-cloudy' | 'cloudy-sun' | 'lightning' | 'drizzle' | 'drizzle-sun'`
- `interface DayForecast { id; label; condition; highF }`
- `interface CurrentWeather { city; region; date; tempF; condition; conditionLabel; windMph }`
- `FORECAST: DayForecast[5]`; `CURRENT: CurrentWeather`

## Steps

### Phase 0 — Commit this plan as a repo file
0. Write this plan to `PLAN.md` at the repo root.

### Phase 1 — Static visual (Server Component only)
1. Confirm values + export assets (skyline, clouds, icons) to public/. Capture exact colors/temps.
2. Add gradient + color tokens to app/globals.css @theme inline.
3. Review node_modules/next/dist/docs/ for Image + page conventions.
4. Build page shell: gradient wrapper -> centered column -> Header -> WeatherCard. Add typed data constants (CURRENT, FORECAST).
5. Header section (pin icon + Dallas,TX + date).
6. CurrentConditions zone (temp, icon, text, UnitToggle pill - static visual).
7. SkylineIllustration zone (skyline + clouds overflow via absolute + overflow-visible + z-index).
8. Forecast zone (map typed array -> 5 columns + dividers).
9. Responsive polish (mobile scaling, cloud overflow no horizontal scroll).
10. Verify: dev/lint, compare to screenshot, no any, no new deps. USER VERIFICATION GATE.

### Phase 2 — Interactive unit toggle (after Phase 1 sign-off)
11. Promote WeatherCard to 'use client'; add `useState<Unit>('F')`. page.tsx stays Server, passes CURRENT/FORECAST props down.
12. Add pure `toCelsius(f)` helper; compute displayed temp at render (no converted values stored).
13. Wire UnitToggle as controlled (unit + onChange=setUnit); pass unit into CurrentConditions + Forecast/ForecastDay.
14. (Optional) Persist unit in localStorage; read in useEffect to avoid hydration mismatch (server default 'F').
15. Verify toggle flips current + all forecast temps; no hydration warnings; no new deps.

### Phase 3 — Live data (fetch, loading, error, empty)
16. Define data source + typed fetch fn returning CurrentWeather + DayForecast[] (same shapes as Phase 1). Fetch in Server Component (page.tsx); city via search param/geolocation later.
17. Swap static constants for the fetch; keep UI unchanged. Handle unit conversion the same way.
18. Add loading UI: app/loading.tsx (or <Suspense fallback={<CardSkeleton/>}>) mirroring card layout to avoid shift.
19. Add error handling: app/error.tsx ('use client') with Retry(reset()); per-fetch try/catch throwing typed errors (network vs not-found vs unexpected).
20. Add empty/no-data guard: derived placeholder when forecast empty or city not found; don't assume 5 items.
21. Verify: loading skeleton, forced error + retry, unknown-city path, dev/lint, no any, no new deps.

## Constraints
- app/page.tsx target; Tailwind v4 (globals.css only); no new npm deps; no TS any; check Next docs in node_modules.

## Decisions
- UnitToggle: TWO PHASES. Phase 1 = static visual, all Server Components, no state. Phase 2 (after user verifies phase 1) = add 'use client' boundary at WeatherCard holding useState<Unit>('F'); page.tsx stays Server and passes CURRENT/FORECAST props down. UnitToggle is controlled (unit + onChange). Temps stored in Fahrenheit; toCelsius(f) helper derives display when unit==='C'. State lives in WeatherCard because it owns both CurrentConditions and Forecast temps.
- Component split: inline/co-located in page.tsx to honor "app lives in page.tsx".

## State Architecture

### State inventory
| State | Type | Owner / location | Phase | Kind |
|-------|------|------------------|-------|------|
| unit  | Unit ('C'\|'F') | WeatherCard ('use client') | 2 | UI/client |
| weather data (CURRENT, FORECAST) | typed constants -> fetched | page.tsx (Server) | 1 static / 3 async | Server data |
| loading | implicit (Suspense/loading.tsx) | route segment | 3 | Async status |
| error | Error boundary (error.tsx) + per-fetch catch | route segment / page | 3 | Async status |
| empty/no-results | derived from data | page.tsx / WeatherCard | 3 | Derived |

### Toggle (unit) state — Phase 2
- Single client state: `unit: Unit`, default 'F'.
- Lives in WeatherCard (nearest common ancestor of CurrentConditions + Forecast). Marked 'use client'; `useState<Unit>('F')`.
- page.tsx stays Server, passes data props down. UnitToggle controlled (unit + onChange=setUnit).
- Canonical unit = Fahrenheit; `toCelsius(f)` derives display. Never store converted values.
- Optional persistence: remember choice in localStorage (read in useEffect to avoid hydration mismatch). Default 'F' on server render. Mark as optional/nice-to-have.
- No context/store needed (one value, shallow tree).

### Data state — Phase 1 static -> Phase 3 live
- Phase 1: hardcoded typed constants in page.tsx. No async, so NO loading/error/empty states exist yet.
- Phase 3 (live data, out of current scope but designed for): fetch in the Server Component (page.tsx) or a dedicated async data function. Keep the fetch server-side; pass plain typed data to the client WeatherCard. City could come from a search param or geolocation later.
- Data shape stays identical (CurrentWeather + DayForecast[]) so Phase 1 UI is reused unchanged — only the source swaps from constant to fetch.

### Loading state — Phase 3
- Use App Router idioms, not manual useState booleans:
  - Route-level: `app/loading.tsx` renders a skeleton of the card while the Server Component awaits data.
  - Or wrap the data-dependent subtree in <Suspense fallback={<CardSkeleton/>}>.
- Skeleton mirrors card layout (temp block, skyline placeholder, 5 forecast columns) to avoid layout shift.
- Client-side unit toggle is instant (no async) so it never triggers loading.

### Error state — Phase 3
- Route-level error boundary: `app/error.tsx` ('use client') catches render/fetch throws, shows friendly message + Retry (calls its reset()).
- Per-fetch: wrap fetch in try/catch; on failure throw a typed error (or return a discriminated result) so the boundary/UI can distinguish network vs not-found (e.g., unknown city).
- Distinguish: transient/network error (offer retry) vs not-found/invalid city (offer correction) vs unexpected (generic boundary).
- No error state needed in Phase 1/2 (data is static/local).

### Empty / no-data state — Phase 3
- Derived, not stored: if forecast array is empty or city not found, render an empty/placeholder state inside the card instead of the forecast row.
- Guard rendering so map over FORECAST never assumes 5 items once data is dynamic.

### Boundary summary
- Server: page shell, Header, initial data fetch (Phase 3), loading.tsx, Suspense fallbacks.
- Client: WeatherCard subtree only (unit state + toggle interactivity), error.tsx (must be client).
- Rationale: keep JS shipped minimal; static/expensive markup stays server-rendered.
