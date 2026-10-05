import { describe, expect, it } from "vitest";
import { nextProgression, progressionRuleSchema, roundToIncrement, type SessionResult } from "../src/domain/progression";

const session = (weight: number, ...reps: number[]): SessionResult => ({ sets: reps.map((r) => ({ weight, reps: r })) });

describe("double progression", () => {
  const rule = progressionRuleSchema.parse({ type: "double_progression", repsMin: 6, repsMax: 8, increment: 2.5 });

  it("increases load when every set hits the top of the range", () => {
    expect(nextProgression(rule, [session(30, 8, 8, 8)])).toMatchObject({ action: "increase", weight: 32.5, targetReps: 6 });
  });

  it("holds otherwise", () => {
    expect(nextProgression(rule, [session(30, 8, 8, 7)])).toMatchObject({ action: "hold", weight: 30 });
  });

  it("returns null without history", () => {
    expect(nextProgression(rule, [])).toBeNull();
  });
});

describe("linear progression with stall deload", () => {
  const rule = progressionRuleSchema.parse({ type: "linear", sets: 3, reps: 5, increment: 5 });

  it("applies defaults", () => {
    expect(rule).toMatchObject({ stallLimit: 3, deloadPct: 0.1 });
  });

  it("adds load after a completed session", () => {
    expect(nextProgression(rule, [session(100, 5, 5, 5)])).toMatchObject({ action: "increase", weight: 105 });
  });

  it("repeats load after one or two misses", () => {
    expect(nextProgression(rule, [session(100, 5, 5, 4)])).toMatchObject({ action: "hold", weight: 100 });
    expect(nextProgression(rule, [session(100, 5, 5, 4), session(100, 5, 4, 4)])).toMatchObject({ action: "hold" });
  });

  it("deloads after three straight misses at the same load", () => {
    const history = [session(95, 5, 5, 5), session(100, 5, 5, 4), session(100, 5, 4, 4), session(100, 5, 5, 3)];
    expect(nextProgression(rule, history, 2.5)).toMatchObject({ action: "deload", weight: 90 });
  });

  it("resets the stall count when load changes", () => {
    const history = [session(110, 5, 4, 4), session(110, 4, 4, 4), session(100, 5, 5, 4)];
    expect(nextProgression(rule, history)).toMatchObject({ action: "hold", weight: 100 });
  });

  it("treats too few sets as a miss", () => {
    expect(nextProgression(rule, [session(100, 5, 5)])).toMatchObject({ action: "hold" });
  });
});

describe("rep target", () => {
  it("asks to beat the best set", () => {
    const rule = progressionRuleSchema.parse({ type: "rep_target" });
    expect(nextProgression(rule, [session(0, 14)])).toMatchObject({ action: "hold", targetReps: 15 });
  });
});

describe("roundToIncrement", () => {
  it("rounds to the nearest step", () => {
    expect(roundToIncrement(91.3, 2.5)).toBe(92.5);
    expect(roundToIncrement(91.3, 0)).toBe(91.3);
  });
});
