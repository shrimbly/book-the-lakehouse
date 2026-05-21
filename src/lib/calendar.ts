import type { Booking, Person } from "./data";

export type Cell = {
  iso: string;
  day: number;
  inMonth: boolean;
  selectable: boolean;
  isToday: boolean;
  monthOffset: number;
  virtualState: "resolved" | "preview" | null;
  booking: {
    id: string;
    person: Person;
    isStart: boolean;
    isEnd: boolean;
  } | null;
};

const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const DOW_MON_FIRST = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function buildMonthCells(
  year: number,
  month: number,
  bookings: Booking[],
  people: Person[],
  today: string,
  options: {
    resolvedNextRows?: number;
    includeNextPreviewRow?: boolean;
    selectTrailingNextMonth?: boolean;
  } = {},
): Cell[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7;
  const total = Math.ceil((startOffset + last.getDate()) / 7) * 7;
  const maxNextRows = maxNextRowsForMonth(year, month);
  const resolvedNextRows = Math.min(
    maxNextRows,
    Math.max(0, options.resolvedNextRows ?? 0),
  );
  const includeNextPreviewRow =
    !!options.includeNextPreviewRow && resolvedNextRows < maxNextRows;
  const extraRows = resolvedNextRows + (includeNextPreviewRow ? 1 : 0);
  const previewRowIndex = includeNextPreviewRow
    ? Math.ceil(total / 7) + resolvedNextRows
    : null;

  const cells: Cell[] = [];
  for (let i = 0; i < total + extraRows * 7; i++) {
    const dayNum = i - startOffset + 1;
    const date = new Date(year, month, dayNum);
    const cellIso = iso(date.getFullYear(), date.getMonth(), date.getDate());
    const inMonth = date.getMonth() === month;
    const monthOffset =
      (date.getFullYear() - year) * 12 + (date.getMonth() - month);
    const rowIndex = Math.floor(i / 7);
    const virtualState =
      rowIndex >= Math.ceil(total / 7)
        ? rowIndex === previewRowIndex
          ? "preview"
          : "resolved"
        : null;
    const selectable =
      inMonth ||
      (monthOffset === 1 &&
        (virtualState === "resolved" ||
          (virtualState === null && !!options.selectTrailingNextMonth)));

    let booking: Cell["booking"] = null;
    if (selectable || monthOffset === 1) {
      const b = bookings.find((b) => cellIso >= b.start && cellIso <= b.end);
      if (b) {
        const person = people.find((p) => p.id === b.personId);
        if (person) {
          booking = {
            id: b.id,
            person,
            isStart: cellIso === b.start,
            isEnd: cellIso === b.end,
          };
        }
      }
    }

    cells.push({
      iso: cellIso,
      day: date.getDate(),
      inMonth,
      selectable,
      isToday: cellIso === today,
      monthOffset,
      virtualState,
      booking,
    });
  }
  return cells;
}

export function maxNextRowsForMonth(year: number, month: number): number {
  return rowsBetween(
    lastVisibleBaseDate(year, month),
    new Date(year, month + 2, 0),
  );
}

export function nextRowsNeededForIso(
  year: number,
  month: number,
  value: string,
): number {
  const date = new Date(`${value}T00:00:00`);
  const monthOffset =
    (date.getFullYear() - year) * 12 + (date.getMonth() - month);
  if (monthOffset < 1) return 0;
  if (monthOffset > 1) return maxNextRowsForMonth(year, month);
  return rowsBetween(lastVisibleBaseDate(year, month), date);
}

function lastVisibleBaseDate(year: number, month: number): Date {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7;
  const total = Math.ceil((startOffset + last.getDate()) / 7) * 7;
  return new Date(year, month, total - startOffset);
}

function rowsBetween(start: Date, end: Date): number {
  if (end <= start) return 0;
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.ceil((end.getTime() - start.getTime()) / dayMs);
  return Math.ceil(days / 7);
}
