CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"lang" text,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_email_shape" CHECK (char_length("waitlist"."email") <= 254 and "waitlist"."email" ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'),
	CONSTRAINT "waitlist_fields_short" CHECK (coalesce(char_length("waitlist"."lang"), 0) <= 12 and coalesce(char_length("waitlist"."source"), 0) <= 40)
);
--> statement-breakpoint
ALTER TABLE "waitlist" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_email_key" ON "waitlist" USING btree (lower("email"));--> statement-breakpoint
CREATE POLICY "waitlist_join" ON "waitlist" AS PERMISSIVE FOR INSERT TO "anon", "authenticated" WITH CHECK (true);