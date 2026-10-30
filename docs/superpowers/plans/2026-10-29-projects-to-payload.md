# Move the Projects content into Payload

Status, 2026-10-29: steps 1–4 done. The SQL ran in Supabase, and the seed
wrote all 15 projects; they read back identical to content/site/projects.js.
Step 5 is written on `projects-cms` but not committed: the page and the AI
documents read Payload, falling back to the static file. Step 6 (verify,
then push) is next.

## Goal

Edit the Projects page in the Payload admin instead of in
`src/content/site/projects.js`. The page, case-study drawer, timeline, hero
stats and the AI/`llms.txt` project text all read from Payload. The static file
stays as the fallback if the database is unreachable.

## What exists today

- **Payload `projects` collection** (`src/collections/Projects.ts`): only
  `name`, `description`, `link{url,label}`, `logo` (upload) and `order`. Nothing
  on the site reads it.
- **Production table `projects`** (checked read-only on 2026-10-29): columns
  `id, name, description, link_url, link_label, logo_id, order, updated_at,
created_at`. **0 rows.** `payload_locked_documents_rels.projects_id` already
  exists.
- **Readers of `projects.js`:**
  - `src/app/(site)/projects/ProjectsContent.jsx` (client): `projects`, `projectAnchor`
  - `src/lib/ai/documents.js`: `projects`, `projectAnchor` (the About summary and the `projects` document)
  - `project-archive.jsx`, `case-study-drawer.jsx`, `bench-feature.jsx`, `lib/projects/archive.js`: only the `KINDS`, `KINDS_SHORT` and `STATUS_LABELS` constants
  - `lib/projects/__tests__/archive.test.js`: the static data
- **Images** live in code: `PROJECT_MEDIA[key]` in `project-media.jsx`.
  `ProjectMark` and `ProjectCover` throw on an unknown `key`.
- **Bench vs archive** is array position: the first three entries are "On the bench".

## Data shape to model (15 projects)

| `projects.js`                           | Payload field                                      | Postgres                                                             |
| --------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| `name`                                  | `name` (exists)                                    | `name`                                                               |
| `key`                                   | `key` text, required, unique                       | `key varchar`, unique index `projects_key_idx`                       |
| `kind`                                  | select: venture, client, oss, internal             | `enum_projects_kind`                                                 |
| `status`                                | select: live, development, archived                | `enum_projects_status`                                               |
| `date` `'MM/DD/YY'`                     | `date` (date picker)                               | `date timestamp(3) with time zone`                                   |
| `description`                           | `description` (exists)                             | `description`                                                        |
| `link.href` / `link.label`              | `link.url` / `link.label` (exist)                  | `link_url`, `link_label`                                             |
| `whatHappened`                          | `whatHappened` textarea                            | `what_happened varchar`                                              |
| `org` (3 projects)                      | `org` text                                         | `org varchar`                                                        |
| `privateNote` (1)                       | `privateNote` textarea                             | `private_note varchar`                                               |
| position 1–3                            | `onBench` checkbox                                 | `on_bench boolean`                                                   |
| position                                | `order` (exists)                                   | `order`                                                              |
| `activity` (no defined meaning, hidden) | `activity` json                                    | `activity jsonb`                                                     |
| `tags[]`                                | array `tags{label}`                                | table `projects_tags`                                                |
| `story.lede`                            | group `story.lede`                                 | `story_lede varchar`                                                 |
| `story.chapters[]{t,i,b}`               | array `story.chapters{title, icon (select), body}` | table `projects_story_chapters`, `enum_projects_story_chapters_icon` |
| `story.results[]{v,l}`                  | array `story.results{value,label}`                 | table `projects_story_results`                                       |
| `story.team{size,label,note}`           | group `story.team`                                 | `story_team_size numeric`, `story_team_label`, `story_team_note`     |
| `story.stack[]`                         | array `story.stack{label}`                         | table `projects_story_stack`                                         |
| `story.netsuite` (3)                    | `story.netsuite` checkbox                          | `story_netsuite boolean`                                             |

