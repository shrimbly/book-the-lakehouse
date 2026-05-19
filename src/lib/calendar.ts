import type { Booking, Person } from "./data";

export type Cell = {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
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
): Cell[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7;
  const total = Math.ceil((startOffset + last.getDate()) / 7) * 7;

  const cells: Cell[] = [];
  for (let i = 0; i < total; i++) {
    const dayNum = i - startOffset + 1;
    const date = new Date(year, month, dayNum);
    const cellIso = iso(date.getFullYear(), date.getMonth(), date.getDate());
    const inMonth = date.getMonth() === month;

    let booking: Cell["booking"] = null;
    if (inMonth) {
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
      isToday: cellIso === today,
      booking,
    });
  }
  return cells;
}
