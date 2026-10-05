import { EXERCISES, TECHNIQUES } from "../src/data/catalog";
import type { LoggedExercise, LoggedSet, SetSegment, SlotType, Workout } from "../src/domain/types";
import { buildCatalog } from "../src/domain/volume";

export const catalog = buildCatalog(EXERCISES, TECHNIQUES);

let n = 0;
const id = () => `id-${++n}`;

export function set(reps: number | null, extra: Partial<LoggedSet> & { segments?: SetSegment[] } = {}): LoggedSet {
  return { id: id(), ordinal: 0, setType: "working", weight: 20, unit: "kg", reps, ...extra };
}

export function ex(exercise: string, sets: LoggedSet[], slotType: SlotType = "main"): LoggedExercise {
  return { id: id(), exercise, slotType, ordinal: 0, sets };
}

export function workout(startedAt: string, exercises: LoggedExercise[]): Workout {
  return { id: id(), startedAt, exercises };
}
