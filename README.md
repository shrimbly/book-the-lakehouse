<p align="center">
  <img src="./public/calendar-hero.png" alt="Book the lakehouse month view" width="100%">
</p>

<div align="center">

### A tiny, beautiful, and low-cost booking calendar for the family holiday home.

[MIT licensed](./LICENSE) · built with Next.js, React, Drizzle, Neon, and Vercel Blob

</div>

<br>

Simple shared availability for the places families pass between each other.
No marketplace, no payments, no accounts to administer. Just a private calendar,
a shared PIN, and enough personality to feel like it belongs to your people.

## What It Does

Book the lakehouse is a family-first stay planner. People pick who they are, claim
dates on a large month view, drag or resize their own stays, and add small photos
from the trip. It is designed for the informal rhythm of a shared home: quick to check,
hard to double-book, and calm enough that everyone can use it.

- Shared PIN gate for lightweight family privacy
- Identity picker with per-person colors and optional profile photos
- Month and year navigation with a spacious responsive calendar
- Overlap prevention on the server, so two stays cannot claim the same dates
- Edit and delete controls scoped to the person who owns the booking
- Optional stay photos, thumbnails, and profile images via Vercel Blob
- Demo data fallback when no database is configured
- Import helpers for older spreadsheet-based calendars
- Coding-agent friendly docs in `AGENTS.md` and `CLAUDE.md`

## Features

| Feature | Description |
| --- | --- |
| Private family entry | Protect the calendar with a simple four-digit `FAMILY_PIN`. |
| Personal booking lanes | Each booking is colored and labeled by family member. |
| Conflict checks | Server Actions reject overlapping stays before they hit the database. |
| Photo memories | Upload photos for a specific day within a stay. |
| Portable branding | Rename the home, footer, metadata, and cookie prefix with env vars. |
| Database optional locally | Run with seeded in-memory demo data until you connect Neon. |
| Spreadsheet migration | Use the scripts in `scripts/` to inspect, parse, and import `.xlsx` calendars. |

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- A Neon Postgres database for real bookings
- A Vercel Blob store if you want image uploads

### Quick Start

```bash
git clone https://github.com/shrimbly/book-the-lakehouse.git
cd book-the-lakehouse
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

With only `.env.example` copied, the app can render with demo data. Add
`DATABASE_URL` when you are ready to persist people, bookings, and photos.

## Simple Setup

The intended production setup is Vercel + Neon:

1. Fork or clone this repo.
2. Create a [Neon](https://neon.com/pricing) Postgres project. The Free plan is enough to get started for a family calendar.
3. Create a [Vercel](https://vercel.com/pricing) project from the repo. The Hobby plan is a good starting point for personal use.
4. Add `DATABASE_URL`, `FAMILY_PIN`, and the `NEXT_PUBLIC_*` settings from `.env.example` in Vercel.
5. Optional: add `BLOB_READ_WRITE_TOKEN` if you want profile photos and stay photos.
6. Run `npm run db:push` once, then `npm run db:seed` to add starter people and sample bookings.

## Environment Variables

Create `.env.local` in the project root:

```bash
FAMILY_PIN=1234
DATABASE_URL=postgres://...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

NEXT_PUBLIC_HOME_NAME="Book the lakehouse"
NEXT_PUBLIC_HOME_KIND=lakehouse
NEXT_PUBLIC_BUILT_BY="Your Name"
NEXT_PUBLIC_SITE_DESCRIPTION="A private family booking calendar for the lakehouse."
NEXT_PUBLIC_FOOTER_TEXT="Book the lakehouse"
NEXT_PUBLIC_HOME_SLUG=book-the-lakehouse
COOKIE_PREFIX=book-the-lakehouse
```

Only `FAMILY_PIN` is required for the PIN gate. `DATABASE_URL` enables the real
database-backed calendar. `BLOB_READ_WRITE_TOKEN` enables photo uploads.

## Database Setup

This project uses Drizzle with Neon Postgres.

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

`src/lib/data.ts` contains the starter people and bookings used by both demo
mode and `npm run db:seed`. Change those records for your own family, then seed
again.

Useful database commands:

```bash
npm run db:studio
npm run db:add-people
npm run db:import-xlsx -- ./path/to/calendar.xlsx
```

The spreadsheet importer is intentionally small and opinionated. Treat it as a
starting point for your old calendar format rather than a universal importer.

## How It Is Organized

| Path | Purpose |
| --- | --- |
| `src/app/` | Next.js app route, metadata, and Server Actions. |
| `src/components/` | Calendar, identity, PIN, photo, and month UI. |
| `src/db/` | Drizzle schema, client, queries, and seed script. |
| `src/lib/site.ts` | Reusable site branding and cookie configuration. |
| `src/lib/data.ts` | Demo and seed data for people and sample bookings. |
| `scripts/` | Spreadsheet inspection, parsing, import, and maintenance helpers. |

## Scripts

```bash
npm run dev          # Start the local Next.js dev server
npm run build        # Build for production
npm run start        # Run the production build
npm run lint         # Run ESLint
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema changes to DATABASE_URL
npm run db:seed      # Seed people and bookings from src/lib/data.ts
```

## Tech Stack

| Tool | Why |
| --- | --- |
| Next.js 16 | App Router, Server Components, Server Actions, and metadata. |
| React 19 | Client interactions for picking, dragging, uploading, and editing. |
| Drizzle | Typed schema and query helpers for Postgres. |
| Neon | Serverless Postgres that deploys cleanly on Vercel. |
| Vercel Blob | Simple public image storage for profile and stay photos. |
| Tailwind CSS 4 | Quiet, responsive styling with a small custom palette. |

## Deploying

The smooth path is Vercel:

1. Create a new Vercel project from this repository.
2. Add Neon Postgres and Vercel Blob storage.
3. Set the environment variables from `.env.example`.
4. Run `npm run db:push` against the production database.
5. Add your people in `src/lib/data.ts`, or with your own script, then seed.

## Contributing

PRs are welcome, especially improvements that make the calendar easier for
another family to adopt. Keep the app small, private-by-default, and easy to
understand. For larger changes, open an issue first so the shape can be talked
through.

## License

MIT. Use it for your own bach, cabin, cottage, or holiday home.
