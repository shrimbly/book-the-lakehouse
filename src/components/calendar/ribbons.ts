import type { Cell } from "@/lib/calendar";
import type { Booking, Person } from "@/lib/data";
import { rangesOverlap } from "@/lib/iso-date";

export type CalendarPreview = {
  start: string;
  end: string;
};

export type RowRibbon = {
  gridRow: number;
  startCol: number;
  endCol: number;
  startCellIso: string;
  roundLeft: boolean;
  roundRight: boolean;
};

export type BookingRow = {
  bookingKey: string;
  bookingId: string;
  personId: string;
  color: string;
  initial: string;
  name: string;
  imageUrl: string | null;
  gridRow: number;
  startCol: number;
  endCol: number;
  isBookingStart: boolean;
  roundLeft: boolean;
  roundRight: boolean;
  muted: boolean;
};

type RibbonCell = {
  iso: string;
  gridRow: number;
  col: number;
  monthOffset: number;
};

type ContiguousCell = {
  iso: string;
  gridRow: number;
  col: number;
};

export function rangeOverlapsBookings(
  start: string,
  end: string,
  bookings: Booking[],
  excludeId?: string | null,
): boolean {
  return bookings.some((booking) => {
    if (excludeId && booking.id === excludeId) return false;
    return rangesOverlap(start, end, booking.start, booking.end);
  });
}

export function buildBookingRows({
  bookings,
  cells,
  people,
  editingId,
}: {
  bookings: Booking[];
  cells: Cell[];
  people: Person[];
  editingId?: string | null;
}): BookingRow[] {
  const allRows: BookingRow[] = [];

  for (const booking of bookings) {
    if (editingId && booking.id === editingId) continue;

    const person = people.find((candidate) => candidate.id === booking.personId);
    if (!person) continue;

    const bookingCells = visibleBookingCells(cells, booking);
    if (bookingCells.length === 0) continue;

    const bookingRows = buildRowsForBooking(person, booking, bookingCells);
    markVisibleBookingEdges(bookingRows, booking, bookingCells);
    allRows.push(...bookingRows);
  }

  return allRows;
}

export function buildPreviewRows(
  preview: CalendarPreview | null,
  cells: Cell[],
): RowRibbon[] {
  if (!preview) return [];

  const previewIsoDates = new Set<string>();
  for (const cell of cells) {
    if (
      cell.selectable &&
      !cell.booking &&
      cell.iso >= preview.start &&
      cell.iso <= preview.end
    ) {
      previewIsoDates.add(cell.iso);
    }
  }

  const rows = contiguousRows(
    cells
      .map((cell, index) => ({ cell, index }))
      .filter(({ cell }) => previewIsoDates.has(cell.iso))
      .map(({ cell, index }) => ({
        iso: cell.iso,
        gridRow: Math.floor(index / 7) + 2,
        col: (index % 7) + 1,
      })),
  );

  markPreviewEdges(rows, cells, previewIsoDates);
  return rows;
}

export function firstVisibleCellByBooking(cells: Cell[]): Map<string, string> {
  const firstVisible = new Map<string, string>();
  for (const cell of cells) {
    if (!isVisibleBookingCell(cell) || !cell.booking) continue;
    if (!firstVisible.has(cell.booking.id)) {
      firstVisible.set(cell.booking.id, cell.iso);
    }
  }
  return firstVisible;
}

function visibleBookingCells(cells: Cell[], booking: Booking): RibbonCell[] {
  return cells.flatMap((cell, index) => {
    if (!isVisibleBookingCell(cell)) return [];
    if (cell.iso < booking.start || cell.iso > booking.end) return [];
    return {
      iso: cell.iso,
      gridRow: Math.floor(index / 7) + 2,
      col: (index % 7) + 1,
      monthOffset: cell.monthOffset,
    };
  });
}

function isVisibleBookingCell(cell: Cell): boolean {
  return cell.inMonth || cell.monthOffset === 1;
}

function buildRowsForBooking(
  person: Person,
  booking: Booking,
  bookingCells: RibbonCell[],
): BookingRow[] {
  const rows: BookingRow[] = [];

  for (const bookingCell of bookingCells) {
    const last = rows[rows.length - 1];
    if (
      last &&
      last.gridRow === bookingCell.gridRow &&
      bookingCell.col === last.endCol
    ) {
      last.endCol = bookingCell.col + 1;
      continue;
    }

    rows.push({
      bookingKey: `${person.id}-${booking.start}-${bookingCell.gridRow}-${bookingCell.col}`,
      bookingId: booking.id,
      personId: person.id,
      color: person.color,
      initial: person.initial,
      name: person.first,
      imageUrl: person.imageUrl,
      gridRow: bookingCell.gridRow,
      startCol: bookingCell.col,
      endCol: bookingCell.col + 1,
      isBookingStart: false,
      roundLeft: false,
      roundRight: false,
      muted: bookingCell.monthOffset === 1,
    });
  }

  return rows;
}

function markVisibleBookingEdges(
  rows: BookingRow[],
  booking: Booking,
  bookingCells: RibbonCell[],
) {
  const firstCellIso = bookingCells[0]?.iso;
  const lastCellIso = bookingCells[bookingCells.length - 1]?.iso;

  if (!rows[0] || !firstCellIso || !lastCellIso) return;

  rows[0].isBookingStart = true;
  for (const row of rows) {
    row.roundLeft = true;
    row.roundRight = true;
  }

  if (firstCellIso !== booking.start) {
    rows[0].roundLeft = false;
  }
  if (lastCellIso !== booking.end) {
    rows[rows.length - 1].roundRight = false;
  }
}

function contiguousRows(cells: ContiguousCell[]): RowRibbon[] {
  const rows: RowRibbon[] = [];

  for (const cell of cells) {
    const last = rows[rows.length - 1];
    if (last && last.gridRow === cell.gridRow && cell.col === last.endCol) {
      last.endCol = cell.col + 1;
      continue;
    }

    rows.push({
      gridRow: cell.gridRow,
      startCol: cell.col,
      endCol: cell.col + 1,
      startCellIso: cell.iso,
      roundLeft: false,
      roundRight: false,
    });
  }

  return rows;
}

function markPreviewEdges(
  rows: RowRibbon[],
  cells: Cell[],
  previewIsoDates: Set<string>,
) {
  for (const row of rows) {
    const startIndex = cells.findIndex((cell) => cell.iso === row.startCellIso);
    const previous = cells[startIndex - 1];
    row.roundLeft = !previous || !previewIsoDates.has(previous.iso);

    const endIndex = startIndex + (row.endCol - row.startCol) - 1;
    const next = cells[endIndex + 1];
    row.roundRight = !next || !previewIsoDates.has(next.iso);
  }
}
