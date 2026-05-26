---
description: Configure this repo for a new family — Vercel link, Neon, Blob, env vars, schema push, seed.
---

You're guiding the user through setting up this repository — the "Book the lakehouse" family booking calendar — for their own family and Vercel project.

The repo has a Node-based wizard at `scripts/setup.js` (`npm run setup`), but you can do this conversationally instead, which works much better inside Claude Code than a TTY-readline script.

Walk through the steps below. Use **AskUserQuestion** for choices and inputs. Use **Bash** for commands. When a command is interactive (`vercel link`, `vercel login`), tell the user to type `! <command>` in the prompt so they handle the prompts directly in their terminal.

Be friendly but tight. Use the user's actual answers — don't invent values. Confirm before destructive steps (`db:push` modifies their database schema; `db:seed` inserts sample rows).

### 1. Tooling check
Run `npx vercel --version`. If it fails, tell the user they need Node.js + npm, and ask if they want to continue. If they don't have a Vercel CLI session, they can run `! npx vercel login` to authenticate.

### 2. Vercel project
Ask whether they already have a Vercel project linked to this repo's GitHub fork. If not, walk them through:
- Push their fork to GitHub
- Sign up at https://vercel.com (Hobby plan is enough)
- "Add New… → Project" and import the GitHub repo

### 3. Storage integrations
In the Vercel project's **Storage** tab they should:
- Connect Database → Postgres (Neon) — for bookings and people
- Connect Store → Blob — for profile and stay photos

Wait for them to confirm both before continuing.

### 4. Link this workspace
Tell the user to run `! npx vercel link` themselves so the interactive prompts work cleanly. Confirm it's linked by checking for `.vercel/project.json`.

### 5. Pull env vars
Run `npx vercel env pull .env.local`. This populates `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, and the various `PG*` / `POSTGRES_*` keys. Do **not** overwrite or remove these in subsequent steps — read the existing `.env.local`, add/update the family-specific keys, and write the merged result back.

### 6. Family-specific settings
Ask the user for these (group sensible questions into a single AskUserQuestion call where possible):

**Required**
- `FAMILY_PIN` — 4 digits (default 1234 only if they don't care)
- `NEXT_PUBLIC_HOME_NAME` — name shown across the app
- `NEXT_PUBLIC_SITE_DESCRIPTION` — used for HTML meta
- `NEXT_PUBLIC_FOOTER_TEXT` — footer copy
- `NEXT_PUBLIC_REPO_URL` — link in footer (their fork's GitHub URL)
- `MARY_IDS` — comma-separated list of admin person IDs (default `mary`)
- `COOKIE_PREFIX` — server cookie prefix (default `book-the-lakehouse`)

**Optional (skip if they say no to "do family members pay per stay?")**
- `BOOKING_COST_PER_NIGHT`
- `BOOKING_COST_CURRENCY` (e.g. NZD, USD)
- `PAYMENT_ACCOUNT_NAME`
- `PAYMENT_ACCOUNT_NUMBER`
- `PAYMENT_REFERENCE`
- `PAYMENT_NOTE`

Read `.env.local`, merge these in (don't clobber the pulled Vercel keys), write it back.

### 7. Sync schema + seed
Run `npm run db:push`. If it succeeds, ask whether they want sample family members and bookings — if yes, run `npm run db:seed`. Tell them they can re-seed any time.

### 8. Wrap up
Tell them:
- `npm run dev` to run locally on http://localhost:3000
- Commit their changes (but `.env.local` is gitignored — they don't commit it)
- `git push` and Vercel will deploy automatically
- `npm run db:studio` to browse / edit the database

If anything went wrong along the way, summarise what they still need to do manually.
