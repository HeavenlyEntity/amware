-- Projects fields for the Payload `projects` collection (branch projects-cms).
--
-- Generated 2026-10-29 by the read-only dry run in
-- sim/projects-ddl.sim.test.mjs: drizzle-kit's own statements for this
-- checkout's schema against the live database, nothing hand-written. It
-- reported hasDataLoss=false, no DROP, and nothing outside `projects`.
-- Eight numeric-default SET DEFAULT no-ops it re-issues on every push
-- (users.login_attempts and the `order`/`seats`/`deposit_amount` columns)
-- are left out; their live defaults already match.
--
-- Run ONCE, by the owner, in the Supabase SQL editor, BEFORE this branch
-- reaches main (see 2026-10-29-projects-to-payload.md, step 3).
--
-- Before running: `select count(*) from projects;` must be 0. The NOT NULL
-- columns below cannot be added to a table with rows, and the transaction
-- rolls back whole if anything fails.
--
-- After running, until the branch is on main: no `pnpm dev` or `pnpm sim`
-- from main or any older checkout. The table is empty, so drizzle would
-- drop these columns without asking.

BEGIN;

CREATE TYPE "public"."enum_projects_story_chapters_icon" AS ENUM('search', 'code', 'rocket', 'workflow', 'customize', 'blocks', 'responsive', 'computer', 'system');
CREATE TYPE "public"."enum_projects_kind" AS ENUM('venture', 'client', 'oss', 'internal');
CREATE TYPE "public"."enum_projects_status" AS ENUM('live', 'development', 'archived');
CREATE TABLE "projects_tags" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"label" varchar NOT NULL
);
CREATE TABLE "projects_story_chapters" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"icon" "enum_projects_story_chapters_icon" NOT NULL,
	"body" varchar NOT NULL
);
CREATE TABLE "projects_story_results" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"value" varchar NOT NULL,
	"label" varchar NOT NULL
);
CREATE TABLE "projects_story_stack" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"label" varchar NOT NULL
);
ALTER TABLE "projects" ADD COLUMN "key" varchar NOT NULL;
ALTER TABLE "projects" ADD COLUMN "kind" "enum_projects_kind" NOT NULL;
ALTER TABLE "projects" ADD COLUMN "status" "enum_projects_status" NOT NULL;
ALTER TABLE "projects" ADD COLUMN "date" timestamp(3) with time zone NOT NULL;
ALTER TABLE "projects" ADD COLUMN "on_bench" boolean DEFAULT false;
ALTER TABLE "projects" ADD COLUMN "what_happened" varchar;
ALTER TABLE "projects" ADD COLUMN "org" varchar;
ALTER TABLE "projects" ADD COLUMN "private_note" varchar;
ALTER TABLE "projects" ADD COLUMN "story_lede" varchar;
ALTER TABLE "projects" ADD COLUMN "story_team_size" numeric DEFAULT 0;
ALTER TABLE "projects" ADD COLUMN "story_team_label" varchar;
ALTER TABLE "projects" ADD COLUMN "story_team_note" varchar;
ALTER TABLE "projects" ADD COLUMN "story_netsuite" boolean DEFAULT false;
ALTER TABLE "projects" ADD COLUMN "activity" jsonb;
ALTER TABLE "projects_tags" ADD CONSTRAINT "projects_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "projects_story_chapters" ADD CONSTRAINT "projects_story_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "projects_story_results" ADD CONSTRAINT "projects_story_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "projects_story_stack" ADD CONSTRAINT "projects_story_stack_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "projects_tags_order_idx" ON "projects_tags" USING btree ("_order");
CREATE INDEX "projects_tags_parent_id_idx" ON "projects_tags" USING btree ("_parent_id");
CREATE INDEX "projects_story_chapters_order_idx" ON "projects_story_chapters" USING btree ("_order");
CREATE INDEX "projects_story_chapters_parent_id_idx" ON "projects_story_chapters" USING btree ("_parent_id");
CREATE INDEX "projects_story_results_order_idx" ON "projects_story_results" USING btree ("_order");
CREATE INDEX "projects_story_results_parent_id_idx" ON "projects_story_results" USING btree ("_parent_id");
CREATE INDEX "projects_story_stack_order_idx" ON "projects_story_stack" USING btree ("_order");
CREATE INDEX "projects_story_stack_parent_id_idx" ON "projects_story_stack" USING btree ("_parent_id");
CREATE UNIQUE INDEX "projects_key_idx" ON "projects" USING btree ("key");

COMMIT;