Chapter icons in use: search, code, rocket, workflow, customize, blocks,
responsive, computer, system.

Readable admin names (`title`, `body`, `value`) are mapped back to the
existing `t/i/b` and `v/l` keys in one adapter, so no component changes shape.

`KINDS`, `KINDS_SHORT` and `STATUS_LABELS` stay in code. They are labels for the
select values, not content.

## The shared-database hazard, applied here

One Postgres serves dev and production, and there are no migrations
(`src/migrations` does not exist). Two rules come from that:

1. **Production never pushes schema.** Payload names every declared column in
   every query. If the new collection code reaches `main` before the columns
   exist, `/projects`, `/ai/projects` and `llms.txt` fail, and so does the build.
   **The columns must exist before the push to `main`.**
2. **Every non-production Payload boot pushes its checkout's schema.** That
   includes `pnpm dev` and every `pnpm sim` file that starts Payload. A checkout
   whose `Projects.ts` lacks the new fields generates `DROP COLUMN` and
   `DROP TABLE` for them. **The `projects` table has 0 rows, so drizzle-kit drops
   without prompting.** From the moment the SQL runs until the code is on
   `main`, nobody runs `pnpm dev` or `pnpm sim` from `main` or any older
   checkout or worktree. Set `PAYLOAD_MIGRATING=true` on any sim run, which
   skips the push.

The change is purely additive: new nullable-or-defaulted columns, three
enums, four child tables, and no renames or drops. The current production
deploy keeps working after the SQL runs, because it only selects the old
columns.

## Steps

### 1. Branch and model, with no reads switched yet

Branch `projects-cms` from `main`.

- `src/collections/Projects.ts`: add the fields from the table above.
  - `admin.useAsTitle: 'name'`, `defaultColumns: ['name', 'kind', 'status', 'date']`.
  - A `validate` on `onBench` that allows at most three.
  - Admin descriptions carry the rules now in code comments: `story.team.size` 0 means "label only"; a leading number in `results.value` counts up; results stay honest, with no invented metrics.
  - No drafts or versions. Versions would add `_projects_v*` tables and double the DDL.
- `src/payload-types.ts`: hand-edit `Project` and `ProjectsSelect`. `generate:types` is broken in this repo.
- `src/lib/projects/cms.js` (new):
  - `fromPayload(doc)`: returns exactly the `projects.js` shape. It formats the date as `MM/DD/YY` and maps `link.url` to `href`, `title/icon/body` to `t/i/b`, `value/label` to `v/l`, and `tags[].label` / `stack[].label` to strings. It omits `org`, `privateNote` and `netsuite` when they are empty, so `privateNoteFor` and the drawer behave as today.
  - `toPayload(project, index)`: the inverse, used by the seed.
  - `loadProjects()`: `cache()`d. Runs `payload.find({ collection: 'projects', depth: 0, limit: 100, sort: 'order' })` and maps through `fromPayload`. Bench projects come first, then the rest in `order`. **Falls back to the static `projects` on error or when 0 docs come back**, and logs the error. This is the same try/catch shape as `courses/page.tsx`.
- `src/lib/projects/__tests__/cms.test.js`: round-trip every static project through `toPayload` and then `fromPayload`, and expect deep equality. This proves the seed loses nothing.
- Gate: eslint, prettier, `tsc --noEmit`, vitest. **No `pnpm dev`, no `pnpm sim`, no `pnpm build` yet.** The build would query columns that don't exist.

### 2. Get the exact DDL from Payload, then review it

Hand-written DDL can miss Payload's naming: constraint names, `timestamp(3)`,
enum names inside a group's array. If a name drifts, the next push in any
checkout tries to "fix" it.

