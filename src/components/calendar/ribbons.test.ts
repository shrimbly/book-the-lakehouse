import { describe, expect, it } from "vitest";
import { buildMonthCells } from "@/lib/calendar";
import type { Booking, Person } from "@/lib/data";
import {
  buildBookingRows,
  buildPreviewRows,
  firstVisibleCellByBooking,
  rangeOverlapsBookings,
} from "./ribbons";

const people: Person[] = [
  {
    id: "willie",
    first: "Willie",
    initial: "W",
    color: "#276749",
    imageUrl: null,
  },
  {
    id: "amy",
    first: "Amy",
    initial: "A",
    color: "#805ad5",
    imageUrl: "https://example.com/amy.jpg",
  },
];

function monthCells(bookings: Booking[] = []) {
  return buildMonthCells(2026, 4, bookings, people, "2026-05-20");
}

describe("calendar ribbon helpers", () => {
  it("detects booking overlap while allowing adjacent bookings", () => {
    const bookings = [
      { id: "a", personId: "willie", start: "2026-05-10", end: "2026-05-12" },
    ];

    expect(rangeOverlapsBookings("2026-05-12", "2026-05-14", bookings)).toBe(
      true,
    );
    expect(rangeOverlapsBookings("2026-05-13", "2026-05-14", bookings)).toBe(
      false,
    );
    expect(
      rangeOverlapsBookings("2026-05-12", "2026-05-14", bookings, "a"),
    ).toBe(false);
  });

  it("splits a booking across visible week rows", () => {
    const bookings = [
      { id: "a", personId: "willie", start: "2026-05-01", end: "2026-05-05" },
    ];

    expect(buildBookingRows({ bookings, cells: monthCells(bookings), people }))
      .toMatchObject([
        {
          bookingId: "a",
          gridRow: 2,
          startCol: 5,
        endCol: 8,
        isBookingStart: true,
        muted: false,
        roundLeft: true,
        roundRight: true,
      },
        {
          bookingId: "a",
          gridRow: 3,
        startCol: 1,
        endCol: 3,
        isBookingStart: false,
        muted: false,
        roundLeft: true,
        roundRight: true,
      },
      ]);
  });

  it("leaves a hard edge when a booking is clipped by the current month", () => {
    const bookings = [
      { id: "a", personId: "amy", start: "2026-04-29", end: "2026-05-03" },
      { id: "b", personId: "willie", start: "2026-05-30", end: "2026-06-03" },
    ];

    const rows = buildBookingRows({ bookings, cells: monthCells(bookings), people });

    expect(rows[0]).toMatchObject({
      bookingId: "a",
      startCol: 5,
      endCol: 8,
      roundLeft: false,
      roundRight: true,
      imageUrl: "https://example.com/amy.jpg",
    });
    expect(rows.at(-1)).toMatchObject({
      bookingId: "b",
      startCol: 6,
      endCol: 8,
      roundLeft: true,
      roundRight: false,
    });
  });

  it("tracks the first visible cell for photo stack offsets", () => {
    const bookings = [
      { id: "a", personId: "amy", start: "2026-04-29", end: "2026-05-03" },
    ];

    expect(firstVisibleCellByBooking(monthCells(bookings)).get("a")).toBe(
      "2026-05-01",
    );
  });

  it("renders booking ribbons on trailing next-month cells", () => {
    const bookings = [
      { id: "a", personId: "amy", start: "2026-04-02", end: "2026-04-03" },
    ];
    const cells = buildMonthCells(2026, 2, bookings, people, "2026-03-20");

    expect(buildBookingRows({ bookings, cells, people })).toMatchObject([
      {
        bookingId: "a",
        gridRow: 7,
        startCol: 4,
        endCol: 6,
        isBookingStart: true,
        muted: true,
        roundLeft: true,
        roundRight: true,
      },
    ]);
    expect(firstVisibleCellByBooking(cells).get("a")).toBe("2026-04-02");
  });

  it("builds preview rows only over empty in-month cells", () => {
    const bookings = [
      { id: "a", personId: "willie", start: "2026-05-04", end: "2026-05-04" },
    ];

    expect(
      buildPreviewRows(
        { start: "2026-05-02", end: "2026-05-06" },
        monthCells(bookings),
      ),
    ).toEqual([
      {
        gridRow: 2,
        startCol: 6,
        endCol: 8,
        startCellIso: "2026-05-02",
        roundLeft: true,
        roundRight: true,
      },
      {
        gridRow: 3,
        startCol: 2,
        endCol: 4,
        startCellIso: "2026-05-05",
        roundLeft: true,
        roundRight: true,
      },
    ]);
  });

  it("builds preview rows across resolved next-month virtual cells", () => {
    const cells = buildMonthCells(2026, 4, [], people, "2026-05-20", {
      resolvedNextRows: 1,
    });

    expect(
      buildPreviewRows({ start: "2026-05-31", end: "2026-06-04" }, cells),
    ).toEqual([
      {
        gridRow: 6,
        startCol: 7,
        endCol: 8,
        startCellIso: "2026-05-31",
        roundLeft: true,
        roundRight: false,
      },
      {
        gridRow: 7,
        startCol: 1,
        endCol: 5,
        startCellIso: "2026-06-01",
        roundLeft: false,
        roundRight: true,
      },
    ]);
  });

  it("builds preview rows over open trailing next-month days before a later booking", () => {
    const bookings = [
      { id: "a", personId: "amy", start: "2026-04-04", end: "2026-04-05" },
    ];
    const cells = buildMonthCells(
      2026,
      2,
      bookings,
      people,
      "2026-03-20",
      { selectTrailingNextMonth: true },
    );

    expect(
      buildPreviewRows({ start: "2026-03-31", end: "2026-04-02" }, cells),
    ).toEqual([
      {
        gridRow: 7,
        startCol: 2,
        endCol: 5,
        startCellIso: "2026-03-31",
        roundLeft: true,
        roundRight: true,
      },
    ]);
  });
});
