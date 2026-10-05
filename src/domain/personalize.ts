import type { ProgramTemplate, Slot } from "./template";
import type { Exercise } from "./types";

export const EQUIPMENT_PROFILES = {
  gym: null, // everything
  dumbbells: ["dumbbell", "bench", "bodyweight", "band", "bar"],
  home: ["dumbbell", "bodyweight", "band", "bar"],
} as const;
export type EquipmentProfile = keyof typeof EQUIPMENT_PROFILES;

export type Goal = "muscle" | "strength" | "fat_loss" | "fitness";
export type Experience = "new" | "intermediate" | "advanced";

export interface TrainingPrefs {
  equipment: EquipmentProfile;
  /** Muscles to bias toward with one extra set per matching slot. */
  focusMuscles: string[];
  /** `${dayKey}:${slotIndex}` -> exercise slug chosen by the user. */
  swaps: Record<string, string>;
}

export const swapKey = (dayKey: string, slotIndex: number) => `${dayKey}:${slotIndex}`;

export function isAvailable(exercise: Exercise, equipment: EquipmentProfile): boolean {
  const allowed = EQUIPMENT_PROFILES[equipment];
  return allowed === null || exercise.equipment.every((e) => (allowed as readonly string[]).includes(e));
}

const primaries = (e: Exercise) => e.muscles.filter((m) => m.role === "primary").map((m) => m.muscle);

/**
 * Exercises that can stand in for a slot: the slot's listed alternatives
 * first, then catalog exercises with the same movement pattern that share a
 * primary muscle. Only exercises usable with the equipment profile.
 */
export function swapOptions(
  slot: Slot,
  exercises: ReadonlyMap<string, Exercise>,
  equipment: EquipmentProfile,
): Exercise[] {
  const original = exercises.get(slot.exercise);
  if (!original) return [];
  const targets = new Set(primaries(original));
  const out: Exercise[] = [];
  const push = (e: Exercise | undefined) => {
    if (e && isAvailable(e, equipment) && !out.some((o) => o.slug === e.slug)) out.push(e);
  };

  push(original);
  slot.alternatives.forEach((slug) => push(exercises.get(slug)));
  for (const e of exercises.values()) {
    if (e.pattern === original.pattern && primaries(e).some((m) => targets.has(m))) push(e);
  }
  return out;
}

export interface PersonalizedSlot extends Slot {
  /** Index of this slot in the original template day (swap keys use it). */
  baseIndex: number;
  /** The template's original exercise when it was replaced. */
  replaced?: string;
  /** Why the slot changed, for display. */
  change?: "swap" | "equipment" | "focus";
}

export type PersonalizedTemplate = Omit<ProgramTemplate, "days"> & {
  days: { key: string; label: string; slots: PersonalizedSlot[] }[];
};

/**
 * Apply equipment limits, user swaps and focus muscles to a template.
 * Slots with no usable exercise are dropped (e.g. a cable-only primer at home).
 */
export function personalizeTemplate(
  template: ProgramTemplate,
  prefs: TrainingPrefs,
  exercises: ReadonlyMap<string, Exercise>,
): PersonalizedTemplate {
  const focus = new Set(prefs.focusMuscles);

  return {
    ...template,
    days: template.days.map((day) => ({
      ...day,
      slots: day.slots.flatMap((slot, i): PersonalizedSlot[] => {
        const options = swapOptions(slot, exercises, prefs.equipment);
        if (options.length === 0) return [];

        let next: PersonalizedSlot = { ...slot, baseIndex: i };
        const chosen = prefs.swaps[swapKey(day.key, i)];
        if (chosen && chosen !== slot.exercise && options.some((o) => o.slug === chosen)) {
          next = { ...next, exercise: chosen, replaced: slot.exercise, change: "swap" };
        } else if (options[0]!.slug !== slot.exercise) {
          next = { ...next, exercise: options[0]!.slug, replaced: slot.exercise, change: "equipment" };
        }

        const ex = exercises.get(next.exercise)!;
        const hitsFocus = primaries(ex).some((m) => focus.has(m));
        if (hitsFocus && (next.slotType === "main" || next.slotType === "accessory")) {
          next = { ...next, sets: { min: next.sets.min, max: next.sets.max + 1 }, change: next.change ?? "focus" };
        }
        return [next];
      }),
    })),
  };
}

/** Pick the template that fits the days a person can train. */
export function recommendTemplate(daysPerWeek: number): "full-body" | "upper-lower" | "twice-weekly-primer-split" {
  if (daysPerWeek >= 6) return "twice-weekly-primer-split";
  if (daysPerWeek >= 4) return "upper-lower";
  return "full-body";
}

/** Weekly set targets by experience: newer lifters need less volume. */
export function setTargetsFor(experience: Experience): [number, number] {
  if (experience === "new") return [8, 14];
  if (experience === "advanced") return [12, 24];
  return [10, 20];
}