- **Preferred:** a dry-run sim file, `sim/projects-ddl.sim.test.mjs`, run from the branch with `PAYLOAD_MIGRATING=true`.
  - It boots Payload without pushing.
  - It calls the adapter's drizzle-kit `pushSchema` and prints `statementsToExecute` and `hasDataLoss`.
  - **It never calls `apply()`.** This only reads the live schema.
  - The output should be exactly the additions below. Any `DROP`, or anything touching other collections, means drift: stop and investigate.
  - Confirm the `pushSchema` API against `@payloadcms/db-postgres` 3.85 at implementation time.
- **Fallback:** the draft below. It follows the conventions read from production (`products_pricing_highlights`: `_order`, `_parent_id`, `id varchar` PK, `<table>_order_idx`, `<table>_parent_id_idx`, `<table>_parent_id_fk ... ON DELETE CASCADE`).

**Done.** The dry run passed on 2026-10-29: 34 statements, all for
`projects`, `hasDataLoss=false`, no `DROP`. The output is in
`docs/superpowers/plans/2026-10-29-projects-cms.sql`, wrapped in one
transaction. It replaces the hand-written draft that was here.

- It matched the draft, except that chapter `icon` is `NOT NULL` (the field is
  required), and the foreign keys are added as separate `ALTER TABLE`s.
- The dry run also re-issued `SET DEFAULT` for eight numeric columns,
  `projects.order` among them. The live defaults already match. This is
  drizzle-kit comparing a string default with a number on every push, and
  `pnpm dev` does the same today. The sim lists these statements and leaves
  them out of the file.

Supabase enables RLS warnings on new public tables. The existing Payload child
tables show what to match: Payload connects as the table owner, so no policy is
needed for it. Check that the advisor output is the same as for
`products_pricing_highlights` and add nothing new.

### 3. Owner runs the SQL (Alec)

As with the Whop columns, column creation is the owner's step in the Supabase
SQL editor. Claude does not apply DDL to production.

1. `select count(*) from projects;`. If it isn't 0, drop the `NOT NULL`s from the draft and add them after the seed.
2. Run the committed SQL.
3. Verify: `select column_name from information_schema.columns where table_name like 'projects%'`. Expect the new columns and the four tables.

**From here until step 6 lands, no `pnpm dev` or `pnpm sim` from `main` or an older checkout.**

### 4. Seed the 15 projects

`sim/projects-seed.sim.test.mjs`, run once from the branch:
`PAYLOAD_MIGRATING=true pnpm sim sim/projects-seed.sim.test.mjs`.

- Upserts by `key` through the Payload local API with `toPayload`, so child rows get Payload's own ids. Running it again is safe.
- `onBench` is true for Gearz, EdenKode and Celestial, the current first three. `order` is the current index.
- Asserts afterwards: 15 docs, and `fromPayload` of each deep-equals its static entry.
- It does not seed images. Those stay in code (step 5).

The `TODO(alec)` comments in `projects.js` move into a checklist in the runbook:

- unknown team sizes;
- no numeric results for seven projects;
- Exhibit House's assumed date, status and placeholder cover;
- Chamoji's date.

Each can then be corrected in the admin.

**After step 3 (2026-10-29):** a dry run against the new schema finds no
missing columns. It only wants `DISABLE ROW LEVEL SECURITY` on the four child
tables, because Supabase switched RLS on when they were created; every other
Payload table has it off. Payload connects as `postgres`, the owner, and RLS
isn't forced, so reads and writes work either way. The next `pnpm dev` push
from a checkout with these fields will switch it off to match.

### 5. Switch the reads

- `projects/page.jsx`: `const projects = await loadProjects()` and pass it to `<ProjectsContent projects={projects} … />`. `ProjectsContent` takes the prop instead of the import.
- `lib/ai/documents.js`: `getDocument` is already async. Use `await loadProjects()` for the About summary and the `projects` document, so `llms.txt`, `/ai/projects` and `projects.md` match the page.
- **Fresh edits:** the page revalidates daily, so admin edits would take up to 24 hours to show.
  - Add an `afterChange` and an `afterDelete` hook on `Projects` that call `revalidatePath('/projects')`, plus the AI paths.
  - Keep the daily revalidate for the year rollover.
