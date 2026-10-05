import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";
import {
  MOVEMENT_PATTERNS,
  SET_TYPES,
  SLOT_TYPES,
  TARGET_EFFORTS,
  TECHNIQUE_KINDS,
} from "../domain/types";

/* ------------------------------------------------------------------ enums */

export const slotType = pgEnum("slot_type", SLOT_TYPES);
export const setType = pgEnum("set_type", SET_TYPES);
export const techniqueKind = pgEnum("technique_kind", TECHNIQUE_KINDS);
export const movementPattern = pgEnum("movement_pattern", MOVEMENT_PATTERNS);
export const targetEffort = pgEnum("target_effort", TARGET_EFFORTS);
export const muscleRole = pgEnum("muscle_role", ["primary", "secondary"]);
export const muscleRegion = pgEnum("muscle_region", ["upper", "lower", "core"]);
export const exerciseBias = pgEnum("exercise_bias", ["stretch", "shortened", "mid"]);
export const weightUnit = pgEnum("weight_unit", ["kg", "lb"]);
export const visibility = pgEnum("visibility", ["private", "unlisted", "public"]);

/* ---------------------------------------------------------------- helpers */

/** Columns every client-synced table carries (client-generated uuid, LWW, tombstones). */
const synced = {
  id: uuid("id").primaryKey(),
  // Denormalized on every synced row so RLS and PowerSync sync rules need no joins.
  userId: uuid("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

const ownRows = (name: string, userId: { name: string }) =>
  pgPolicy(name, {
    for: "all",
    to: authenticatedRole,
    using: sql`${sql.identifier(userId.name)} = ${authUid}`,
    withCheck: sql`${sql.identifier(userId.name)} = ${authUid}`,
  });

const readAll = (name: string) =>
  pgPolicy(name, { for: "select", to: authenticatedRole, using: sql`true` });

/* ------------------------------------------------- reference data (global) */

export const muscles = pgTable(
  "muscles",
  {
    slug: text("slug").primaryKey(),
    name: text("name").notNull(),
    region: muscleRegion("region").notNull(),
  },
  () => [readAll("muscles_read")],
).enableRLS();

export const exercises = pgTable(
  "exercises",
  {
    slug: text("slug").primaryKey(),
    name: text("name").notNull(),
    equipment: text("equipment").array().notNull().default(sql`'{}'::text[]`),
    pattern: movementPattern("pattern").notNull(),
    bias: exerciseBias("bias").notNull(),
    // null = catalog exercise; set = a user's custom exercise.
    ownerId: uuid("owner_id"),
  },
  (t) => [
    index("exercises_owner_idx").on(t.ownerId),
    pgPolicy("exercises_read", {
      for: "select",
      to: authenticatedRole,
      using: sql`owner_id is null or owner_id = ${authUid}`,
    }),
    pgPolicy("exercises_write_own", {
      for: "all",
      to: authenticatedRole,
      using: sql`owner_id = ${authUid}`,
      withCheck: sql`owner_id = ${authUid}`,
    }),
  ],
).enableRLS();

export const exerciseMuscles = pgTable(
  "exercise_muscles",
  {
    exerciseSlug: text("exercise_slug")
      .notNull()
      .references(() => exercises.slug, { onDelete: "cascade", onUpdate: "cascade" }),
    muscleSlug: text("muscle_slug")
      .notNull()
      .references(() => muscles.slug),
    role: muscleRole("role").notNull(),
    volumeFactor: numeric("volume_factor", { precision: 3, scale: 2, mode: "number" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.exerciseSlug, t.muscleSlug] }), readAll("exercise_muscles_read")],
).enableRLS();

export const techniques = pgTable(
  "techniques",
  {
    slug: text("slug").primaryKey(),
    kind: techniqueKind("kind").notNull(),
    name: text("name").notNull(),
    countsAsSet: boolean("counts_as_set").notNull(),
    // Coach-editable: the stimulus value of partials/eccentrics is unsettled.
    volumeFactor: numeric("volume_factor", { precision: 3, scale: 2, mode: "number" }).notNull().default(0),
  },
  () => [readAll("techniques_read")],
).enableRLS();

/* --------------------------------------------------------------- programs */

export const licenses = pgTable(
  "licenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    licensor: text("licensor").notNull(),
    terms: text("terms"),
    revenueSharePct: numeric("revenue_share_pct", { precision: 5, scale: 2, mode: "number" }),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validTo: timestamp("valid_to", { withTimezone: true }),
  },
  () => [readAll("licenses_read")],
).enableRLS();

