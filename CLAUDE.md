# Book the lakehouse Claude Notes

Read `AGENTS.md` first. It is the source of truth for repo conventions, command names, and the required warning about this project's Next.js version.

## Quick Orientation

- Main app route: `src/app/page.tsx`
- Mary mode route: `src/app/mary/page.tsx`
- Server Actions: `src/app/actions.ts`
- Calendar UI: `src/components/Calendar.tsx`
- Database schema/queries: `src/db/schema.ts`, `src/db/queries.ts`
- Demo/seed data: `src/lib/data.ts`
- Branding/config defaults: `src/lib/site.ts`
- Spreadsheet helpers: `scripts/`

## Default Workflow

```bash
git status --short --branch
npm run lint
npm run build
```

Use `rg` for search. Before editing Next.js App Router, Server Actions, metadata, caching, or routing code, read the matching local guide under `node_modules/next/dist/docs/`.

## Guardrails

- Keep the app easy to fork for another family lakehouse or holiday home.
- Preserve demo mode when `DATABASE_URL` is missing.
- Admin-style users are called Marys; use `MARY_IDS` and Mary mode language.
- Keep mutations authorized in `src/app/actions.ts`; validate identity, ownership, date formats, and booking conflicts server-side.
- Do not commit `.env.local` or real credentials.
- Prefer small, focused changes over broad refactors.
