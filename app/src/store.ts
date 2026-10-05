import { useCallback, useEffect, useState } from "react";
import { EXERCISES, MUSCLES, TECHNIQUES } from "../../src/data/catalog";
import { twiceWeeklyPrimerSplit } from "../../src/data/templates/twice-weekly-primer-split";
import { nextProgression, type ProgressionDecision, type SessionResult } from "../../src/domain/progression";
import type { ProgramDay, ProgramTemplate, Slot } from "../../src/domain/template";
import type { LoggedSet, VolumeTarget, Workout } from "../../src/domain/types";
import { buildCatalog, computeWeeklyVolume } from "../../src/domain/volume";

export const catalog = buildCatalog(EXERCISES, TECHNIQUES);
export const program: ProgramTemplate = twiceWeeklyPrimerSplit;
export const muscleName = new Map(MUSCLES.map((m) => [m.slug, m.name]));
export const exerciseName = (slug: string) => catalog.exercises.get(slug)?.name ?? slug;
export const techniqueName = (slug: string) => catalog.techniques.get(slug)?.name ?? slug;

/** Muscles tracked against weekly targets, in display order. */
export const TRACKED_MUSCLES = [
  "chest",
  "lats",
  "upper_back",
  "quads",
  "hamstrings",
  "glutes",
  "side_delts",
  "rear_delts",
  "biceps",
  "triceps",
  "calves",
] as const;

export type TargetPreset = "standard" | "advanced";
export function targetsFor(preset: TargetPreset): VolumeTarget[] {
  const [minSets, maxSets] = preset === "advanced" ? [12, 24] : [10, 20];
  return TRACKED_MUSCLES.map((muscle) => ({ muscle, minSets, maxSets, minFrequency: 2 }));
}

/* ------------------------------------------------------------ live session */

export interface DraftSet {
  id: string;
  weight: string;
  reps: string;
  done: boolean;
  /** technique slug -> appended reps */
  segments: Record<string, number>;
}

export interface DraftExercise {
  id: string;
  slotIndex: number;
  exercise: string;
  sets: DraftSet[];
}

export interface ActiveSession {
  dayKey: string;
  startedAt: string;
  exercises: DraftExercise[];
}

export interface AppState {
  history: Workout[];
  active: ActiveSession | null;
  preset: TargetPreset;
  sample: boolean;
}

