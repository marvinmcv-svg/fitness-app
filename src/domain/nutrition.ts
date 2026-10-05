import type { Goal } from "./personalize";

export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "very";

export interface BodyStats {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
}

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
};

/** Resting energy via Mifflin-St Jeor (kcal/day). */
export function bmr({ sex, age, heightCm, weightKg }: BodyStats): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
}

/** Daily targets: TDEE adjusted for the goal, protein by body weight, 25% fat, carbs fill the rest. */
export function macroTargets(stats: BodyStats, goal: Goal): Macros {
  const tdee = bmr(stats) * ACTIVITY_FACTOR[stats.activity];
  const adjust = goal === "fat_loss" ? 0.8 : goal === "muscle" ? 1.1 : goal === "strength" ? 1.05 : 1;
  const calories = Math.round((tdee * adjust) / 10) * 10;

  const proteinPerKg = goal === "fat_loss" ? 2.2 : goal === "fitness" ? 1.6 : 2.0;
  const protein = Math.round(stats.weightKg * proteinPerKg);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat };
}

/** Macros for `grams` of a food given per-100 g values. */
export function scaleMacros(per100g: Macros, grams: number): Macros {
  const f = grams / 100;
  return {
    calories: Math.round(per100g.calories * f),
    protein: round1(per100g.protein * f),
    carbs: round1(per100g.carbs * f),
    fat: round1(per100g.fat * f),
  };
}

export function sumMacros(items: readonly Macros[]): Macros {
  return items.reduce(
    (a, m) => ({
      calories: a.calories + m.calories,
      protein: round1(a.protein + m.protein),
      carbs: round1(a.carbs + m.carbs),
      fat: round1(a.fat + m.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
