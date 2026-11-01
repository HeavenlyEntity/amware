-- WareKit licensing: the `licenses` collection, plus `license_id`, `grants_tier` and
-- `creem_environment` on `purchases`, the account and Creem product fields on `products`,
-- and the backfill of the kit purchases that already exist (branch claude/warekit-licensing-build-a71ce3).
--
-- NOT YET APPLIED. Run ONCE, by Alec, in the Supabase SQL editor, BEFORE this branch reaches main.
-- Nothing has been run against production: this file was only written, and rehearsed on a scratch
-- local Postgres built to the pre-change shape of the five tables it touches.
--
-- The DDL is drizzle-kit's own output from the read-only dry run in sim/licensing-ddl.sim.test.mjs:
-- the statements a dev push would run against the live database for this checkout. It reported
-- hasDataLoss=false, no DROP, 31 statements, and nothing outside `licenses`, `licenses_seat_members`,
-- `licenses_accounts`, `purchases`, `products`, `payload_locked_documents_rels` and the
-- `enum_licenses_*` / `enum_purchases_*` types. Drizzle's order varies run to run; the statements
-- below are the same 31, put in dependency order.
--
-- Deliberately left out, as in 2026-10-30-products-split.sql: 40 no-op statements the dry run also
-- listed. Thirty-two are `ALTER TABLE "<table>" DISABLE ROW LEVEL SECURITY`, one for each existing
-- table. The live ensure_rls event trigger turns RLS on for every table, so drizzle wants it off
-- where the database has it on, and disabling RLS is never wanted. Eight are numeric-default
-- `SET DEFAULT` no-ops (users.login_attempts, products.seats and the `order` / `story_team_size`
-- columns), because drizzle compares the live default as a string with the schema's number.
--
-- Added by hand, not by drizzle: for each new table (`licenses`, `licenses_seat_members`,
-- `licenses_accounts`) ENABLE ROW LEVEL SECURITY and REVOKE ALL FROM anon, authenticated, the two
-- layers from 2026-10-30-close-public-tables.sql. That file's default privileges already cover tables
-- created later, but stating them keeps these tables closed on their own.
--
-- Everything is in one transaction and rolls back whole if any statement fails. The final DO block
-- raises (and so rolls back) if any kit purchase is left without a license. Re-running the whole file
-- fails at CREATE TYPE, which is the guard; the backfill alone is safe to repeat.
--
-- After running, until the branch is on main: no `pnpm dev` or `pnpm sim` from main or any older
-- checkout. Their schema push would drop these tables and columns without asking.

BEGIN;

-- 1. Schema ---------------------------------------------------------------------------------------

CREATE TYPE "public"."enum_licenses_stack" AS ENUM('react-netsuite', 'next-netsuite');
CREATE TYPE "public"."enum_licenses_tier" AS ENUM('lite', 'pro', 'team', 'enterprise');
CREATE TYPE "public"."enum_licenses_accounts_status" AS ENUM('active', 'over_limit');
CREATE TYPE "public"."enum_licenses_creem_environment" AS ENUM('production', 'sandbox');
CREATE TYPE "public"."enum_purchases_grants_tier" AS ENUM('lite', 'pro', 'team');
CREATE TYPE "public"."enum_purchases_creem_environment" AS ENUM('production', 'sandbox');

CREATE TABLE "licenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_email" varchar NOT NULL,
	"stack" "enum_licenses_stack" NOT NULL,
	"tier" "enum_licenses_tier",
	"seat_override" numeric,
	"account_override" numeric,
	"quote_creem_product_id" varchar,
	"needs_review" boolean DEFAULT false,
	"tier_changed_at" timestamp(3) with time zone,
	"last_link_sent_at" timestamp(3) with time zone,
	"creem_environment" "enum_licenses_creem_environment" DEFAULT 'production',
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "licenses_seat_members" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"github_username" varchar NOT NULL,
	"invite_url" varchar,
	"added_at" timestamp(3) with time zone
);
CREATE TABLE "licenses_accounts" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"account_id" varchar NOT NULL,
	"status" "enum_licenses_accounts_status" DEFAULT 'active' NOT NULL,
	"creem_instance_id" varchar,
	"first_seen_at" timestamp(3) with time zone,
	"last_seen_at" timestamp(3) with time zone,
	"notified_at" timestamp(3) with time zone
);

ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "licenses_id" integer;
ALTER TABLE "products" ADD COLUMN "netsuite_accounts" numeric;
ALTER TABLE "products" ADD COLUMN "creem_upgrade_product_id" varchar;
ALTER TABLE "products" ADD COLUMN "creem_sandbox_product_id" varchar;
ALTER TABLE "products" ADD COLUMN "creem_upgrade_sandbox_product_id" varchar;
ALTER TABLE "purchases" ADD COLUMN "license_id" integer;
ALTER TABLE "purchases" ADD COLUMN "grants_tier" "enum_purchases_grants_tier";
ALTER TABLE "purchases" ADD COLUMN "creem_environment" "enum_purchases_creem_environment" DEFAULT 'production';

