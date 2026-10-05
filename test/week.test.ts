import { describe, expect, it } from "vitest";
import { isoWeekKey } from "../src/domain/week";

describe("isoWeekKey", () => {
  it.each([
    ["2025-01-06T10:00:00Z", "2025-W02"],
    ["2025-01-05T23:00:00Z", "2025-W01"],
    ["2024-12-30T00:00:00Z", "2025-W01"], // ISO year differs from calendar year
    ["2021-01-03T00:00:00Z", "2020-W53"],
    ["2026-10-05T00:00:00Z", "2026-W41"],
  ])("%s -> %s", (input, expected) => {
    expect(isoWeekKey(input)).toBe(expected);
  });

  it("rejects invalid dates", () => {
    expect(() => isoWeekKey("not a date")).toThrow();
  });
});