- **Images:** keep `PROJECT_MEDIA` keyed by `key`. Give `ProjectMark` and `ProjectCover` a fallback for an unknown key: the project's initial on the logo tile, and the existing `Pattern` as the cover. A project added in the admin then renders instead of crashing.
  - Uploaded `logo`/`cover` Media is a separate, later phase. It needs the S3 host in `images.remotePatterns` and 15 uploads.
- `archive.test.js` keeps testing the static file. `cms.test.js` proves the two stay equal.

**From the code review of steps 1–2, to handle here:**

- **Bench:** derive the bench from `onBench`, not `slice(0, 3)`.
  - With fewer than three ticked, the newest archive project would be promoted silently.
  - The validator only caps the bench at three.
- **ISR and the fallback:** `loadProjects` returns the static file on a database error. During a regeneration, Next caches that fallback as a success, for up to the `revalidate` window.
  - Either rethrow on error after the first render, so Next keeps the last good page, or shorten `revalidate`.
  - Add the revalidate hook either way.
- **The `key` description already promises a placeholder,** so the `ProjectMark` and `ProjectCover` fallback must land in the same commit as the switch.
- **`ProjectsContent`** builds `featured`, `archive` and `indexByAnchor` at module scope. These move into the component, or into props.

**Done (uncommitted), 2026-10-29:**

- `lib/projects/load.js` returns `{ projects, benchCount }`; the bench count
  comes from `onBench`. `loadProjects()` falls back on a database error (the
  AI documents, which are force-dynamic). `loadProjectsForPage()` rethrows
  during a production regeneration so Next keeps the last good page, and
  falls back at build and in dev.
- The revalidate hook only covers `/projects`. The AI routes render on every
  request, so `revalidatePath` on them would do nothing.
- The bench copy still says "The three newest builds"; with the checkbox, that
  is only true while the admin keeps it so. TODO(alec): reword if needed.
- The hook revalidates inside `after()`, so after Payload commits. Calling
  it inside the transaction could let a visitor regenerate the page from the
  old rows and cache that for a day.
- With no project on the bench, the "On the bench" heading still renders
  empty. The section stays because the hero's button links to `#pj-bench`.
- Open question for Alec: if the database fails during a production build,
  the static file is baked in for up to a day, silently. Failing the build
  when `VERCEL_ENV === 'production'` would surface it, at the cost of a failed
  deploy on a pooler blip.
- A production build prerendered `/projects` from Payload with no CMS errors:
  3 bench and 12 archive projects, and `/projects.md` lists all 15.

### 6. Verify, then push to `main`

- eslint on changed files, prettier, `tsc --noEmit`, `pnpm test`.
- `pnpm build`: safe now that the columns exist. It reads production.
- `next start` on port 3100 via `.claude/launch.json`:
  - the page matches the current one at 1440 and 375;
  - open a drawer;
  - check hero counts (9 live, 3 in development);
  - edit one field in `/admin` and see it on `/projects`;
  - then revert the edit.
- Fallback check: with a bad `DATABASE_URI` in a throwaway shell, the build still renders the static projects.
- Commit with gitmoji and push to `main`, per the commit rule. Then confirm the Vercel deploy built.
- After the push, update the shared-DB memory. Older worktrees under `.claude/worktrees/` must merge `main` before any `pnpm dev`.

### Rollback

- **Code:** revert the commit. The page reads `projects.js` again, and the extra columns are harmless to old code.
- **Data:** the static file is never deleted in this plan, so nothing is lost.
- Remove the columns only by explicit SQL, never by a stale checkout's push.

## Decisions for Alec

1. **Images:** keep them in code for now (recommended), or move them to Media uploads in the same change?
2. **Static file:** after a month of editing in the admin, delete `projects.js` and keep only a tiny fallback? Or keep it as the full mirror? Keeping it means edits made in the admin drift from the file.
3. **Chamoji's date:** keep 10/14/23 (first commit), or use the 10/28/26 launch? This is still unanswered from the Projects work.
