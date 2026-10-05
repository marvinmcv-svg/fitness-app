import type { Slot } from "../../domain/template";

type Range = [number, number];

/** Compact slot builder for hand-written templates. `reps: null` = to failure. */
export function slot(
  slotType: Slot["slotType"],
  exercise: string,
  sets: Range,
  reps: Range | null,
  extra: Partial<Omit<Slot, "slotType" | "exercise" | "sets" | "reps">> = {},
): Slot {
  return {
    slotType,
    exercise,
    alternatives: [],
    sets: { min: sets[0], max: sets[1] },
    reps: reps && { min: reps[0], max: reps[1] },
    effort: slotType === "primer" ? "sub_max" : reps ? "rir" : "failure",
    finishers: [],
    ...extra,
  };
}

export const dp = (repsMin: number, repsMax: number, increment = 2.5) =>
  ({ type: "double_progression", repsMin, repsMax, increment }) as const;
