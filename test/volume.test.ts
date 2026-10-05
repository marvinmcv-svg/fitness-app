import { describe, expect, it } from "vitest";
import { computeWeeklyVolume, setCredit } from "../src/domain/volume";
import { catalog, ex, set, workout } from "./fixtures";

describe("setCredit", () => {
  it("counts a completed set as 1 and adds segment credit", () => {
    expect(setCredit(set(8), catalog)).toBe(1);
    expect(setCredit(set(8, { segments: [{ technique: "partials", reps: 4 }] }), catalog)).toBe(1.25);
    expect(setCredit(set(8, { segments: [{ technique: "partials", reps: 0 }] }), catalog)).toBe(1);
  });

  it("gives no credit to a set with no reps unless it is a technique set", () => {
    expect(setCredit(set(null), catalog)).toBe(0);
    expect(setCredit(set(null, { technique: "trap-set" }), catalog)).toBe(1);
  });

  it("throws on unknown techniques", () => {
    expect(() => setCredit(set(8, { segments: [{ technique: "nope", reps: 1 }] }), catalog)).toThrow(/Unknown technique/);
  });
});

describe("computeWeeklyVolume", () => {
  const monday = "2025-01-06T10:00:00Z";
  const thursday = "2025-01-09T10:00:00Z";

  it("credits primary and secondary muscles by factor and excludes primers", () => {
    const w = workout(monday, [
      ex("band-external-rotation", [set(15), set(15)], "primer"),
      ex("incline-db-press", [set(8), set(7), set(6)]),
      ex("cable-crossover", [set(12), set(10, { segments: [{ technique: "partials", reps: 5 }] })], "accessory"),
    ]);
    const week = computeWeeklyVolume([w], catalog).get("2025-W02")!;

    expect(week.get("rotator_cuff")).toBeUndefined();
    expect(week.get("chest")!.effectiveSets).toBe(3 + 2.25);
    expect(week.get("triceps")!.effectiveSets).toBe(1.5);
    expect(week.get("front_delts")!.effectiveSets).toBeCloseTo(1.5 + 2.25 * 0.25, 2);
    expect(week.get("chest")!.sessions).toBe(1);
  });

  it("excludes warm-up sets inside a working slot", () => {
    const w = workout(monday, [ex("back-squat", [set(5, { setType: "warmup" }), set(5), set(5)])]);
    expect(computeWeeklyVolume([w], catalog).get("2025-W02")!.get("quads")!.effectiveSets).toBe(2);
  });

  it("counts sessions per muscle per week and splits weeks", () => {
    const result = computeWeeklyVolume(
      [
        workout(monday, [ex("flat-db-press", [set(8)])]),
        workout(thursday, [ex("incline-db-press", [set(8)])]),
        workout("2025-01-13T10:00:00Z", [ex("flat-db-press", [set(8)])]),
      ],
      catalog,
    );
    expect(result.get("2025-W02")!.get("chest")).toEqual({ muscle: "chest", effectiveSets: 2, sessions: 2 });
    expect(result.get("2025-W03")!.get("chest")!.sessions).toBe(1);
  });

  it("can count primary muscles only", () => {
    const w = workout(monday, [ex("flat-db-press", [set(8)])]);
    const week = computeWeeklyVolume([w], catalog, { minMuscleFactor: 1 }).get("2025-W02")!;
    expect([...week.keys()]).toEqual(["chest"]);
  });

  it("throws on unknown exercises", () => {
    expect(() => computeWeeklyVolume([workout(monday, [ex("nope", [set(5)])])], catalog)).toThrow(/Unknown exercise/);
  });
});
