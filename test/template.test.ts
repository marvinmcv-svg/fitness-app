import { describe, expect, it } from "vitest";
import { EXERCISES, TECHNIQUES } from "../src/data/catalog";
import { twiceWeeklyPrimerSplit } from "../src/data/templates/twice-weekly-primer-split";
import { checkPlan, projectWeek, remainingSets } from "../src/domain/planner";
import { defaultRestSec, validateTemplate } from "../src/domain/template";
import type { VolumeTarget } from "../src/domain/types";

const known = {
  exercises: new Set(EXERCISES.map((e) => e.slug)),
  techniques: new Set(TECHNIQUES.map((t) => t.slug)),
};
const exerciseMap = new Map(EXERCISES.map((e) => [e.slug, e]));

describe("catalog integrity", () => {
  it("has unique slugs and known muscles", async () => {
    const { MUSCLES } = await import("../src/data/catalog");
    const muscles = new Set(MUSCLES.map((m) => m.slug));
    expect(known.exercises.size).toBe(EXERCISES.length);
    for (const e of EXERCISES) for (const m of e.muscles) expect(muscles.has(m.muscle), `${e.slug}:${m.muscle}`).toBe(true);
  });
});

describe("validateTemplate", () => {
  it("accepts the house template", () => {
    const result = validateTemplate(twiceWeeklyPrimerSplit, known);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it("reports unknown exercises, techniques and day keys", () => {
    const bad = structuredClone(twiceWeeklyPrimerSplit);
    bad.days[0]!.slots[1]!.exercise = "mystery-press";
    bad.days[0]!.slots[2]!.finishers = ["voodoo"];
    expect(validateTemplate(bad, known)).toEqual({
      ok: false,
      errors: ['push-a[1]: unknown exercise "mystery-press"', 'push-a[2]: unknown technique "voodoo"'],
    });

    const badLayout = { ...twiceWeeklyPrimerSplit, weekLayout: ["push-a", "rest"] };
    const r = validateTemplate(badLayout, known);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.join()).toMatch(/unknown day: rest/);
  });

  it("rejects inverted ranges", () => {
    const bad = structuredClone(twiceWeeklyPrimerSplit);
    bad.days[0]!.slots[1]!.reps = { min: 10, max: 6 };
    const r = validateTemplate(bad, known);
    expect(!r.ok && r.errors.join()).toMatch(/min must be <= max/);
  });
});

describe("defaultRestSec", () => {
  it("uses short rest for primers and longer for main lifts", () => {
    expect(defaultRestSec({ slotType: "primer" })).toBe(75);
    expect(defaultRestSec({ slotType: "main" })).toBe(150);
    expect(defaultRestSec({ slotType: "main", restSec: 200 })).toBe(200);
  });
});

describe("planner", () => {
  const planned = projectWeek(twiceWeeklyPrimerSplit, exerciseMap);

  it("hits every major muscle at least twice a week", () => {
    for (const m of ["chest", "lats", "quads", "hamstrings", "glutes", "side_delts", "biceps", "triceps", "calves"]) {
      expect(planned.get(m)!.frequency, m).toBeGreaterThanOrEqual(2);
    }
  });

  it("ignores primer slots", () => {
    expect(planned.get("rotator_cuff")).toBeUndefined();
  });

  it("warns when a target cannot be met", () => {
    const targets: VolumeTarget[] = [
      { muscle: "chest", minSets: 10, maxSets: 20, minFrequency: 2 },
      { muscle: "calves", minSets: 30, maxSets: 40, minFrequency: 3 },
      { muscle: "abs", minSets: 6, maxSets: 10, minFrequency: 2 },
    ];
    const warnings = checkPlan(planned, targets);
    expect(warnings.filter((w) => w.muscle === "chest")).toEqual([]);
    expect(warnings).toContainEqual({ kind: "below_target", muscle: "calves", planned: 6, target: 30 });
    expect(warnings).toContainEqual({ kind: "low_frequency", muscle: "calves", planned: 2, target: 3 });
    expect(warnings).toContainEqual({ kind: "below_target", muscle: "abs", planned: 0, target: 6 });
  });

  it("warns when the floor already exceeds the maximum", () => {
    const warnings = checkPlan(planned, [{ muscle: "side_delts", minSets: 2, maxSets: 4, minFrequency: 1 }]);
    expect(warnings[0]).toMatchObject({ kind: "above_target", muscle: "side_delts" });
  });

  it("computes remaining sets for the week", () => {
    const logged = new Map([["chest", { effectiveSets: 7.5 }], ["lats", { effectiveSets: 12 }]]);
    expect(
      remainingSets(logged, [
        { muscle: "chest", minSets: 10, maxSets: 20, minFrequency: 2 },
        { muscle: "lats", minSets: 10, maxSets: 20, minFrequency: 2 },
      ]),
    ).toEqual([{ muscle: "chest", remaining: 2.5 }]);
  });
});