const KEY = "setwise:v1";
let seq = 0;
export const uid = () => `${Date.now().toString(36)}-${(seq++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function load(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppState) : null;
  } catch {
    return null;
  }
}

function save(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: keep working in memory */
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(() => load() ?? seedState());
  useEffect(() => save(state), [state]);
  const update = useCallback((fn: (s: AppState) => AppState) => setState((s) => fn(s)), []);
  return [state, update] as const;
}

/* ----------------------------------------------------------------- helpers */

export function dayByKey(key: string): ProgramDay {
  const day = program.days.find((d) => d.key === key);
  if (!day) throw new Error(`Unknown day ${key}`);
  return day;
}

/** Next day in the rotation after the most recent programmed workout. */
export function nextDayKey(history: readonly Workout[]): string {
  const last = [...history].reverse().find((w) => w.programDayId);
  if (!last) return program.weekLayout[0]!;
  const i = program.weekLayout.indexOf(last.programDayId!);
  return program.weekLayout[(i + 1) % program.weekLayout.length]!;
}

/** Working-set history for one exercise, oldest first. */
export function exerciseHistory(history: readonly Workout[], exercise: string): SessionResult[] {
  const out: SessionResult[] = [];
  for (const w of history) {
    for (const ex of w.exercises) {
      if (ex.exercise !== exercise) continue;
      const sets = ex.sets
        .filter((s) => s.setType !== "warmup" && s.setType !== "primer" && s.reps != null)
        .map((s) => ({ weight: s.weight ?? 0, reps: s.reps ?? 0 }));
      if (sets.length) out.push({ sets });
    }
  }
  return out;
}

export function suggestionFor(history: readonly Workout[], slot: Slot): ProgressionDecision | null {
  if (!slot.progression) return null;
  return nextProgression(slot.progression, exerciseHistory(history, slot.exercise), 2.5);
}

export function lastWeightFor(history: readonly Workout[], exercise: string): number | null {
  const h = exerciseHistory(history, exercise).at(-1);
  return h ? Math.max(...h.sets.map((s) => s.weight)) : null;
}

export function startSession(history: readonly Workout[], dayKey: string): ActiveSession {
  const day = dayByKey(dayKey);
  return {
    dayKey,
    startedAt: new Date().toISOString(),
    exercises: day.slots.map((slot, slotIndex) => {
      const suggestion = suggestionFor(history, slot);
      const weight = suggestion?.weight ?? lastWeightFor(history, slot.exercise);
      return {
        id: uid(),
        slotIndex,
        exercise: slot.exercise,
        sets: Array.from({ length: slot.sets.max }, () => ({
          id: uid(),
          weight: weight != null && weight > 0 ? String(weight) : "",
          reps: "",
          done: false,
          segments: {},
        })),
      };
    }),
  };
}

export function finishSession(session: ActiveSession): Workout {
  const day = dayByKey(session.dayKey);
  return {
    id: uid(),
    startedAt: session.startedAt,
    endedAt: new Date().toISOString(),
    programDayId: session.dayKey,
    exercises: session.exercises
      .map((ex, ordinal) => {
        const slot = day.slots[ex.slotIndex]!;
        const sets: LoggedSet[] = ex.sets
          .filter((s) => s.done)
          .map((s, i) => ({
            id: s.id,
            ordinal: i,
            setType: slot.slotType === "primer" || slot.slotType === "warmup" ? "primer" : "working",
            weight: s.weight === "" ? null : Number(s.weight),
            unit: "kg",
            reps: s.reps === "" ? (slot.technique ? null : 0) : Number(s.reps),
            technique: slot.technique ?? null,
            segments: Object.entries(s.segments)
              .filter(([, reps]) => reps > 0)
              .map(([technique, reps]) => ({ technique, reps })),
          }));
        return { id: ex.id, exercise: ex.exercise, slotType: slot.slotType, ordinal, sets };
      })
      .filter((ex) => ex.sets.length > 0),
  };
}

/* -------------------------------------------------------------- sample data */

/** Starting loads (kg) for the sample history. */
const BASE: Record<string, number> = {
  "incline-db-press": 30, "flat-db-press": 32.5, "cable-crossover": 15, "lying-db-extension": 12.5,
  "seated-cable-row": 65, "lat-pulldown": 60, "barbell-curl": 35, "incline-db-curl": 12.5,
  deadlift: 140, "reverse-lunge": 20, "seated-leg-curl": 45, "db-shoulder-press": 24, "lateral-raise": 10,
  "standing-calf-raise": 80, "db-fly": 14, "triceps-pushdown": 30, "barbell-row": 70,
  "straight-arm-pulldown": 25, "hammer-curl": 16, "preacher-curl": 12.5, "back-squat": 115, "hip-thrust": 120,
  "leg-extension": 55, "cable-lateral-raise": 7.5, "rear-delt-fly": 8, "seated-calf-raise": 50,
};

function sampleWorkout(dayKey: string, date: Date, weekIndex: number): Workout {
  const day = dayByKey(dayKey);
  return {
    id: uid(),
    startedAt: date.toISOString(),
    endedAt: new Date(date.getTime() + 62 * 60_000).toISOString(),
    programDayId: dayKey,
    exercises: day.slots.map((slot, ordinal) => {
      const base = BASE[slot.exercise] ?? 0;
      const weight = base ? base + weekIndex * 2.5 : null;
      const top = slot.reps?.max ?? 12;
      const n = slot.sets.max;
      return {
        id: uid(),
        exercise: slot.exercise,
        slotType: slot.slotType,
        ordinal,
        sets: Array.from({ length: n }, (_, i) => ({
          id: uid(),
          ordinal: i,
          setType: slot.slotType === "primer" ? "primer" : "working",
          weight,
          unit: "kg" as const,
          reps: slot.reps ? Math.max(slot.reps.min, top - i - (weekIndex === 0 ? 1 : 0)) : 14 + weekIndex,
          technique: slot.technique ?? null,
          segments: slot.finishers.length && i === n - 1 ? [{ technique: slot.finishers[0]!, reps: 4 }] : [],
        })),
      };
    }),
  };
}

/** Three weeks of example history ending yesterday (one rest day a week), so every screen has numbers. */
export function seedState(): AppState {
  const today = new Date();
  today.setHours(7, 30, 0, 0);
  const history: Workout[] = [];
  let rotation = 0;
  for (let back = 20; back >= 1; back--) {
    if (back % 7 === 0) continue; // rest day
    const d = new Date(today);
    d.setDate(today.getDate() - back);
    const weekIndex = Math.floor((20 - back) / 7);
    history.push(sampleWorkout(program.weekLayout[rotation % program.weekLayout.length]!, d, weekIndex));
    rotation++;
  }
  return { history, active: null, preset: "standard", sample: true };
}

/* ------------------------------------------------------------ derived views */

/** Per-muscle volume over the trailing `days` days (rolling window, not ISO week). */
export function rollingVolume(history: readonly Workout[], days = 7, endsAt = new Date()) {
  const from = endsAt.getTime() - days * 86_400_000;
  const recent = history.filter((w) => {
    const t = new Date(w.startedAt).getTime();
    return t > from && t <= endsAt.getTime();
  });
  const merged = new Map<string, { muscle: string; effectiveSets: number; sessions: number }>();
  for (const week of computeWeeklyVolume(recent, catalog).values()) {
    for (const v of week.values()) {
      const m = merged.get(v.muscle) ?? { muscle: v.muscle, effectiveSets: 0, sessions: 0 };
      m.effectiveSets = Math.round((m.effectiveSets + v.effectiveSets) * 100) / 100;
      m.sessions += v.sessions;
      merged.set(v.muscle, m);
    }
  }
  return { volume: merged, workouts: recent };
}

/** Total working sets per workout (for the activity chart). */
export function workingSets(w: Workout): number {
  return w.exercises
    .filter((e) => e.slotType !== "primer" && e.slotType !== "warmup" && e.slotType !== "corrective")
    .reduce((n, e) => n + e.sets.length, 0);
}

/** Tonnage in kg for a workout. */
export function tonnage(w: Workout): number {
  return w.exercises.reduce((t, e) => t + e.sets.reduce((s, x) => s + (x.weight ?? 0) * (x.reps ?? 0), 0), 0);
}
