import { describe, expect, it } from "vitest";
import { EXERCISES, TECHNIQUES } from "../src/data/catalog";
import { searchFoods } from "../src/data/foods";
import { TEMPLATES } from "../src/data/templates";
import { macroTargets, scaleMacros, sumMacros } from "../src/domain/nutrition";
import { isAvailable, personalizeTemplate, recommendTemplate, swapKey, swapOptions } from "../src/domain/personalize";
import { validateTemplate } from "../src/domain/template";

const exercises = new Map(EXERCISES.map((e) => [e.slug, e]));
const known = { exercises: new Set(exercises.keys()), techniques: new Set(TECHNIQUES.map((t) => t.slug)) };
const noPrefs = { equipment: "gym" as const, focusMuscles: [], swaps: {} };

describe("templates", () => {
  it.each(TEMPLATES.map((t) => [t.slug, t] as const))("%s validates against the catalog", (_, t) => {
    const r = validateTemplate(t, known);
    expect(r.ok ? [] : r.errors).toEqual([]);
  });
});

describe("personalizeTemplate", () => {
  it("leaves a template unchanged for a full gym and no prefs", () => {
    const t = TEMPLATES[1]!;
    const p = personalizeTemplate(t, noPrefs, exercises);
    expect(p.days.map((d) => d.slots.map((s) => s.exercise))).toEqual(t.days.map((d) => d.slots.map((s) => s.exercise)));
  });

  it("only uses home equipment for every template", () => {
    for (const t of TEMPLATES) {
      const p = personalizeTemplate(t, { ...noPrefs, equipment: "home" }, exercises);
      for (const day of p.days) {
        expect(day.slots.length, `${t.slug}/${day.key}`).toBeGreaterThanOrEqual(3);
        for (const s of day.slots) expect(isAvailable(exercises.get(s.exercise)!, "home"), s.exercise).toBe(true);
      }
    }
  });

  it("prefers the slot's listed alternative when equipment is missing", () => {
    const ul = TEMPLATES.find((t) => t.slug === "upper-lower")!;
    const p = personalizeTemplate(ul, { ...noPrefs, equipment: "dumbbells" }, exercises);
    const row = p.days[0]!.slots.find((s) => s.replaced === "seated-cable-row")!;
    expect(row).toMatchObject({ exercise: "db-row", change: "equipment" });
  });

  it("applies a valid user swap and ignores an invalid one", () => {
    const ul = TEMPLATES.find((t) => t.slug === "upper-lower")!;
    const p = personalizeTemplate(ul, { ...noPrefs, swaps: { [swapKey("upper-a", 1)]: "barbell-bench-press", [swapKey("upper-a", 2)]: "back-squat" } }, exercises);
    expect(p.days[0]!.slots[1]).toMatchObject({ exercise: "barbell-bench-press", replaced: "incline-db-press", change: "swap" });
    expect(p.days[0]!.slots[2]!.exercise).toBe("seated-cable-row");
  });

  it("adds a set to slots that train a focus muscle", () => {
    const ul = TEMPLATES.find((t) => t.slug === "upper-lower")!;
    const p = personalizeTemplate(ul, { ...noPrefs, focusMuscles: ["side_delts"] }, exercises);
    expect(p.days[0]!.slots[3]).toMatchObject({ exercise: "lateral-raise", sets: { min: 3, max: 5 }, change: "focus" });
  });

  it("offers swap options from the same pattern and muscle", () => {
    const slugs = swapOptions(TEMPLATES[1]!.days[0]!.slots[1]!, exercises, "gym").map((e) => e.slug);
    expect(slugs[0]).toBe("incline-db-press");
    expect(slugs).toContain("barbell-bench-press");
    expect(slugs).not.toContain("back-squat");
  });
});

describe("recommendTemplate", () => {
  it("matches days per week", () => {
    expect(recommendTemplate(3)).toBe("full-body");
    expect(recommendTemplate(4)).toBe("upper-lower");
    expect(recommendTemplate(6)).toBe("twice-weekly-primer-split");
  });
});

describe("nutrition", () => {
  const stats = { sex: "male" as const, age: 30, heightCm: 178, weightKg: 80, activity: "moderate" as const };

  it("computes targets that add up to the calorie goal", () => {
    const m = macroTargets(stats, "muscle");
    // BMR 1767.5 x 1.55 x 1.1 = 3013.6 -> 3010
    expect(m.calories).toBe(3010);
    expect(m.protein).toBe(160);
    expect(Math.abs(m.protein * 4 + m.carbs * 4 + m.fat * 9 - m.calories)).toBeLessThan(10);
  });

  it("cuts calories and raises protein for fat loss", () => {
    const m = macroTargets(stats, "fat_loss");
    expect(m.calories).toBe(2190);
    expect(m.protein).toBe(176);
  });

  it("scales and sums foods", () => {
    const rice = searchFoods("white rice")[0]!;
    expect(scaleMacros(rice.per100g, 200)).toEqual({ calories: 260, protein: 5.4, carbs: 56.4, fat: 0.6 });
    expect(sumMacros([scaleMacros(rice.per100g, 100), scaleMacros(rice.per100g, 100)]).calories).toBe(260);
  });
});
