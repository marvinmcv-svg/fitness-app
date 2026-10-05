import type { Exercise, ExerciseMuscle, Muscle, Technique } from "../domain/types";

/**
 * Starter reference data. The production taxonomy (~300 exercises) is owned
 * by the coach; this seed covers the example template and the tests.
 */

export const MUSCLES: Muscle[] = [
  { slug: "chest", name: "Chest", region: "upper" },
  { slug: "front_delts", name: "Front delts", region: "upper" },
  { slug: "side_delts", name: "Side delts", region: "upper" },
  { slug: "rear_delts", name: "Rear delts", region: "upper" },
  { slug: "triceps", name: "Triceps", region: "upper" },
  { slug: "biceps", name: "Biceps", region: "upper" },
  { slug: "forearms", name: "Forearms", region: "upper" },
  { slug: "lats", name: "Lats", region: "upper" },
  { slug: "upper_back", name: "Upper back", region: "upper" },
  { slug: "traps", name: "Traps", region: "upper" },
  { slug: "rotator_cuff", name: "Rotator cuff", region: "upper" },
  { slug: "quads", name: "Quads", region: "lower" },
  { slug: "hamstrings", name: "Hamstrings", region: "lower" },
  { slug: "glutes", name: "Glutes", region: "lower" },
  { slug: "calves", name: "Calves", region: "lower" },
  { slug: "spinal_erectors", name: "Spinal erectors", region: "core" },
  { slug: "abs", name: "Abs", region: "core" },
];

/** Segment credit values are starting points only; the coach tunes them. */
export const TECHNIQUES: Technique[] = [
  { slug: "partials", kind: "partials", name: "Partials", countsAsSet: false, volumeFactor: 0.25 },
  { slug: "eccentric-only", kind: "eccentric_only", name: "Eccentric-only reps", countsAsSet: false, volumeFactor: 0.25 },
  { slug: "rest-pause", kind: "rest_pause", name: "Rest-pause", countsAsSet: false, volumeFactor: 0.5 },
  { slug: "myo-reps", kind: "myo", name: "Myo-reps", countsAsSet: false, volumeFactor: 0.5 },
  { slug: "cheat-reps", kind: "cheat", name: "Cheat reps", countsAsSet: false, volumeFactor: 0.25 },
  { slug: "mechanical-drop", kind: "mechanical_drop", name: "Mechanical drop set", countsAsSet: false, volumeFactor: 0.5 },
  { slug: "ladder-1-5", kind: "ladder_1_5", name: "1.5-rep ladder", countsAsSet: true, volumeFactor: 0 },
  { slug: "trap-set", kind: "trap_set", name: "Time-under-tension ladder", countsAsSet: true, volumeFactor: 0 },
];

const p = (muscle: string): ExerciseMuscle => ({ muscle, role: "primary", volumeFactor: 1 });
const s = (muscle: string, volumeFactor = 0.5): ExerciseMuscle => ({ muscle, role: "secondary", volumeFactor });

