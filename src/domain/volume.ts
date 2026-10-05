import type { Exercise, LoggedSet, SetType, SlotType, Technique, Workout } from "./types";
import { isoWeekKey } from "./week";

export interface VolumeOptions {
  /** Slots that never count toward hypertrophy volume. */
  excludedSlots?: readonly SlotType[];
  /** Set types that never count toward hypertrophy volume. */
  excludedSetTypes?: readonly SetType[];
  /** Ignore muscles credited below this factor (e.g. 0.5 to count primaries only). */
  minMuscleFactor?: number;
}

export const DEFAULT_VOLUME_OPTIONS: Required<VolumeOptions> = {
  excludedSlots: ["warmup", "primer", "corrective"],
  excludedSetTypes: ["warmup", "primer"],
  minMuscleFactor: 0,
};

export interface MuscleVolume {
  muscle: string;
  effectiveSets: number;
  /** Distinct workouts in which the muscle received any credited volume. */
  sessions: number;
}

/** week key -> muscle slug -> volume */
export type WeeklyVolume = Map<string, Map<string, MuscleVolume>>;

export interface Catalog {
  exercises: ReadonlyMap<string, Exercise>;
  techniques: ReadonlyMap<string, Technique>;
}

export function buildCatalog(exercises: readonly Exercise[], techniques: readonly Technique[]): Catalog {
  return {
    exercises: new Map(exercises.map((e) => [e.slug, e])),
    techniques: new Map(techniques.map((t) => [t.slug, t])),
  };
}

/**
 * Set credit before muscle factors: 1 for a completed set plus the extra
 * credit of each appended technique segment (partials, eccentrics, ...).
 * Sets with no reps logged (planned but not done) earn nothing.
 */
export function setCredit(set: LoggedSet, catalog: Catalog): number {
  if (set.reps == null || set.reps <= 0) {
    // A pure-technique set (e.g. trap set logged by duration) still counts.
    if (!set.technique) return 0;
  }
  let credit = 1;
  for (const segment of set.segments ?? []) {
    if (segment.reps <= 0) continue;
    const technique = catalog.techniques.get(segment.technique);
    if (!technique) throw new Error(`Unknown technique: ${segment.technique}`);
    if (!technique.countsAsSet) credit += technique.volumeFactor;
  }
  return credit;
}

/**
 * Weekly per-muscle volume:
 *   Σ set credit × exercise_muscles.volume_factor
 * excluding primer, corrective and warm-up work by default.
 */
export function computeWeeklyVolume(
  workouts: readonly Workout[],
  catalog: Catalog,
  options: VolumeOptions = {},
): WeeklyVolume {
  const opts = { ...DEFAULT_VOLUME_OPTIONS, ...options };
  const result: WeeklyVolume = new Map();
  const sessionsSeen = new Map<string, Set<string>>(); // `${week}|${muscle}` -> workout ids

  for (const workout of workouts) {
    const week = isoWeekKey(workout.startedAt);
    let weekMap = result.get(week);
    if (!weekMap) {
      weekMap = new Map();
      result.set(week, weekMap);
    }

    for (const logged of workout.exercises) {
      if (opts.excludedSlots.includes(logged.slotType)) continue;
      const exercise = catalog.exercises.get(logged.exercise);
      if (!exercise) throw new Error(`Unknown exercise: ${logged.exercise}`);

      const credit = logged.sets
        .filter((s) => !opts.excludedSetTypes.includes(s.setType))
        .reduce((sum, s) => sum + setCredit(s, catalog), 0);
      if (credit === 0) continue;

      for (const em of exercise.muscles) {
        if (em.volumeFactor <= 0 || em.volumeFactor < opts.minMuscleFactor) continue;
        const entry = weekMap.get(em.muscle) ?? { muscle: em.muscle, effectiveSets: 0, sessions: 0 };
        entry.effectiveSets += credit * em.volumeFactor;

        const key = `${week}|${em.muscle}`;
        const seen = sessionsSeen.get(key) ?? new Set<string>();
        if (!seen.has(workout.id)) {
          seen.add(workout.id);
          entry.sessions = seen.size;
        }
        sessionsSeen.set(key, seen);
        weekMap.set(em.muscle, entry);
      }
    }
  }

  for (const weekMap of result.values()) {
    for (const entry of weekMap.values()) entry.effectiveSets = round2(entry.effectiveSets);
  }
  return result;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
