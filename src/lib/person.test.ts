import { describe, expect, it } from "vitest";
import {
  choosePersonColor,
  generatePersonId,
  normalizePersonName,
  validatePersonName,
} from "./person";

describe("person helpers", () => {
  it("normalizes and validates names", () => {
    expect(normalizePersonName("  Mary   Jane  ")).toBe("Mary Jane");
    expect(validatePersonName("")).toEqual({ error: "Name can't be empty" });
    expect(validatePersonName("A")).toEqual({ ok: true, first: "A" });
  });

  it("generates stable slug-like ids with duplicate fallbacks", () => {
    expect(generatePersonId("Mary Jane", [])).toBe("mary-jane");
    expect(generatePersonId("Mary Jane", ["mary-jane"])).toBe("mary-jane-2");
    expect(generatePersonId("!!!", [])).toBe("person");
  });

  it("chooses requested palette colors or the first unused color", () => {
    expect(choosePersonColor("#3a4e48", [])).toBe("#3a4e48");
    expect(choosePersonColor("#ffffff", [])).toEqual({
      error: "That color isn't in the palette",
    });
    expect(choosePersonColor(undefined, ["#3a4e48"])).toBe("#5a6e4e");
  });
});
