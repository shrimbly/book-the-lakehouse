import { describe, expect, it } from "vitest";
import {
  buildMonthCells,
  maxNextRowsForMonth,
  nextRowsNeededForIso,
} from "./calendar";
import type { Booking, Person } from "./data";

const people: Person[] = [
  {
    id: "willie",
    first: "Willie",
    initial: "W",
    color: "#276749",
    imageUrl: null,
  },
];

describe("calendar cell helpers", () => {
  it("builds current-month cells without permanent virtual rows", () => {
    const cells = buildMonthCells(2026, 4, [], people, "2026-05-20");

    expect(cells).toHaveLength(35);
    expect(cells.at(-1)).toMatchObject({
      iso: "2026-05-31",
      inMonth: true,
      selectable: true,
      virtualState: null,
    });
  });

  it("adds a glassy preview row for the next chronological week", () => {
    const cells = buildMonthCells(2026, 4, [], people, "2026-05-20", {
      includeNextPreviewRow: true,
    });

    expect(cells).toHaveLength(42);
    expect(cells.slice(-7).map((cell) => cell.iso)).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
      "2026-06-06",
      "2026-06-07",
    ]);
    expect(cells.at(-1)).toMatchObject({
      selectable: false,
      monthOffset: 1,
      virtualState: "preview",
      booking: null,
    });
  });

  it("shows next-month booking data in a glassy preview row", () => {
    const bookings: Booking[] = [
      { id: "stay", personId: "willie", start: "2026-06-04", end: "2026-06-06" },
    ];
    const cells = buildMonthCells(
      2026,
      4,
      bookings,
      people,
      "2026-05-20",
      { includeNextPreviewRow: true },
    );

    expect(cells.find((cell) => cell.iso === "2026-06-05")).toMatchObject({
      selectable: false,
      virtualState: "preview",
      booking: { id: "stay" },
    });
  });

  it("shows next-month booking data in ordinary trailing grid cells", () => {
    const bookings: Booking[] = [
      { id: "stay", personId: "willie", start: "2026-04-02", end: "2026-04-03" },
    ];
    const cells = buildMonthCells(2026, 2, bookings, people, "2026-03-20");

    expect(cells.find((cell) => cell.iso === "2026-04-02")).toMatchObject({
      inMonth: false,
      selectable: false,
      monthOffset: 1,
      virtualState: null,
      booking: { id: "stay" },
    });
  });

  it("can make ordinary trailing next-month cells selectable during a drag", () => {
    const bookings: Booking[] = [
      { id: "stay", personId: "willie", start: "2026-04-04", end: "2026-04-05" },
    ];
    const cells = buildMonthCells(
      2026,
      2,
      bookings,
      people,
      "2026-03-20",
      { selectTrailingNextMonth: true },
    );

    expect(cells.find((cell) => cell.iso === "2026-04-02")).toMatchObject({
      inMonth: false,
      selectable: true,
      monthOffset: 1,
      virtualState: null,
      booking: null,
    });
    expect(cells.find((cell) => cell.iso === "2026-04-04")).toMatchObject({
      selectable: true,
      booking: { id: "stay" },
    });
  });

  it("resolves next-month rows with conflict booking data", () => {
    const bookings: Booking[] = [
      { id: "stay", personId: "willie", start: "2026-06-04", end: "2026-06-06" },
    ];
    const cells = buildMonthCells(
      2026,
      4,
      bookings,
      people,
      "2026-05-20",
      { resolvedNextRows: 1 },
    );

    expect(cells.find((cell) => cell.iso === "2026-06-05")).toMatchObject({
      selectable: true,
      virtualState: "resolved",
      booking: { id: "stay" },
    });
  });

  it("caps virtual rows to the next month", () => {
    expect(maxNextRowsForMonth(2026, 4)).toBe(5);
    expect(nextRowsNeededForIso(2026, 4, "2026-06-30")).toBe(5);
    expect(nextRowsNeededForIso(2026, 4, "2026-07-15")).toBe(5);

    const cells = buildMonthCells(2026, 4, [], people, "2026-05-20", {
      resolvedNextRows: 99,
      includeNextPreviewRow: true,
    });
    expect(cells).toHaveLength(70);
    expect(cells.at(-1)?.iso).toBe("2026-07-05");
    expect(cells.at(-1)).toMatchObject({
      selectable: false,
      monthOffset: 2,
      virtualState: "resolved",
    });
  });
});
