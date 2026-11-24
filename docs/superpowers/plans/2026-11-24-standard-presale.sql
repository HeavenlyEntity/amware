-- WareKit Standard presale: lets a kit row and a license carry stack = 'standard'.
-- Adds one value to two existing enums. No table or column changes.
--
-- NOT YET APPLIED. Run ONCE, by Alec, in the Supabase SQL editor, BEFORE branch
-- claude/value-ladder-positioning-00b452 is merged or deployed anywhere, previews included.
--
-- WARNING: one database serves dev and production. After running, until this branch is on
-- main, do not run `pnpm dev` or `pnpm sim` from main or any older checkout: its schema
-- does not know the new value.
--
-- Pre-run check. Read-only. Expect two rows, neither listing 'standard':
--   SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder)
--     FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
--    WHERE t.typname IN ('enum_products_stack', 'enum_licenses_stack') GROUP BY 1;

ALTER TYPE "public"."enum_products_stack" ADD VALUE IF NOT EXISTS 'standard';
ALTER TYPE "public"."enum_licenses_stack" ADD VALUE IF NOT EXISTS 'standard';

-- Post-run check: run the SELECT above again. Both rows now end with 'standard'.
