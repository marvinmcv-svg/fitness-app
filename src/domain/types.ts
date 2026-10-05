/**
 * Core domain vocabulary. These types are storage-agnostic: the same objects
 * are produced by the local SQLite store (offline) and the Postgres schema.
 */

export const SLOT_TYPES = ["warmup", "primer", "corrective", "main", "accessory", "burnout"] as const;
export type SlotType = (typeof SLOT_TYPES)[number];

export const SET_TYPES = ["warmup", "primer", "working", "drop", "failure"] as const;
export type SetType = (typeof SET_TYPES)[number];

export const TECHNIQUE_KINDS = [
  "partials",
  "eccentric_only",
  "ladder_1_5",
  "trap_set",
  "rest_pause",
  "cheat",
  "myo",
  "mechanical_drop",
] as const;
export type TechniqueKind = (typeof TECHNIQUE_KINDS)[number];

export const MOVEMENT_PATTERNS = [
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "hinge",
  "knee_dominant",
  "isolation",
  "carry",
  "core",
] as const;
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];

export const TARGET_EFFORTS = ["sub_max", "rir", "form_failure", "failure"] as const;
export type TargetEffort = (typeof TARGET_EFFORTS)[number];

export type MuscleRole = "primary" | "secondary";
export type WeightUnit = "kg" | "lb";

export interface Muscle {
  slug: string;
  name: string;
  region: "upper" | "lower" | "core";
}

export interface ExerciseMuscle {
  muscle: string;
  role: MuscleRole;
  /** Fraction of a set credited to this muscle (1.0 primary, ~0.5 secondary). */
  volumeFactor: number;
}

export interface Exercise {
  slug: string;
  name: string;
  equipment: string[];
  pattern: MovementPattern;
  bias: "stretch" | "shortened" | "mid";
  muscles: ExerciseMuscle[];
}

export interface Technique {
  slug: string;
  kind: TechniqueKind;
  name: string;
  /**
   * When true the technique *is* the set (e.g. a trap set or 1.5-rep ladder):
   * the set counts as one normal set. When false the technique is appended to
   * a set as a segment (e.g. +4 partials) and adds `volumeFactor` of a set.
   */
  countsAsSet: boolean;
  /** Extra set credit for an appended segment. Coach-editable: the science is unsettled. */
  volumeFactor: number;
}

/** Reps appended to a set using a technique, e.g. 4 partials after failure. */
export interface SetSegment {
  technique: string;
  reps: number;
  weight?: number | null;
}

export interface LoggedSet {
  id: string;
  ordinal: number;
  setType: SetType;
  weight: number | null;
  unit: WeightUnit;
  reps: number | null;
  rir?: number | null;
  /** Technique applied to the set itself (countsAsSet techniques). */
  technique?: string | null;
  segments?: SetSegment[];
  completedAt?: string | null;
}

export interface LoggedExercise {
  id: string;
  exercise: string;
  slotType: SlotType;
  ordinal: number;
  sets: LoggedSet[];
}

export interface Workout {
  id: string;
  startedAt: string;
  endedAt?: string | null;
  programDayId?: string | null;
  exercises: LoggedExercise[];
}

export interface VolumeTarget {
  muscle: string;
  minSets: number;
  maxSets: number;
  minFrequency: number;
}
