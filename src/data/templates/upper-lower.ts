import type { ProgramTemplate } from "../../domain/template";
import { dp, slot } from "./helpers";

/** 4 days: upper / lower twice a week. Fits most schedules. */
export const upperLower: ProgramTemplate = {
  slug: "upper-lower",
  name: "Upper / Lower",
  version: 1,
  description: "4 days a week. Every muscle twice, sessions around an hour.",
  weekLayout: ["upper-a", "lower-a", "upper-b", "lower-b"],
  days: [
    {
      key: "upper-a",
      label: "Upper A",
      slots: [
        slot("primer", "band-pull-apart", [1, 2], [12, 15], { restSec: 60 }),
        slot("main", "incline-db-press", [3, 3], [6, 8], { effort: "form_failure", alternatives: ["db-floor-press", "pushup"], progression: dp(6, 8) }),
        slot("main", "seated-cable-row", [3, 3], [8, 10], { alternatives: ["db-row", "band-row"], rir: 1, progression: dp(8, 10, 5) }),
        slot("accessory", "lateral-raise", [3, 4], [10, 15], { rir: 1, finishers: ["partials"] }),
        slot("accessory", "incline-db-curl", [2, 3], [10, 12], { alternatives: ["hammer-curl"], rir: 1 }),
        slot("accessory", "overhead-cable-extension", [2, 3], [10, 12], { alternatives: ["db-overhead-extension"], rir: 1 }),
      ],
    },
    {
      key: "lower-a",
      label: "Lower A",
      slots: [
        slot("primer", "goblet-squat", [2, 2], [10, 12], { restSec: 75 }),
        slot("main", "back-squat", [3, 3], [5, 7], { alternatives: ["bulgarian-split-squat"], rir: 2, restSec: 180, progression: dp(5, 7, 5) }),
        slot("main", "romanian-deadlift", [3, 3], [8, 10], { alternatives: ["db-romanian-deadlift"], rir: 2, progression: dp(8, 10, 5) }),
        slot("accessory", "seated-leg-curl", [2, 3], [10, 12], { alternatives: ["nordic-curl"], effort: "form_failure", finishers: ["eccentric-only"] }),
        slot("accessory", "standing-calf-raise", [3, 3], [10, 12], { alternatives: ["single-leg-calf-raise"], rir: 1, finishers: ["partials"] }),
        slot("accessory", "plank", [2, 2], null, { alternatives: ["hanging-knee-raise"] }),
      ],
    },
    {
      key: "upper-b",
      label: "Upper B",
      slots: [
        slot("primer", "face-pull", [2, 2], [12, 15], { alternatives: ["band-face-pull"], restSec: 60 }),
        slot("main", "pull-up", [3, 3], [6, 10], { alternatives: ["lat-pulldown", "band-row"], effort: "form_failure", progression: { type: "rep_target" } }),
        slot("main", "flat-db-press", [3, 3], [8, 10], { alternatives: ["db-floor-press", "pushup"], rir: 1, progression: dp(8, 10) }),
        slot("accessory", "db-shoulder-press", [2, 3], [8, 10], { alternatives: ["pike-pushup"], rir: 1 }),
        slot("accessory", "rear-delt-fly", [2, 3], [12, 15], { rir: 1 }),
        slot("accessory", "hammer-curl", [2, 3], [8, 12], { rir: 1 }),
        slot("burnout", "dip", [1, 1], null, { alternatives: ["pushup"], finishers: ["partials"], progression: { type: "rep_target" } }),
      ],
    },
    {
      key: "lower-b",
      label: "Lower B",
      slots: [
        slot("primer", "glute-bridge", [2, 2], [10, 12], { restSec: 60 }),
        slot("main", "deadlift", [3, 3], [4, 6], { alternatives: ["db-romanian-deadlift"], rir: 2, restSec: 180, progression: dp(4, 6, 5) }),
        slot("main", "bulgarian-split-squat", [3, 3], [8, 10], { rir: 1, notes: "Reps per leg", progression: dp(8, 10) }),
        slot("accessory", "leg-extension", [2, 3], [10, 15], { alternatives: ["reverse-lunge"], effort: "form_failure", finishers: ["partials"] }),
        slot("accessory", "seated-calf-raise", [3, 3], [12, 15], { alternatives: ["single-leg-calf-raise"], rir: 1 }),
        slot("accessory", "cable-crunch", [2, 3], [10, 15], { alternatives: ["hanging-knee-raise", "plank"], rir: 1 }),
      ],
    },
  ],
};
