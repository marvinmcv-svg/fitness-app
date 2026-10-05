import type { ProgramTemplate } from "../../domain/template";

/**
 * House template built on general training principles: each muscle trained
 * twice a week, every session opens with a sub-max primer and ends with a
 * bodyweight or intensity-technique finisher. Placeholder until the staff
 * coach authors the production version. Not affiliated with any creator.
 */
export const twiceWeeklyPrimerSplit: ProgramTemplate = {
  slug: "twice-weekly-primer-split",
  name: "Twice-Weekly Primer + Intensity Split",
  version: 1,
  description: "6 days: push / pull / legs + shoulders, repeated with different exercise variations.",
  weekLayout: ["push-a", "pull-a", "legs-a", "push-b", "pull-b", "legs-b"],
  days: [
    {
      key: "push-a",
      label: "Chest + Triceps A",
      slots: [
        { slotType: "primer", exercise: "band-external-rotation", alternatives: [], sets: { min: 1, max: 2 }, reps: { min: 12, max: 15 }, effort: "sub_max", restSec: 60, finishers: [] },
        { slotType: "main", exercise: "incline-db-press", alternatives: ["barbell-bench-press"], sets: { min: 3, max: 3 }, reps: { min: 6, max: 8 }, effort: "form_failure", finishers: [], progression: { type: "double_progression", repsMin: 6, repsMax: 8, increment: 2 } },
        { slotType: "accessory", exercise: "cable-crossover", alternatives: [], sets: { min: 3, max: 3 }, reps: { min: 10, max: 12 }, effort: "rir", rir: 1, finishers: ["partials"] },
        { slotType: "accessory", exercise: "lying-db-extension", alternatives: ["overhead-cable-extension"], sets: { min: 2, max: 3 }, reps: { min: 8, max: 10 }, effort: "form_failure", finishers: ["eccentric-only"] },
        { slotType: "burnout", exercise: "pushup", alternatives: [], sets: { min: 1, max: 1 }, reps: null, effort: "failure", technique: "ladder-1-5", finishers: [], progression: { type: "rep_target" } },
      ],
    },
    {
      key: "pull-a",
      label: "Back + Biceps A",
      slots: [
        { slotType: "primer", exercise: "scap-pulldown", alternatives: [], sets: { min: 1, max: 2 }, reps: { min: 10, max: 15 }, effort: "sub_max", restSec: 60, finishers: [] },
        { slotType: "main", exercise: "seated-cable-row", alternatives: [], sets: { min: 3, max: 3 }, reps: { min: 6, max: 8 }, effort: "form_failure", finishers: [], progression: { type: "double_progression", repsMin: 6, repsMax: 8, increment: 5 } },
        { slotType: "accessory", exercise: "lat-pulldown", alternatives: [], sets: { min: 3, max: 3 }, reps: { min: 10, max: 12 }, effort: "rir", rir: 1, finishers: [] },
        { slotType: "accessory", exercise: "barbell-curl", alternatives: [], sets: { min: 2, max: 3 }, reps: { min: 6, max: 8 }, effort: "form_failure", finishers: ["cheat-reps"] },
        { slotType: "accessory", exercise: "incline-db-curl", alternatives: [], sets: { min: 2, max: 3 }, reps: { min: 10, max: 12 }, effort: "rir", rir: 1, finishers: ["partials"] },
        { slotType: "burnout", exercise: "pull-up", alternatives: ["inverted-row"], sets: { min: 1, max: 1 }, reps: null, effort: "failure", finishers: [], progression: { type: "rep_target" } },
      ],
    },
    {
      key: "legs-a",
      label: "Legs + Shoulders A",
      slots: [
        { slotType: "primer", exercise: "reverse-hyper", alternatives: [], sets: { min: 1, max: 2 }, reps: { min: 10, max: 15 }, effort: "sub_max", restSec: 75, finishers: [] },
        { slotType: "main", exercise: "deadlift", alternatives: [], sets: { min: 3, max: 3 }, reps: { min: 5, max: 5 }, effort: "rir", rir: 2, restSec: 180, finishers: [], progression: { type: "linear", sets: 3, reps: 5, increment: 5, stallLimit: 3, deloadPct: 0.1 } },
        { slotType: "accessory", exercise: "reverse-lunge", alternatives: [], sets: { min: 3, max: 3 }, reps: { min: 10, max: 10 }, effort: "rir", rir: 2, finishers: [], notes: "Reps per leg" },
        { slotType: "accessory", exercise: "seated-leg-curl", alternatives: [], sets: { min: 2, max: 2 }, reps: { min: 10, max: 12 }, effort: "form_failure", finishers: ["eccentric-only"] },
        { slotType: "main", exercise: "db-shoulder-press", alternatives: ["overhead-press"], sets: { min: 2, max: 3 }, reps: { min: 6, max: 8 }, effort: "form_failure", finishers: [], progression: { type: "double_progression", repsMin: 6, repsMax: 8, increment: 2 } },
        { slotType: "accessory", exercise: "lateral-raise", alternatives: ["cable-lateral-raise"], sets: { min: 3, max: 4 }, reps: { min: 10, max: 12 }, effort: "form_failure", finishers: ["mechanical-drop"] },
        { slotType: "accessory", exercise: "standing-calf-raise", alternatives: [], sets: { min: 3, max: 3 }, reps: { min: 10, max: 12 }, effort: "rir", rir: 1, finishers: ["partials"] },
      ],
    },
    {
      key: "push-b",
      label: "Chest + Triceps B",
      slots: [
        { slotType: "primer", exercise: "band-pull-apart", alternatives: [], sets: { min: 1, max: 2 }, reps: { min: 12, max: 15 }, effort: "sub_max", restSec: 60, finishers: [] },
        { slotType: "main", exercise: "flat-db-press", alternatives: ["barbell-bench-press"], sets: { min: 3, max: 3 }, reps: { min: 6, max: 8 }, effort: "form_failure", finishers: [], progression: { type: "double_progression", repsMin: 6, repsMax: 8, increment: 2 } },
        { slotType: "accessory", exercise: "db-fly", alternatives: [], sets: { min: 2, max: 3 }, reps: { min: 10, max: 12 }, effort: "rir", rir: 1, finishers: ["partials"] },
        { slotType: "accessory", exercise: "triceps-pushdown", alternatives: [], sets: { min: 2, max: 3 }, reps: { min: 8, max: 12 }, effort: "form_failure", finishers: ["rest-pause"] },
        { slotType: "burnout", exercise: "dip", alternatives: [], sets: { min: 1, max: 1 }, reps: null, effort: "failure", finishers: ["partials"], progression: { type: "rep_target" } },
      ],
    },
    {
      key: "pull-b",
      label: "Back + Biceps B",
      slots: [
        { slotType: "primer", exercise: "face-pull", alternatives: [], sets: { min: 2, max: 2 }, reps: { min: 12, max: 15 }, effort: "sub_max", restSec: 60, finishers: [] },
        { slotType: "main", exercise: "barbell-row", alternatives: [], sets: { min: 3, max: 3 }, reps: { min: 6, max: 8 }, effort: "form_failure", finishers: [], progression: { type: "double_progression", repsMin: 6, repsMax: 8, increment: 5 } },
        { slotType: "accessory", exercise: "straight-arm-pulldown", alternatives: ["db-pullover"], sets: { min: 2, max: 3 }, reps: { min: 10, max: 12 }, effort: "rir", rir: 1, finishers: [] },
        { slotType: "accessory", exercise: "hammer-curl", alternatives: [], sets: { min: 2, max: 3 }, reps: { min: 8, max: 10 }, effort: "form_failure", finishers: [] },
        { slotType: "accessory", exercise: "preacher-curl", alternatives: [], sets: { min: 1, max: 1 }, reps: null, effort: "failure", technique: "trap-set", finishers: [] },
        { slotType: "burnout", exercise: "inverted-row", alternatives: [], sets: { min: 1, max: 1 }, reps: null, effort: "failure", finishers: [], progression: { type: "rep_target" } },
      ],
    },
    {
      key: "legs-b",
      label: "Legs + Shoulders B",
      slots: [
        { slotType: "primer", exercise: "goblet-squat", alternatives: [], sets: { min: 2, max: 2 }, reps: { min: 10, max: 12 }, effort: "sub_max", restSec: 75, finishers: [] },
        { slotType: "main", exercise: "back-squat", alternatives: ["front-squat"], sets: { min: 3, max: 3 }, reps: { min: 6, max: 6 }, effort: "rir", rir: 2, restSec: 180, finishers: [], progression: { type: "linear", sets: 3, reps: 6, increment: 5, stallLimit: 3, deloadPct: 0.1 } },
        { slotType: "accessory", exercise: "hip-thrust", alternatives: [], sets: { min: 3, max: 3 }, reps: { min: 8, max: 10 }, effort: "rir", rir: 1, finishers: [] },
        { slotType: "accessory", exercise: "leg-extension", alternatives: [], sets: { min: 2, max: 3 }, reps: { min: 10, max: 12 }, effort: "form_failure", finishers: ["partials"] },
        { slotType: "accessory", exercise: "cable-lateral-raise", alternatives: ["lateral-raise"], sets: { min: 3, max: 4 }, reps: { min: 8, max: 12 }, effort: "form_failure", finishers: [] },
        { slotType: "accessory", exercise: "rear-delt-fly", alternatives: [], sets: { min: 2, max: 2 }, reps: { min: 12, max: 15 }, effort: "rir", rir: 1, finishers: [] },
        { slotType: "accessory", exercise: "seated-calf-raise", alternatives: [], sets: { min: 3, max: 3 }, reps: { min: 12, max: 15 }, effort: "rir", rir: 1, finishers: ["partials"] },
      ],
    },
  ],
};
