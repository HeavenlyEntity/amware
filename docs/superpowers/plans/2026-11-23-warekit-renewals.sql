-- WareKit renewals: twelve months of updates for a paid license. Adds seven date columns to
-- `licenses`, three renewal columns to `products`, and `kind` (with its enum) to `purchases`.
-- The virtual `licenses.updatesUntil` field has no column and is not in this file.
--
-- NOT YET APPLIED. Run ONCE, by Alec, in the Supabase SQL editor, BEFORE branch `warekit-renewals`
-- is merged or deployed. Nothing has been run against any database: this file was written by hand
-- from the field declarations (not from a `pnpm sim` dry run, which this plan forbids), and its
-- column names and types were checked against 2026-10-31-licensing.sql (a `date` field is
-- `timestamp(3) with time zone`, a `text` field is `varchar`, a `number` is `numeric`, a `select`
-- is an enum named `enum_<collection>_<field_snake>`).
--
-- One transaction: it rolls back whole if any statement fails. Re-running the file fails at
-- CREATE TYPE, which is the guard.
--
-- WARNING: one database serves dev and production. After running, until this branch is on main, a
-- `pnpm dev` or `pnpm sim` from any checkout that lacks these fields will see the columns as
-- unknown and drop them without asking. Do not run either from main or an older checkout.
--
-- Run the read-only check below FIRST.

-- Pre-run check. Read-only. Expect 0 rows from each.
--   SELECT table_name, column_name FROM information_schema.columns
--    WHERE table_schema = 'public' AND (table_name, column_name) IN (
--      ('licenses','updates_computed_until'), ('licenses','updates_until_override'),
--      ('licenses','first_reminder_sent_for'), ('licenses','last_reminder_sent_for'),
--      ('licenses','ended_notice_sent_for'), ('licenses','access_withdrawn_at'),
--      ('licenses','access_withdrawn_for'), ('products','creem_renewal_product_id'),
--      ('products','creem_renewal_sandbox_product_id'), ('products','renewal_price'),
--      ('purchases','kind'));
--   SELECT typname FROM pg_type WHERE typname = 'enum_purchases_kind';

BEGIN;

CREATE TYPE "public"."enum_purchases_kind" AS ENUM('sale', 'upgrade', 'renewal');

ALTER TABLE "licenses" ADD COLUMN "updates_computed_until" timestamp(3) with time zone;
ALTER TABLE "licenses" ADD COLUMN "updates_until_override" timestamp(3) with time zone;
ALTER TABLE "licenses" ADD COLUMN "first_reminder_sent_for" timestamp(3) with time zone;
ALTER TABLE "licenses" ADD COLUMN "last_reminder_sent_for" timestamp(3) with time zone;
ALTER TABLE "licenses" ADD COLUMN "ended_notice_sent_for" timestamp(3) with time zone;
ALTER TABLE "licenses" ADD COLUMN "access_withdrawn_at" timestamp(3) with time zone;
ALTER TABLE "licenses" ADD COLUMN "access_withdrawn_for" timestamp(3) with time zone;
ALTER TABLE "products" ADD COLUMN "creem_renewal_product_id" varchar;
ALTER TABLE "products" ADD COLUMN "creem_renewal_sandbox_product_id" varchar;
ALTER TABLE "products" ADD COLUMN "renewal_price" numeric;
ALTER TABLE "purchases" ADD COLUMN "kind" "enum_purchases_kind";

COMMIT;

-- Check afterwards: the first query above now returns 11 rows, and
--   SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity;  -- expect 0
--
-- No backfill. Existing kit purchases keep kind NULL, which the code reads as a sale.
-- Existing sandbox licenses get their date from the daily job's live run (Task 9), which
-- recomputes every paid license before it acts. Nobody is emailed by this file.
--
-- Rollback, only if the branch is abandoned before the code relies on it:
--   ALTER TABLE licenses DROP COLUMN updates_computed_until, DROP COLUMN updates_until_override,
--     DROP COLUMN first_reminder_sent_for, DROP COLUMN last_reminder_sent_for,
--     DROP COLUMN ended_notice_sent_for, DROP COLUMN access_withdrawn_at,
--     DROP COLUMN access_withdrawn_for;
--   ALTER TABLE products DROP COLUMN creem_renewal_product_id,
--     DROP COLUMN creem_renewal_sandbox_product_id, DROP COLUMN renewal_price;
--   ALTER TABLE purchases DROP COLUMN kind;
--   DROP TYPE enum_purchases_kind;
