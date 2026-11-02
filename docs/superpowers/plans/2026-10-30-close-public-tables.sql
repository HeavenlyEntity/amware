-- Close the public Supabase Data API on the `public` schema.
--
-- APPLIED to production 2026-10-30 on the owner's approval, before
-- 2026-10-30-products-split.sql, so `products_audience` is born closed.
--
-- The problem: 26 tables had row level security off, and `anon` and
-- `authenticated` held full grants on every table in `public`. Anyone with
-- the publishable key, which is public by design, could read and write them
-- over /rest/v1, including `users` (password hashes), `users_sessions`,
-- `purchases` and `contact_submissions`. Confirmed with one count-only HEAD
-- request against `pricing_page`, which returned 206.
--
-- Evidence it was not used, checked 2026-10-30: pg_stat_statements has
-- tracked since 2026-06-04 with no evictions, and its only `anon` statements
-- are that one HEAD. `authenticated` has none. Edge logs reach back only to
-- about 2026-10-27 and hold no /rest/v1 traffic.
--
-- Why this is safe: nothing in this repo uses supabase-js, the publishable
-- key or the Data API. Payload connects as `postgres`, which owns all 30
-- public tables and has BYPASSRLS, so RLS and these revokes do not touch it.
-- Storage uses its own schema and is unaffected. `service_role` keeps access.
--
-- Two layers, because one does not survive on its own:
--   1. RLS on, with no policies, so `anon` and `authenticated` see nothing.
--   2. Grants revoked. A drizzle schema push wants to DISABLE ROW LEVEL
--      SECURITY on every table with it on (see sim/products-ddl.sim.test.mjs),
--      so `pnpm dev` could quietly undo layer 1. Layer 2 keeps the tables
--      closed if that happens.
--
-- Every statement is idempotent, and the file is safe to re-run. Rollback is
-- at the bottom.

BEGIN;

-- 1. RLS on the 26 tables the advisor lists. The four projects_* child tables
-- already have it, from the ensure_rls event trigger.
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payload_kv ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payload_locked_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payload_locked_documents_rels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payload_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payload_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payload_preferences_rels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_page ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_page_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_pricing_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_tech_stack ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases_rels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases_seat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_sessions ENABLE ROW LEVEL SECURITY;

-- 2. No grants for the API roles, now or on tables created later.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- 3. The advisor's other finding. It is an event trigger function, so an RPC
-- call could not run it, but nothing outside the trigger should reach it.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

COMMIT;

-- Check afterwards. Expect 0 and false:
--
--   SELECT count(*) FROM pg_tables
--    WHERE schemaname = 'public' AND NOT rowsecurity;
--   SELECT has_table_privilege('anon', 'public.users', 'SELECT');
--
-- Then the same HEAD against /rest/v1/pricing_page must return 401 or 403,
-- and the site and /admin must still load.

-- Rollback, only if a real reader turns up. It reopens the exposure, so
-- restore just what that reader needs, not this whole block:
--
--   GRANT SELECT ON public.<table> TO anon;
--   CREATE POLICY "<table> public read" ON public.<table>
--     FOR SELECT TO anon USING (true);
--
-- To undo everything:
--
--   ALTER TABLE public.<each table above> DISABLE ROW LEVEL SECURITY;
--   GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
--   GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--     GRANT ALL ON TABLES TO anon, authenticated;
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--     GRANT ALL ON SEQUENCES TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO PUBLIC;
