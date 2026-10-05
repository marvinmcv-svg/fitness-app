import type { ProgramTemplate } from "./template";
import type { Exercise, SlotType, VolumeTarget } from "./types";
import { DEFAULT_VOLUME_OPTIONS } from "./volume";

export interface PlannedMuscleVolume {
  muscle: string;
  minSets: number;
  maxSets: number;
  /** Distinct training days in the week that hit the muscle. */
  frequency: number;
}

export type PlanWarning =
  | { kind: "below_target"; muscle: string; planned: number; target: number }
  | { kind: "above_target"; muscle: string; planned: number; target: number }
  | { kind: "low_frequency"; muscle: string; planned: number; target: number };

/**
 * Project one week of a template into per-muscle set ranges, using the same
 * slot exclusions and muscle factors as logged-volume accounting.
 */
export function projectWeek(
  template: ProgramTemplate,
  exercises: ReadonlyMap<string, Exercise>,
  excludedSlots: readonly SlotType[] = DEFAULT_VOLUME_OPTIONS.excludedSlots,
): Map<string, PlannedMuscleVolume> {
  const days = new Map(template.days.map((d) => [d.key, d]));
  const out = new Map<string, PlannedMuscleVolume>();

  template.weekLayout.forEach((dayKey) => {
    const day = days.get(dayKey);
    if (!day) throw new Error(`Unknown day: ${dayKey}`);
    const hitToday = new Set<string>();

    for (const slot of day.slots) {
      if (excludedSlots.includes(slot.slotType)) continue;
      const exercise = exercises.get(slot.exercise);
      if (!exercise) throw new Error(`Unknown exercise: ${slot.exercise}`);

      for (const em of exercise.muscles) {
        if (em.volumeFactor <= 0) continue;
        const entry = out.get(em.muscle) ?? { muscle: em.muscle, minSets: 0, maxSets: 0, frequency: 0 };
        entry.minSets += slot.sets.min * em.volumeFactor;
        entry.maxSets += slot.sets.max * em.volumeFactor;
        if (!hitToday.has(em.muscle)) {
          hitToday.add(em.muscle);
          entry.frequency += 1;
        }
        out.set(em.muscle, entry);
      }
    }
  });

  return out;
}

/**
 * Compare a projected week to the user's targets. A muscle is "below" only
 * if even the top of the planned set range misses the minimum, and "above"
 * only if the bottom of the range already exceeds the maximum.
 */
export function checkPlan(
  planned: ReadonlyMap<string, PlannedMuscleVolume>,
  targets: readonly VolumeTarget[],
): PlanWarning[] {
  const warnings: PlanWarning[] = [];
  for (const target of targets) {
    const p = planned.get(target.muscle) ?? { muscle: target.muscle, minSets: 0, maxSets: 0, frequency: 0 };
    if (p.maxSets < target.minSets) {
      warnings.push({ kind: "below_target", muscle: target.muscle, planned: p.maxSets, target: target.minSets });
    } else if (p.minSets > target.maxSets) {
      warnings.push({ kind: "above_target", muscle: target.muscle, planned: p.minSets, target: target.maxSets });
    }
    if (p.frequency < target.minFrequency) {
      warnings.push({ kind: "low_frequency", muscle: target.muscle, planned: p.frequency, target: target.minFrequency });
    }
  }
  return warnings;
}

/**
 * Mid-week check against logged volume: which muscles still need sets, and
 * how many, to reach their minimum this week.
 */
export function remainingSets(
  loggedThisWeek: ReadonlyMap<string, { effectiveSets: number }>,
  targets: readonly VolumeTarget[],
): { muscle: string; remaining: number }[] {
  return targets
    .map((t) => ({
      muscle: t.muscle,
      remaining: Math.max(0, Math.round((t.minSets - (loggedThisWeek.get(t.muscle)?.effectiveSets ?? 0)) * 100) / 100),
    }))
    .filter((r) => r.remaining > 0);
}