ALTER TABLE "licenses_seat_members" ADD CONSTRAINT "licenses_seat_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."licenses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "licenses_accounts" ADD CONSTRAINT "licenses_accounts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."licenses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_licenses_fk" FOREIGN KEY ("licenses_id") REFERENCES "public"."licenses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX "licenses_seat_members_order_idx" ON "licenses_seat_members" USING btree ("_order");
CREATE INDEX "licenses_seat_members_parent_id_idx" ON "licenses_seat_members" USING btree ("_parent_id");
CREATE INDEX "licenses_accounts_order_idx" ON "licenses_accounts" USING btree ("_order");
CREATE INDEX "licenses_accounts_parent_id_idx" ON "licenses_accounts" USING btree ("_parent_id");
CREATE INDEX "licenses_owner_email_idx" ON "licenses" USING btree ("owner_email");
CREATE INDEX "licenses_updated_at_idx" ON "licenses" USING btree ("updated_at");
CREATE INDEX "licenses_created_at_idx" ON "licenses" USING btree ("created_at");
CREATE INDEX "payload_locked_documents_rels_licenses_id_idx" ON "payload_locked_documents_rels" USING btree ("licenses_id");
CREATE INDEX "purchases_license_key_idx" ON "purchases" USING btree ("license_key");
CREATE INDEX "purchases_license_idx" ON "purchases" USING btree ("license_id");

-- 2. Close the new tables to the Data API ---------------------------------------------------------

ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses_seat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.licenses, public.licenses_seat_members, public.licenses_accounts
  FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.licenses_id_seq FROM anon, authenticated;

-- 3. Backfill -------------------------------------------------------------------------------------

-- Per-tier NetSuite account allowance: Pro 1, Team 3. Lite is not tracked, so it stays empty.
UPDATE products SET netsuite_accounts = 1 WHERE tier = 'pro';
UPDATE products SET netsuite_accounts = 3 WHERE tier = 'team';

-- One license for each existing kit purchase. A kit purchase is one whose item is a product that has
-- both a stack and a tier; that leaves out the digital guides and the legacy `warekit` row, which has
-- neither. Whop sandbox rows are test payments and are skipped. Nothing here assumes how many rows
-- there are or what their ids are: the set is whatever the data holds when the file runs.
--
-- The licenses table has no column pointing back at a purchase, so a single INSERT ... SELECT could not
-- tell which new license belongs to which purchase. Instead each purchase draws its license id from the
-- sequence first, in a temp table, and that map drives every later statement.
--
--   is_paid       purchases.status = 'paid'. A free Lite claim is stored as paid, with amount 0.
--   product_tier  the tier the product row carries; becomes purchases.grants_tier whatever the status.
--   license.tier  product_tier when the purchase is paid, NULL when it is not (refunded).
CREATE TEMP TABLE _license_backfill ON COMMIT DROP AS
SELECT p.id AS purchase_id,
       nextval(pg_get_serial_sequence('licenses', 'id'))::integer AS license_id,
       lower(btrim(p.email)) AS owner_email,
       pr.stack::text AS stack,
       pr.tier::text AS product_tier,
       (p.status = 'paid') AS is_paid,
       p.created_at AS purchase_created_at
  FROM purchases p
  JOIN purchases_rels r
    ON r.parent_id = p.id AND r.path = 'item' AND r.products_id IS NOT NULL
  JOIN products pr ON pr.id = r.products_id
 WHERE p.license_id IS NULL
   AND pr.stack IS NOT NULL
   AND pr.tier IS NOT NULL
   AND p.email IS NOT NULL
   AND p.whop_environment IS DISTINCT FROM 'sandbox'
 ORDER BY p.id;

