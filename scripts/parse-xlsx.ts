import * as XLSX from "xlsx";

const path = process.argv[2];
if (!path) {
  console.error("usage: tsx scripts/parse-xlsx.ts <path>");
  process.exit(1);
}

const SHEET_NAME_RX = /^([A-Z][a-z]{2})\s*(\d{2})$/;
const MONTH_INDEX: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseSheetName(name: string): { year: number; month: number } | null {
  const m = name.match(SHEET_NAME_RX);
  if (!m) return null;
  const mo = MONTH_INDEX[m[1]];
  if (mo == null) return null;
  return { year: 2000 + parseInt(m[2], 10), month: mo };
}

function isoOf(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const wb = XLSX.readFile(path, { cellDates: true });

type Entry = { date: string; name: string; sheet: string };
const entries: Entry[] = [];

for (const sheetName of wb.SheetNames) {
  const ym = parseSheetName(sheetName);
  if (!ym) continue;
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<string[]>(ws, {
    header: 1,
    raw: false,
    defval: "",
  });

  const lastDayOfMonth = new Date(ym.year, ym.month + 1, 0).getDate();

  type DateRow = { rowIdx: number; days: { col: number; day: number }[] };
  const dateRows: DateRow[] = [];

  // Calendar layout: date row at row 7 (idx 6), then every 4 rows after.
  // Up to 6 week-blocks per month (some months only need 5).
  const DATE_ROW_IDXS = [6, 10, 14, 18, 22, 26];
  let state: "before" | "in" | "after" = "before";
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
        if (d.day === lastDayOfMonth) {
          state = "after";
        }
      }
    }
    if (inMonth.length > 0) {
      dateRows.push({ rowIdx, days: inMonth });
    }
  }

  // Second pass: each week-block is dateRow + up to 3 name rows. Walk each of
  // those rows and grab the first non-empty value per in-month column.
  for (const dr of dateRows) {
    for (const d of dr.days) {
      for (let offset = 1; offset <= 3; offset++) {
        const candRow = data[dr.rowIdx + offset];
        if (!candRow) continue;
        const cell = String(candRow[d.col] ?? "").trim();
        if (cell) {
          entries.push({
            sheet: sheetName,
            date: isoOf(ym.year, ym.month, d.day),
            name: cell,
          });
          break;
        }
      }
    }
  }
}

// Output
console.log("All (date, name) pairs found:\n");
let lastSheet = "";
for (const e of entries) {
  if (e.sheet !== lastSheet) {
    console.log(`\n--- ${e.sheet} ---`);
    lastSheet = e.sheet;
  }
  console.log(`  ${e.date}  ${e.name}`);
}

// Also group consecutive same-name entries into bookings for review
console.log("\n\nGrouped into bookings (consecutive same-name dates → ranges):\n");
const groups: { name: string; start: string; end: string; nights: number }[] = [];
let cur: { name: string; start: string; end: string } | null = null;
function consecutive(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return db.getTime() - da.getTime() === 86400000;
}
function normalize(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}
const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1));
for (const e of sorted) {
  const nm = normalize(e.name);
  if (cur && cur.name.toLowerCase() === nm.toLowerCase() && consecutive(cur.end, e.date)) {
    cur.end = e.date;
  } else {
    if (cur) {
      const nights = Math.round((new Date(cur.end).getTime() - new Date(cur.start).getTime()) / 86400000) + 1;
      groups.push({ ...cur, nights });
    }
    cur = { name: nm, start: e.date, end: e.date };
  }
}
if (cur) {
  const nights = Math.round((new Date(cur.end).getTime() - new Date(cur.start).getTime()) / 86400000) + 1;
  groups.push({ ...cur, nights });
}
for (const g of groups) {
  if (g.start === g.end) {
    console.log(`  ${g.start}                     ${g.name}  (1 night)`);
  } else {
    console.log(`  ${g.start} → ${g.end}  ${g.name}  (${g.nights} nights)`);
  }
}
console.log(`\nTotal: ${entries.length} night cells, ${groups.length} bookings`);
