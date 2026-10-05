CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TABLE "food_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"eaten_at" timestamp with time zone NOT NULL,
	"meal" "meal_type" NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"barcode" text,
	"grams" numeric(7, 1),
	"calories" numeric(7, 1) NOT NULL,
	"protein" numeric(6, 1) NOT NULL,
	"carbs" numeric(6, 1) NOT NULL,
	"fat" numeric(6, 1) NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "food_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"program_slug" text,
	"swaps" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"macro_targets" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "food_logs_user_eaten_idx" ON "food_logs" USING btree ("user_id","eaten_at");--> statement-breakpoint
CREATE POLICY "food_logs_own" ON "food_logs" AS PERMISSIVE FOR ALL TO "authenticated" USING ("user_id" = (select auth.uid())) WITH CHECK ("user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "profiles_own" ON "profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING ("profiles"."id" = (select auth.uid())) WITH CHECK ("profiles"."id" = (select auth.uid()));