INSERT INTO licenses (id, owner_email, stack, tier, needs_review, tier_changed_at,
                      creem_environment, created_at, updated_at)
SELECT m.license_id,
       m.owner_email,
       m.stack::enum_licenses_stack,
       CASE WHEN m.is_paid THEN m.product_tier::enum_licenses_tier END,
       false,
       CASE WHEN m.is_paid THEN m.purchase_created_at END,
       'production',
       m.purchase_created_at,
       now()
  FROM _license_backfill m;

UPDATE purchases p
   SET license_id = m.license_id,
       grants_tier = m.product_tier::enum_purchases_grants_tier
  FROM _license_backfill m
 WHERE p.id = m.purchase_id;

-- Seats move only with a paid purchase on a Pro or Team tier. A free Lite claim's username is not
-- copied into the license's seats, and a refunded purchase's is not either, because that access is
-- no longer owed. Those rows stay on `purchases`, and the license starts with none.
INSERT INTO licenses_seat_members (_order, _parent_id, id, github_username, invite_url, added_at)
SELECT s._order, m.license_id, s.id, s.github_username, s.invite_url, s.added_at
  FROM purchases_seat_members s
  JOIN _license_backfill m ON m.purchase_id = s._parent_id
 WHERE m.is_paid
   AND m.product_tier IN ('pro', 'team');

-- Stop and roll back if any kit purchase was missed.
DO $$
DECLARE
  missed integer;
BEGIN
  SELECT count(*) INTO missed
    FROM purchases p
    JOIN purchases_rels r
      ON r.parent_id = p.id AND r.path = 'item' AND r.products_id IS NOT NULL
    JOIN products pr ON pr.id = r.products_id
   WHERE pr.stack IS NOT NULL
     AND pr.tier IS NOT NULL
     AND p.whop_environment IS DISTINCT FROM 'sandbox'
     AND p.license_id IS NULL;
  IF missed > 0 THEN
    RAISE EXCEPTION 'licensing backfill: % kit purchase(s) have no license', missed;
  END IF;
END $$;

COMMIT;

-- Check afterwards. Every kit purchase should show one license; tier should be NULL only where the
-- purchase is not paid; the seat counts on each side should match for paid Pro and Team rows, and
-- the license side should be 0 for Lite and refunded rows:
--
--   SELECT p.id AS purchase, p.email, p.status, p.grants_tier, l.id AS license, l.owner_email,
--          l.stack, l.tier, l.tier_changed_at,
--          (SELECT count(*) FROM purchases_seat_members s WHERE s._parent_id = p.id) AS purchase_seats,
--          (SELECT count(*) FROM licenses_seat_members s WHERE s._parent_id = l.id) AS license_seats
--     FROM purchases p JOIN licenses l ON l.id = p.license_id
--    ORDER BY p.id;
--   SELECT slug, tier, netsuite_accounts FROM products WHERE tier IS NOT NULL ORDER BY slug;
--   SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity;   -- expect 0
--
-- Rollback, only if the branch is abandoned before the code relies on it:
--
--   ALTER TABLE purchases DROP COLUMN license_id, DROP COLUMN grants_tier, DROP COLUMN creem_environment;
--   ALTER TABLE products DROP COLUMN netsuite_accounts, DROP COLUMN creem_upgrade_product_id,
--     DROP COLUMN creem_sandbox_product_id, DROP COLUMN creem_upgrade_sandbox_product_id;
--   ALTER TABLE payload_locked_documents_rels DROP COLUMN licenses_id;
--   DROP TABLE licenses_accounts, licenses_seat_members, licenses;
--   DROP TYPE enum_licenses_accounts_status, enum_licenses_creem_environment, enum_licenses_stack,
--     enum_licenses_tier, enum_purchases_creem_environment, enum_purchases_grants_tier;
