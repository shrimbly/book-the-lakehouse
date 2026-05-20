import { describe, expect, it } from "vitest";
import {
  isIsoDate,
  nightsBetween,
  rangesOverlap,
  shiftIsoDate,
  validateIsoRange,
} from "./iso-date";

describe("iso-date helpers", () => {
  it("validates real ISO calendar dates", () => {
    expect(isIsoDate("2026-05-20")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("20-05-2026")).toBe(false);
  });

  it("validates ordered date ranges", () => {
    expect(validateIsoRange("2026-05-20", "2026-05-21")).toEqual({ ok: true });
    expect(validateIsoRange("2026-05-22", "2026-05-21")).toEqual({
      error: "Start date is after end date",
    });
  });

  it("counts same-day stays as one night", () => {
    expect(nightsBetween("2026-05-20", "2026-05-20")).toBe(1);
    expect(nightsBetween("2026-05-20", "2026-05-23")).toBe(3);
  });

  it("shifts ISO dates without local timezone drift", () => {
    expect(shiftIsoDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftIsoDate("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("detects overlap but allows adjacent ranges", () => {
    expect(
      rangesOverlap("2026-05-20", "2026-05-22", "2026-05-22", "2026-05-24"),
    ).toBe(true);
    expect(
      rangesOverlap("2026-05-20", "2026-05-22", "2026-05-23", "2026-05-24"),
    ).toBe(false);
  });
});