export const EXERCISES: Exercise[] = [
  // Primers / correctives
  { slug: "band-external-rotation", name: "Banded external rotation", equipment: ["band"], pattern: "isolation", bias: "mid", muscles: [p("rotator_cuff")] },
  { slug: "band-pull-apart", name: "Band pull-apart", equipment: ["band"], pattern: "horizontal_pull", bias: "shortened", muscles: [p("rear_delts"), s("upper_back")] },
  { slug: "scap-pulldown", name: "Scapular pulldown", equipment: ["cable"], pattern: "vertical_pull", bias: "mid", muscles: [p("lats")] },
  { slug: "face-pull", name: "Cable face pull", equipment: ["cable", "rope"], pattern: "horizontal_pull", bias: "shortened", muscles: [p("rear_delts"), s("rotator_cuff"), s("traps")] },
  { slug: "reverse-hyper", name: "Reverse hyperextension", equipment: ["machine"], pattern: "hinge", bias: "mid", muscles: [p("glutes"), s("spinal_erectors"), s("hamstrings")] },
  { slug: "goblet-squat", name: "Goblet squat", equipment: ["dumbbell"], pattern: "knee_dominant", bias: "stretch", muscles: [p("quads"), s("glutes")] },

  // Chest
  { slug: "incline-db-press", name: "Incline dumbbell press", equipment: ["dumbbell", "bench"], pattern: "horizontal_push", bias: "stretch", muscles: [p("chest"), s("front_delts"), s("triceps")] },
  { slug: "flat-db-press", name: "Dumbbell bench press", equipment: ["dumbbell", "bench"], pattern: "horizontal_push", bias: "stretch", muscles: [p("chest"), s("front_delts"), s("triceps")] },
  { slug: "barbell-bench-press", name: "Barbell bench press", equipment: ["barbell", "bench"], pattern: "horizontal_push", bias: "mid", muscles: [p("chest"), s("front_delts"), s("triceps")] },
  { slug: "cable-crossover", name: "Cable crossover", equipment: ["cable"], pattern: "isolation", bias: "shortened", muscles: [p("chest"), s("front_delts", 0.25)] },
  { slug: "db-fly", name: "Dumbbell fly", equipment: ["dumbbell"], pattern: "isolation", bias: "stretch", muscles: [p("chest")] },
  { slug: "pushup", name: "Push-up", equipment: ["bodyweight"], pattern: "horizontal_push", bias: "mid", muscles: [p("chest"), s("triceps"), s("front_delts")] },
  { slug: "dip", name: "Dip", equipment: ["bodyweight", "dip_station"], pattern: "vertical_push", bias: "stretch", muscles: [p("chest"), p("triceps"), s("front_delts")] },

  // Triceps
  { slug: "triceps-pushdown", name: "Triceps pushdown", equipment: ["cable"], pattern: "isolation", bias: "shortened", muscles: [p("triceps")] },
  { slug: "overhead-cable-extension", name: "Overhead cable extension", equipment: ["cable"], pattern: "isolation", bias: "stretch", muscles: [p("triceps")] },
  { slug: "lying-db-extension", name: "Lying dumbbell extension", equipment: ["dumbbell", "bench"], pattern: "isolation", bias: "stretch", muscles: [p("triceps")] },

  // Back
  { slug: "seated-cable-row", name: "Seated cable row", equipment: ["cable"], pattern: "horizontal_pull", bias: "mid", muscles: [p("upper_back"), p("lats"), s("biceps"), s("rear_delts")] },
  { slug: "barbell-row", name: "Barbell row", equipment: ["barbell"], pattern: "horizontal_pull", bias: "mid", muscles: [p("upper_back"), p("lats"), s("biceps"), s("spinal_erectors")] },
  { slug: "lat-pulldown", name: "Lat pulldown", equipment: ["cable"], pattern: "vertical_pull", bias: "stretch", muscles: [p("lats"), s("biceps"), s("upper_back")] },
  { slug: "pull-up", name: "Pull-up", equipment: ["bodyweight", "bar"], pattern: "vertical_pull", bias: "stretch", muscles: [p("lats"), s("biceps"), s("upper_back")] },
  { slug: "straight-arm-pulldown", name: "Straight-arm pulldown", equipment: ["cable"], pattern: "isolation", bias: "stretch", muscles: [p("lats")] },
  { slug: "db-pullover", name: "Dumbbell pullover", equipment: ["dumbbell", "bench"], pattern: "isolation", bias: "stretch", muscles: [p("lats"), s("chest", 0.25)] },
  { slug: "inverted-row", name: "Inverted row", equipment: ["bodyweight", "bar"], pattern: "horizontal_pull", bias: "mid", muscles: [p("upper_back"), s("lats"), s("biceps")] },

  // Biceps
  { slug: "barbell-curl", name: "Barbell curl", equipment: ["barbell"], pattern: "isolation", bias: "mid", muscles: [p("biceps"), s("forearms", 0.25)] },
  { slug: "hammer-curl", name: "Hammer curl", equipment: ["dumbbell"], pattern: "isolation", bias: "mid", muscles: [p("biceps"), s("forearms")] },
  { slug: "incline-db-curl", name: "Incline dumbbell curl", equipment: ["dumbbell", "bench"], pattern: "isolation", bias: "stretch", muscles: [p("biceps")] },
  { slug: "preacher-curl", name: "Preacher curl", equipment: ["dumbbell", "bench"], pattern: "isolation", bias: "shortened", muscles: [p("biceps")] },

  // Legs
  { slug: "deadlift", name: "Deadlift", equipment: ["barbell"], pattern: "hinge", bias: "mid", muscles: [p("glutes"), p("hamstrings"), p("spinal_erectors"), s("quads"), s("traps")] },
  { slug: "back-squat", name: "Back squat", equipment: ["barbell", "rack"], pattern: "knee_dominant", bias: "stretch", muscles: [p("quads"), p("glutes"), s("spinal_erectors")] },
  { slug: "front-squat", name: "Front squat", equipment: ["barbell", "rack"], pattern: "knee_dominant", bias: "stretch", muscles: [p("quads"), s("glutes"), s("spinal_erectors")] },
  { slug: "romanian-deadlift", name: "Romanian deadlift", equipment: ["barbell"], pattern: "hinge", bias: "stretch", muscles: [p("hamstrings"), p("glutes"), s("spinal_erectors")] },
  { slug: "reverse-lunge", name: "Dumbbell reverse lunge", equipment: ["dumbbell"], pattern: "knee_dominant", bias: "stretch", muscles: [p("quads"), p("glutes")] },
  { slug: "hip-thrust", name: "Barbell hip thrust", equipment: ["barbell", "bench"], pattern: "hinge", bias: "shortened", muscles: [p("glutes"), s("hamstrings", 0.25)] },
  { slug: "seated-leg-curl", name: "Seated leg curl", equipment: ["machine"], pattern: "isolation", bias: "stretch", muscles: [p("hamstrings")] },
  { slug: "leg-extension", name: "Leg extension", equipment: ["machine"], pattern: "isolation", bias: "shortened", muscles: [p("quads")] },
  { slug: "standing-calf-raise", name: "Standing calf raise", equipment: ["machine"], pattern: "isolation", bias: "stretch", muscles: [p("calves")] },
  { slug: "seated-calf-raise", name: "Seated calf raise", equipment: ["machine"], pattern: "isolation", bias: "mid", muscles: [p("calves")] },

  // Shoulders
  { slug: "overhead-press", name: "Overhead press", equipment: ["barbell"], pattern: "vertical_push", bias: "mid", muscles: [p("front_delts"), s("side_delts"), s("triceps")] },
  { slug: "db-shoulder-press", name: "Seated dumbbell shoulder press", equipment: ["dumbbell", "bench"], pattern: "vertical_push", bias: "mid", muscles: [p("front_delts"), s("side_delts"), s("triceps")] },
  { slug: "lateral-raise", name: "Dumbbell lateral raise", equipment: ["dumbbell"], pattern: "isolation", bias: "mid", muscles: [p("side_delts")] },
  { slug: "cable-lateral-raise", name: "Cable lateral raise", equipment: ["cable"], pattern: "isolation", bias: "stretch", muscles: [p("side_delts")] },
  { slug: "rear-delt-fly", name: "Rear delt fly", equipment: ["dumbbell"], pattern: "isolation", bias: "shortened", muscles: [p("rear_delts")] },
];
