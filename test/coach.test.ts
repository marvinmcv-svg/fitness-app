import { describe, expect, it } from "vitest";
import { adjustSession, detectRedFlag, e1rm, findRecords, isStalled, weeklyReview, type PlannedSlot } from "../src/domain/coach";
import { ex, set, workout } from "./fixtures";

const plan: PlannedSlot[] = [
  { slotType: "primer", exercise: "face-pull", primaryMuscles: ["rear_delts"], sets: { min: 2, max: 2 }, restSec: 60 },
  { slotType: "main", exercise: "back-squat", primaryMuscles: ["quads", "glutes"], sets: { min: 3, max: 3 }, restSec: 180 },
  { slotType: "main", exercise: "flat-db-press", primaryMuscles: ["chest"], sets: { min: 3, max: 4 }, restSec: 150 },
  { slotType: "accessory", exercise: "lateral-raise", primaryMuscles: ["side_delts"], sets: { min: 2, max: 4 }, restSec: 90 },
  { slotType: "accessory", exercise: "hammer-curl", primaryMuscles: ["biceps"], sets: { min: 2, max: 3 }, restSec: 90 },
  { slotType: "burnout", exercise: "pushup", primaryMuscles: ["chest"], sets: { min: 1, max: 1 }, restSec: 90 },
];
const normal = { sleep: "ok", energy: "normal", sore: [], minutes: null } as const;

describe("e1rm", () => {
  it("uses Epley up to 12 reps", () => {
    expect(e1rm(100, 5)).toBe(116.7);
    expect(e1rm(100, 15)).toBeNull();
    expect(e1rm(0, 5)).toBeNull();
  });
});

describe("findRecords", () => {
  it("finds an e1RM record against earlier sessions", () => {
    const before = [workout("2025-01-06T10:00:00Z", [ex("back-squat", [set(5, { weight: 100 })])])];
    const now = workout("2025-01-09T10:00:00Z", [ex("back-squat", [set(5, { weight: 105 })])]);
    expect(findRecords(now, before)).toEqual([{ exercise: "back-squat", kind: "e1rm", value: 122.5, previous: 116.7, set: "105 kg × 5" }]);
  });

  it("does not call a first-ever session a record", () => {
    expect(findRecords(workout("2025-01-09T10:00:00Z", [ex("back-squat", [set(5, { weight: 105 })])]), [])).toEqual([]);
  });

  it("tracks rep records for bodyweight work", () => {
    const before = [workout("2025-01-06T10:00:00Z", [ex("pull-up", [set(8, { weight: null })])])];
    const now = workout("2025-01-09T10:00:00Z", [ex("pull-up", [set(10, { weight: null })])]);
    expect(findRecords(now, before)[0]).toMatchObject({ kind: "reps", value: 10, previous: 8 });
  });
});

describe("isStalled", () => {
  const s = (weight: number, ...reps: number[]) => ({ sets: reps.map((r) => ({ weight, reps: r })) });
  it("flags three sessions without progress", () => {
    expect(isStalled([s(100, 5, 5, 4), s(100, 5, 4, 4), s(100, 5, 5, 4)])).toBe(true);
  });
  it("does not flag progress in load or reps", () => {
    expect(isStalled([s(100, 5, 5, 4), s(100, 5, 5, 5), s(100, 5, 5, 5)])).toBe(false);
    expect(isStalled([s(100, 5, 5, 5), s(102.5, 5, 5, 4), s(102.5, 5, 5, 4)])).toBe(false);
  });
});

describe("adjustSession", () => {
  it("keeps the plan on a normal day", () => {
    const a = adjustSession(plan, normal);
    expect(a.slots.map((s) => s.sets)).toEqual([2, 3, 4, 4, 3, 1]);
    expect(a.notes[0]).toMatch(/as planned/);
  });

  it("drops to minimum sets and skips burnouts after poor sleep", () => {
    const a = adjustSession(plan, { ...normal, sleep: "poor" });
    expect(a.slots.map((s) => (s.keep ? s.sets : 0))).toEqual([2, 3, 3, 2, 2, 0]);
    expect(a.effortCue).toMatch(/2–3 reps/);
  });

  it("eases off sore muscles", () => {
    const a = adjustSession(plan, { ...normal, sore: ["chest"] });
    expect(a.slots[2]).toMatchObject({ keep: true, sets: 3, note: "Lighter: sore" });
    expect(a.slots[5]).toMatchObject({ keep: false });
  });

  it("fits the session into the time available, keeping main lifts", () => {
    const full = adjustSession(plan, normal).minutes;
    const a = adjustSession(plan, { ...normal, minutes: 30 });
    expect(full).toBeGreaterThan(30);
    expect(a.minutes).toBeLessThanOrEqual(30);
    expect(a.slots[1]!.keep && a.slots[2]!.keep).toBe(true);
    expect(a.slots[5]!.keep).toBe(false);
  });
});

describe("weeklyReview", () => {
  it("summarizes adherence, targets and calories", () => {
    const r = weeklyReview({
      sessions: 3,
      plannedSessions: 4,
      volume: new Map([["chest", { effectiveSets: 12 }], ["lats", { effectiveSets: 6 }]]),
      targets: [
        { muscle: "chest", minSets: 10, maxSets: 20, minFrequency: 2 },
        { muscle: "lats", minSets: 10, maxSets: 20, minFrequency: 2 },
      ],
      dailyCalories: [2400, 0, 2600],
      calorieTarget: 2500,
    });
    expect(r).toMatchObject({ musclesOnTarget: 1, avgCalories: 2500, daysLogged: 2 });
    expect(r.headline).toMatch(/3 of 4/);
  });
});

describe("detectRedFlag", () => {
  it.each([
    ["I had chest pain during squats", "cardiac"],
    ["felt a pop in my shoulder", "injury"],
    ["I want to starve myself to cut faster", "eating"],
    ["my legs are sore from yesterday", null],
    ["Tuve dolor en el pecho haciendo sentadillas", "cardiac"],
    ["J'ai entendu un claquement dans l'épaule", "injury"],
    ["Ich habe Brustschmerzen beim Laufen", "cardiac"],
    ["Ho le gambe indolenzite da ieri", null],
    ["Estou com dor muscular nas pernas", null],
  ])("%s", (text, flag) => {
    expect(detectRedFlag(text)).toBe(flag);
  });
});
