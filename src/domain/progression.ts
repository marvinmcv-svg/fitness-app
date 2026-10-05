import { z } from "zod";

/**
 * Progression rules are stored as data (progression_rules.params jsonb) so a
 * coach can author them without code changes.
 */
export const progressionRuleSchema = z.discriminatedUnion("type", [
  z.object({
    /** Work inside a rep range; add load once every working set hits the top. */
    type: z.literal("double_progression"),
    repsMin: z.number().int().positive(),
    repsMax: z.number().int().positive(),
    increment: z.number().positive(),
  }),
  z.object({
    /**
     * Fixed sets x reps. Add load when all sets are completed; repeat the load
     * otherwise; deload after `stallLimit` consecutive failed sessions.
     */
    type: z.literal("linear"),
    sets: z.number().int().positive(),
    reps: z.number().int().positive(),
    increment: z.number().positive(),
    stallLimit: z.number().int().positive().default(3),
    deloadPct: z.number().gt(0).lt(1).default(0.1),
  }),
  z.object({
    /** Failure / burnout work: beat last session's reps, load unchanged. */
    type: z.literal("rep_target"),
  }),
]);
export type ProgressionRule = z.infer<typeof progressionRuleSchema>;

export interface SessionResult {
  /** Working sets only, in order. */
  sets: { weight: number; reps: number }[];
}

export interface ProgressionDecision {
  action: "increase" | "hold" | "deload";
  weight: number;
  /** Reps to beat (rep_target) or the range floor to aim for. */
  targetReps?: number;
  reason: string;
}

/** Round to the nearest loadable increment (e.g. 2.5 kg plates, 5 lb). */
export function roundToIncrement(weight: number, step: number): number {
  if (step <= 0) return weight;
  return Math.round(weight / step) * step;
}

/**
 * Decide the next session's load from history (oldest first).
 * Returns null when there is no history to progress from.
 */
export function nextProgression(
  rule: ProgressionRule,
  history: readonly SessionResult[],
  roundingStep = 0,
): ProgressionDecision | null {
  const last = history.at(-1);
  if (!last || last.sets.length === 0) return null;
  const weight = topWeight(last);

  switch (rule.type) {
    case "double_progression": {
      const allAtTop = last.sets.every((s) => s.reps >= rule.repsMax);
      if (allAtTop) {
        return {
          action: "increase",
          weight: roundToIncrement(weight + rule.increment, roundingStep),
          targetReps: rule.repsMin,
          reason: `All sets reached ${rule.repsMax} reps`,
        };
      }
      return { action: "hold", weight, targetReps: rule.repsMin, reason: `Build reps toward ${rule.repsMax}` };
    }

    case "linear": {
      const stalls = consecutiveFailures(history, rule.sets, rule.reps);
      if (stalls === 0) {
        return {
          action: "increase",
          weight: roundToIncrement(weight + rule.increment, roundingStep),
          targetReps: rule.reps,
          reason: `Completed ${rule.sets}x${rule.reps}`,
        };
      }
      if (stalls >= rule.stallLimit) {
        return {
          action: "deload",
          weight: roundToIncrement(weight * (1 - rule.deloadPct), roundingStep),
          targetReps: rule.reps,
          reason: `Missed ${rule.sets}x${rule.reps} in ${stalls} straight sessions`,
        };
      }
      return { action: "hold", weight, targetReps: rule.reps, reason: `Repeat load (${stalls} missed)` };
    }

    case "rep_target": {
      const best = Math.max(...last.sets.map((s) => s.reps));
      return { action: "hold", weight, targetReps: best + 1, reason: `Beat ${best} reps` };
    }
  }
}

function topWeight(session: SessionResult): number {
  return Math.max(...session.sets.map((s) => s.weight));
}

function completed(session: SessionResult, sets: number, reps: number): boolean {
  return session.sets.length >= sets && session.sets.slice(0, sets).every((s) => s.reps >= reps);
}

/**
 * Consecutive failed sessions at the current load, counting back from the
 * latest. A change in load (progression or deload) resets the streak.
 */
function consecutiveFailures(history: readonly SessionResult[], sets: number, reps: number): number {
  const last = history.at(-1);
  if (!last) return 0;
  const load = topWeight(last);
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const session = history[i]!;
    if (topWeight(session) !== load || completed(session, sets, reps)) break;
    count++;
  }
  return count;
}
