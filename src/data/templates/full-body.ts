import type { ProgramTemplate } from "../../domain/template";
import { dp, slot } from "./helpers";

/** 3 days: full body each session. Best for busy weeks or newer lifters. */
export const fullBody: ProgramTemplate = {
  slug: "full-body",
  name: "Full Body 3×",
  version: 1,
  description: "3 days a week. Each session trains the whole body.",
  weekLayout: ["fb-a", "fb-b", "fb-c"],
  days: [
    {
      key: "fb-a",
      label: "Full Body A",
      slots: [
        slot("primer", "band-external-rotation", [1, 2], [12, 15], { restSec: 60 }),
        slot("main", "back-squat", [3, 3], [5, 7], { alternatives: ["goblet-squat", "bulgarian-split-squat"], rir: 2, restSec: 180, progression: dp(5, 7, 5) }),
        slot("main", "flat-db-press", [3, 3], [6, 10], { alternatives: ["db-floor-press", "pushup"], rir: 1, progression: dp(6, 10) }),
        slot("main", "seated-cable-row", [3, 3], [8, 12], { alternatives: ["db-row", "band-row"], rir: 1, progression: dp(8, 12, 5) }),
        slot("accessory", "lateral-raise", [2, 3], [12, 15], { rir: 1 }),
        slot("accessory", "hammer-curl", [2, 2], [10, 12], { rir: 1 }),
      ],
    },
    {
      key: "fb-b",
      label: "Full Body B",
      slots: [
        slot("primer", "glute-bridge", [2, 2], [10, 12], { restSec: 60 }),
        slot("main", "romanian-deadlift", [3, 3], [6, 10], { alternatives: ["db-romanian-deadlift"], rir: 2, progression: dp(6, 10, 5) }),
        slot("main", "pull-up", [3, 3], [5, 10], { alternatives: ["lat-pulldown", "band-row"], effort: "form_failure", progression: { type: "rep_target" } }),
        slot("main", "db-shoulder-press", [3, 3], [8, 10], { alternatives: ["pike-pushup"], rir: 1, progression: dp(8, 10) }),
        slot("accessory", "reverse-lunge", [2, 3], [10, 12], { rir: 1, notes: "Reps per leg" }),
        slot("accessory", "overhead-cable-extension", [2, 2], [10, 12], { alternatives: ["db-overhead-extension"], rir: 1 }),
      ],
    },
    {
      key: "fb-c",
      label: "Full Body C",
      slots: [
        slot("primer", "face-pull", [2, 2], [12, 15], { alternatives: ["band-face-pull"], restSec: 60 }),
        slot("main", "deadlift", [3, 3], [4, 6], { alternatives: ["db-romanian-deadlift"], rir: 2, restSec: 180, progression: dp(4, 6, 5) }),
        slot("main", "incline-db-press", [3, 3], [8, 10], { alternatives: ["pushup"], rir: 1, progression: dp(8, 10) }),
        slot("main", "db-row", [3, 3], [8, 12], { alternatives: ["band-row"], rir: 1, progression: dp(8, 12) }),
        slot("accessory", "standing-calf-raise", [3, 3], [10, 15], { alternatives: ["single-leg-calf-raise"], rir: 1 }),
        slot("burnout", "pushup", [1, 1], null, { technique: "ladder-1-5", progression: { type: "rep_target" } }),
      ],
    },
  ],
};
