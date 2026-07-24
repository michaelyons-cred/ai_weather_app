- **What this project is** — a weather app built with Next.js App Router, TypeScript, and Tailwind CSS v4. A hands-on workshop covering the full AI-assisted frontend workflow — from translating a Figma design into code, to wiring up live data, optimizing for mobile with agent skills, and shipping production-quality work.

- **Stack constraints** — Tailwind v4 is configured in `app/globals.css`; there is no `tailwind.config.ts`

- **Target file** — the weather app lives in `app/page.tsx`

- **Do not add new npm dependencies without being asked** — Copilot will reach for `axios`, `date-fns`, or `lucide-react` when the built-in equivalent works fine. This constraint puts that decision back in your hands.

- **Do not use the TypeScript `any` type** — AI-generated code often falls back to `any` to avoid complexity. Banning it forces proper typing.
