import { config } from "dotenv";
config({ path: ".env.local" });
import { sql } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as XLSX from "xlsx";
import * as schema from "../src/db/schema";

const xlsxPath = process.argv[2];
if (!xlsxPath) {
  console.error("usage: tsx scripts/import-xlsx.ts <xlsx-path>");
  process.exit(1);
}

const PEOPLE: Record<string, { id: string; first: string; color: string }> = {
  george: { id: "george", first: "George", color: "#3a4e48" },
  willie: { id: "willie", first: "Willie", color: "#6b7a8b" },
  ella: { id: "ella", first: "Ella", color: "#8b6b7a" },
  fred: { id: "fred", first: "Fred", color: "#a8553c" },
  alex: { id: "alex", first: "Alex", color: "#8b6f47" },
  mary: { id: "mary", first: "Mary", color: "#7a8b7a" },
  sez: { id: "sez", first: "Sez", color: "#5e6b51" },
};

const SHEET_NAME_RX = /^([A-Z][a-z]{2})\s*(\d{2})$/;
const MONTH_INDEX: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseSheetName(name: string) {
  const m = name.match(SHEET_NAME_RX);
  if (!m) return null;
  const mo = MONTH_INDEX[m[1]];
  if (mo == null) return null;
  return { year: 2000 + parseInt(m[2], 10), month: mo };
}

function isoOf(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function normalize(raw: string): string | null {
  const lower = raw.toLowerCase().trim();
  const cleaned = lower.replace(/\s+for\s+.+$/i, "").trim();
  if (cleaned === "cooks") return "mary";
  if (cleaned === "aef") return null;
  if (PEOPLE[cleaned]) return cleaned;
  console.warn(`  ⚠ Unrecognized name: "${raw}" — skipping`);
  return null;
}

type Entry = { date: string; personId: string };

function parseXlsx(path: string): Entry[] {
  const wb = XLSX.readFile(path, { cellDates: true });
  const out: Entry[] = [];
  const DATE_ROW_IDXS = [6, 10, 14, 18, 22, 26];

  for (const sheetName of wb.SheetNames) {
    const ym = parseSheetName(sheetName);
    if (!ym) continue;
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<string[]>(ws, {
      header: 1,
      raw: false,
      defval: "",
    });
    const lastDay = new Date(ym.year, ym.month + 1, 0).getDate();
    let state: "before" | "in" | "after" = "before";
    type DR = { rowIdx: number; days: { col: number; day: number }[] };
    const drs: DR[] = [];

    for (const rowIdx of DATE_ROW_IDXS) {
      const row = data[rowIdx];
      if (!row) continue;
      const days: { col: number; day: number }[] = [];
      for (let col = 0; col < 7; col++) {
        const raw = String(row[col] ?? "").trim();
        if (!/^\d{1,2}$/.test(raw)) continue;
        const day = parseInt(raw, 10);
        if (day < 1 || day > 31) continue;
        days.push({ col, day });
      }
      if (days.length === 0) continue;
      const inMonth: typeof days = [];
      for (const d of days) {
        if (state === "before") {
          if (d.day === 1) state = "in";
          else continue;
        }
        if (state === "in") {
          inMonth.push(d);
          if (d.day === lastDay) state = "after";
        }
      }
      if (inMonth.length > 0) drs.push({ rowIdx, days: inMonth });
    }

    for (const dr of drs) {
      for (const d of dr.days) {
        for (let offset = 1; offset <= 3; offset++) {
          const candRow = data[dr.rowIdx + offset];
          if (!candRow) continue;
          const cell = String(candRow[d.col] ?? "").trim();
          if (!cell) continue;
          const personId = normalize(cell);
          if (!personId) break; // skipped name; don't try further rows
          out.push({ date: isoOf(ym.year, ym.month, d.day), personId });
          break;
        }
      }
    }
  }
  return out;
}

type Booking = { id: string; personId: string; start: string; end: string };

function group(entries: Entry[]): Booking[] {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1));
  const bookings: Booking[] = [];
  let cur: { personId: string; start: string; end: string } | null = null;
  for (const e of sorted) {
    const nextDay = (iso: string): string => {
      const d = new Date(iso + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().slice(0, 10);
    };
    if (
      cur &&
      cur.personId === e.personId &&
      nextDay(cur.end) === e.date
    ) {
      cur.end = e.date;
    } else {
      if (cur) {
        bookings.push({ id: crypto.randomUUID(), ...cur });
      }
      cur = { personId: e.personId, start: e.date, end: e.date };
    }
  }
  if (cur) bookings.push({ id: crypto.randomUUID(), ...cur });
  return bookings;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set");
  }
  console.log(`\nParsing ${xlsxPath}…`);
  const entries = parseXlsx(xlsxPath);
  console.log(`  ${entries.length} night-cells found`);
  const bookings = group(entries);
  console.log(`  ${bookings.length} bookings after grouping\n`);

  const conn = neon(process.env.DATABASE_URL);
  const db = drizzle(conn, { schema });

  console.log("Wiping existing rows…");
  await db.execute(sql`TRUNCATE TABLE ${schema.bookings} RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.people} RESTART IDENTITY CASCADE`);

  console.log("Inserting people…");
  const peopleRows = Object.values(PEOPLE).map((p) => ({
    id: p.id,
    firstName: p.first,
    color: p.color,
  }));
  await db.insert(schema.people).values(peopleRows);

  console.log("Inserting bookings…");
  await db.insert(schema.bookings).values(
    bookings.map((b) => ({
      id: b.id,
      personId: b.personId,
      startDate: b.start,
      endDate: b.end,
    })),
  );

  console.log(`\n✓ Imported ${peopleRows.length} people and ${bookings.length} bookings\n`);
  console.log("Bookings:");
  for (const b of bookings) {
    const nights =
      Math.round(
        (new Date(b.end).getTime() - new Date(b.start).getTime()) / 86400000,
      ) + 1;
    const tag =
      b.start === b.end ? b.start : `${b.start} → ${b.end}`;
    console.log(`  ${tag.padEnd(30)} ${b.personId.padEnd(10)} (${nights} night${nights === 1 ? "" : "s"})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
