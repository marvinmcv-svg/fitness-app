CREATE TYPE "public"."exercise_bias" AS ENUM('stretch', 'shortened', 'mid');--> statement-breakpoint
CREATE TYPE "public"."movement_pattern" AS ENUM('horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'hinge', 'knee_dominant', 'isolation', 'carry', 'core');--> statement-breakpoint
CREATE TYPE "public"."muscle_region" AS ENUM('upper', 'lower', 'core');--> statement-breakpoint
CREATE TYPE "public"."muscle_role" AS ENUM('primary', 'secondary');--> statement-breakpoint
CREATE TYPE "public"."set_type" AS ENUM('warmup', 'primer', 'working', 'drop', 'failure');--> statement-breakpoint
CREATE TYPE "public"."slot_type" AS ENUM('warmup', 'primer', 'corrective', 'main', 'accessory', 'burnout');--> statement-breakpoint
CREATE TYPE "public"."target_effort" AS ENUM('sub_max', 'rir', 'form_failure', 'failure');--> statement-breakpoint
CREATE TYPE "public"."technique_kind" AS ENUM('partials', 'eccentric_only', 'ladder_1_5', 'trap_set', 'rest_pause', 'cheat', 'myo', 'mechanical_drop');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('private', 'unlisted', 'public');--> statement-breakpoint
CREATE TYPE "public"."weight_unit" AS ENUM('kg', 'lb');--> statement-breakpoint
CREATE TABLE "exercise_muscles" (
	"exercise_slug" text NOT NULL,
	"muscle_slug" text NOT NULL,
	"role" "muscle_role" NOT NULL,
	"volume_factor" numeric(3, 2) NOT NULL,
	CONSTRAINT "exercise_muscles_exercise_slug_muscle_slug_pk" PRIMARY KEY("exercise_slug","muscle_slug")
);
--> statement-breakpoint
ALTER TABLE "exercise_muscles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "exercises" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"equipment" text[] DEFAULT '{}'::text[] NOT NULL,
	"pattern" "movement_pattern" NOT NULL,
	"bias" "exercise_bias" NOT NULL,
	"owner_id" uuid
);
--> statement-breakpoint
ALTER TABLE "exercises" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"licensor" text NOT NULL,
	"terms" text,
	"revenue_share_pct" numeric(5, 2),
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "licenses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "muscles" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"region" "muscle_region" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "muscles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"source" text DEFAULT 'user' NOT NULL,
	"license_id" uuid,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"template" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "programs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "set_segments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"set_id" uuid NOT NULL,
	"ordinal" smallint DEFAULT 0 NOT NULL,
	"technique_slug" text NOT NULL,
	"reps" smallint NOT NULL,
	"weight" numeric(7, 2)
);
--> statement-breakpoint
ALTER TABLE "set_segments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"workout_exercise_id" uuid NOT NULL,
	"ordinal" smallint NOT NULL,
	"set_type" "set_type" DEFAULT 'working' NOT NULL,
	"weight" numeric(7, 2),
	"unit" "weight_unit" DEFAULT 'kg' NOT NULL,
	"reps" smallint,
	"rir" smallint,
	"rpe" numeric(3, 1),
	"duration_sec" integer,
	"technique_slug" text,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "sets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "techniques" (
	"slug" text PRIMARY KEY NOT NULL,
	"kind" "technique_kind" NOT NULL,
	"name" text NOT NULL,
	"counts_as_set" boolean NOT NULL,
	"volume_factor" numeric(3, 2) DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "techniques" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "volume_targets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"muscle_slug" text NOT NULL,
	"min_sets" numeric(4, 1) NOT NULL,
	"max_sets" numeric(4, 1) NOT NULL,
	"min_frequency" smallint DEFAULT 2 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "volume_targets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workout_exercises" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"workout_id" uuid NOT NULL,
	"exercise_slug" text NOT NULL,
	"slot_type" "slot_type" DEFAULT 'main' NOT NULL,
	"ordinal" smallint NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "workout_exercises" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"program_id" uuid,
	"program_day_key" text,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "workouts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_exercise_slug_exercises_slug_fk" FOREIGN KEY ("exercise_slug") REFERENCES "public"."exercises"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_muscle_slug_muscles_slug_fk" FOREIGN KEY ("muscle_slug") REFERENCES "public"."muscles"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_segments" ADD CONSTRAINT "set_segments_set_id_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_segments" ADD CONSTRAINT "set_segments_technique_slug_techniques_slug_fk" FOREIGN KEY ("technique_slug") REFERENCES "public"."techniques"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sets" ADD CONSTRAINT "sets_workout_exercise_id_workout_exercises_id_fk" FOREIGN KEY ("workout_exercise_id") REFERENCES "public"."workout_exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sets" ADD CONSTRAINT "sets_technique_slug_techniques_slug_fk" FOREIGN KEY ("technique_slug") REFERENCES "public"."techniques"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volume_targets" ADD CONSTRAINT "volume_targets_muscle_slug_muscles_slug_fk" FOREIGN KEY ("muscle_slug") REFERENCES "public"."muscles"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exercise_slug_exercises_slug_fk" FOREIGN KEY ("exercise_slug") REFERENCES "public"."exercises"("slug") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercises_owner_idx" ON "exercises" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "programs_user_slug_version_idx" ON "programs" USING btree ("user_id","slug","version");--> statement-breakpoint
CREATE INDEX "set_segments_set_idx" ON "set_segments" USING btree ("set_id");--> statement-breakpoint
CREATE INDEX "sets_workout_exercise_idx" ON "sets" USING btree ("workout_exercise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "volume_targets_user_muscle_idx" ON "volume_targets" USING btree ("user_id","muscle_slug");--> statement-breakpoint
CREATE INDEX "workout_exercises_workout_idx" ON "workout_exercises" USING btree ("workout_id");--> statement-breakpoint
CREATE INDEX "workouts_user_started_idx" ON "workouts" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE POLICY "exercise_muscles_read" ON "exercise_muscles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "exercises_read" ON "exercises" AS PERMISSIVE FOR SELECT TO "authenticated" USING (owner_id is null or owner_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "exercises_write_own" ON "exercises" AS PERMISSIVE FOR ALL TO "authenticated" USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "licenses_read" ON "licenses" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "muscles_read" ON "muscles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "programs_own" ON "programs" AS PERMISSIVE FOR ALL TO "authenticated" USING ("user_id" = (select auth.uid())) WITH CHECK ("user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "programs_read_public" ON "programs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (visibility = 'public' and deleted_at is null);--> statement-breakpoint
CREATE POLICY "set_segments_own" ON "set_segments" AS PERMISSIVE FOR ALL TO "authenticated" USING ("user_id" = (select auth.uid())) WITH CHECK ("user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "sets_own" ON "sets" AS PERMISSIVE FOR ALL TO "authenticated" USING ("user_id" = (select auth.uid())) WITH CHECK ("user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "techniques_read" ON "techniques" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "volume_targets_own" ON "volume_targets" AS PERMISSIVE FOR ALL TO "authenticated" USING ("user_id" = (select auth.uid())) WITH CHECK ("user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "workout_exercises_own" ON "workout_exercises" AS PERMISSIVE FOR ALL TO "authenticated" USING ("user_id" = (select auth.uid())) WITH CHECK ("user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "workouts_own" ON "workouts" AS PERMISSIVE FOR ALL TO "authenticated" USING ("user_id" = (select auth.uid())) WITH CHECK ("user_id" = (select auth.uid()));