/**
 * A program stores its full template JSON (validated by programTemplateSchema)
 * so it syncs as one row and versions atomically. Slots are not normalized
 * into tables; analytics read them from the JSON.
 */
export const programs = pgTable(
  "programs",
  {
    ...synced,
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    version: integer("version").notNull().default(1),
    source: text("source").notNull().default("user"), // user | house | licensed | import
    licenseId: uuid("license_id").references(() => licenses.id),
    visibility: visibility("visibility").notNull().default("private"),
    template: jsonb("template").notNull(),
  },
  (t) => [
    uniqueIndex("programs_user_slug_version_idx").on(t.userId, t.slug, t.version),
    ownRows("programs_own", t.userId),
    pgPolicy("programs_read_public", {
      for: "select",
      to: authenticatedRole,
      using: sql`visibility = 'public' and deleted_at is null`,
    }),
  ],
).enableRLS();

export const volumeTargets = pgTable(
  "volume_targets",
  {
    ...synced,
    muscleSlug: text("muscle_slug")
      .notNull()
      .references(() => muscles.slug),
    minSets: numeric("min_sets", { precision: 4, scale: 1, mode: "number" }).notNull(),
    maxSets: numeric("max_sets", { precision: 4, scale: 1, mode: "number" }).notNull(),
    minFrequency: smallint("min_frequency").notNull().default(2),
  },
  (t) => [uniqueIndex("volume_targets_user_muscle_idx").on(t.userId, t.muscleSlug), ownRows("volume_targets_own", t.userId)],
).enableRLS();

/* ---------------------------------------------------------------- logging */

export const workouts = pgTable(
  "workouts",
  {
    ...synced,
    programId: uuid("program_id").references(() => programs.id),
    programDayKey: text("program_day_key"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    notes: text("notes"),
  },
  (t) => [index("workouts_user_started_idx").on(t.userId, t.startedAt), ownRows("workouts_own", t.userId)],
).enableRLS();

export const workoutExercises = pgTable(
  "workout_exercises",
  {
    ...synced,
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id),
    exerciseSlug: text("exercise_slug")
      .notNull()
      .references(() => exercises.slug, { onUpdate: "cascade" }),
    slotType: slotType("slot_type").notNull().default("main"),
    ordinal: smallint("ordinal").notNull(),
    notes: text("notes"),
  },
  (t) => [index("workout_exercises_workout_idx").on(t.workoutId), ownRows("workout_exercises_own", t.userId)],
).enableRLS();

export const sets = pgTable(
  "sets",
  {
    ...synced,
    workoutExerciseId: uuid("workout_exercise_id")
      .notNull()
      .references(() => workoutExercises.id),
    ordinal: smallint("ordinal").notNull(),
    setType: setType("set_type").notNull().default("working"),
    weight: numeric("weight", { precision: 7, scale: 2, mode: "number" }),
    unit: weightUnit("unit").notNull().default("kg"),
    reps: smallint("reps"),
    rir: smallint("rir"),
    rpe: numeric("rpe", { precision: 3, scale: 1, mode: "number" }),
    durationSec: integer("duration_sec"),
    // Technique that *is* the set (trap set, 1.5-rep ladder).
    techniqueSlug: text("technique_slug").references(() => techniques.slug),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("sets_workout_exercise_idx").on(t.workoutExerciseId), ownRows("sets_own", t.userId)],
).enableRLS();

/** Reps appended to a set with a technique: "+4 partials", "+2 eccentrics". */
export const setSegments = pgTable(
  "set_segments",
  {
    ...synced,
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id),
    ordinal: smallint("ordinal").notNull().default(0),
    techniqueSlug: text("technique_slug")
      .notNull()
      .references(() => techniques.slug),
    reps: smallint("reps").notNull(),
    weight: numeric("weight", { precision: 7, scale: 2, mode: "number" }),
  },
  (t) => [index("set_segments_set_idx").on(t.setId), ownRows("set_segments_own", t.userId)],
).enableRLS();
