<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Book the lakehouse Agent Notes

This is a small Next.js app for a private family holiday-home booking calendar. Keep changes simple, readable, and easy for another family to customize.

## Before Coding

- Read the relevant local Next.js docs in `node_modules/next/dist/docs/` before changing App Router, Server Actions, metadata, caching, image, or routing code.
- Check `git status --short --branch` before edits. Do not overwrite user changes.
- Prefer `rg` for searching and inspect the existing pattern before introducing new abstractions.
- Keep secrets out of git. Use `.env.local` locally and `.env.example` for documented placeholders.

## Useful Commands

```bash
npm run dev
npm run lint
npm run build
npm run db:generate
npm run db:push
npm run db:seed
npm run db:studio
npm run db:import-xlsx -- ./path/to/calendar.xlsx
```

Run `npm run lint` and `npm run build` before handing off code changes when practical.

## Code Map

- `src/app/page.tsx` is the main calendar page.
- `src/app/actions.ts` contains Server Actions for bookings, identity, PIN unlock, and uploads.
- `src/components/Calendar.tsx` owns the interactive calendar UI.
- `src/components/IdentityPicker.tsx`, `IdentityOnboarding.tsx`, and `PinGate.tsx` handle lightweight family identity and access.
- `src/db/schema.ts`, `src/db/queries.ts`, and `src/db/client.ts` are the Drizzle/Neon data layer.
- `src/lib/data.ts` is demo and seed data.
- `src/lib/data-source.ts` switches between demo data and Neon based on `DATABASE_URL`.
- `src/lib/site.ts` centralizes reusable branding, metadata, footer text, and cookie prefix defaults.
- `scripts/` contains spreadsheet inspection/import helpers.

## Product Constraints

- This is not a public booking marketplace. It is a lightweight private calendar for trusted family members.
- Keep auth intentionally simple: shared `FAMILY_PIN` plus selected identity cookie.
- Server Actions are directly reachable. Validate identity, ownership, date ranges, and conflicts in every mutation.
- Booking dates use ISO `YYYY-MM-DD` strings. Preserve that shape unless doing a deliberate data-model migration.
- The app should run in demo mode without `DATABASE_URL`; avoid breaking the no-database local path.
- Photo uploads require `BLOB_READ_WRITE_TOKEN`; keep upload failure messages graceful when Blob is not configured.

## Styling Notes

- The visual style is quiet, spacious, and calendar-first.
- Reuse the existing Tailwind classes and CSS variables in `src/app/globals.css`.
- Avoid adding heavy UI libraries for small controls.
- Keep mobile and desktop calendar behavior in mind when changing layout.

## Database Notes

- Schema changes live in `src/db/schema.ts`.
- Use `npm run db:generate` for migrations when changing schema shape.
- Use `npm run db:push` for quick local/prototype database sync.
- `npm run db:seed` truncates and reseeds people/bookings from `src/lib/data.ts`.
