# Products Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the catalogue into a redesigned WareKit NetSuite edition page at `/products`, a Standard edition waitlist at `/products/standard`, and a new Digital products page at `/digital-products`, backed by `line`, `edition` and digital-product fields on Payload `Products`.

**Architecture:** Marketing copy lives in `src/content/site/`. Payload owns commercial truth: status, price, plan or Creem id, deliverable. Pure functions in `src/lib/commerce/` turn a row into what a card shows, and pages pass client components a reduced shape only, because the kit query reads draft rows. Kits sell through Whop, digital products through Creem.

**Tech Stack:** Next 16 App Router, React 19, JavaScript for new files, Payload 3 on Supabase Postgres, Tailwind 4 plus a page stylesheet, `motion/react`, Resend, Turnstile, vitest.

**Spec:** Part C of `docs/design/2026-10-27-portfolio-upgrade/PROMPT.md`, and three boards from the live canvas (https://claude.ai/artifact/FRkuu8ejMKhFdpoe32prmJ), saved uncommitted in `docs/design/2026-10-27-portfolio-upgrade/reference/`:

- `products.design.html`: "WareKit NetSuite edition · redesign"
- `standard.design.html`: "WareKit Standard edition · waitlist"
- `digital-products.design.html`: "Digital Products · new page"

They are canvas prototypes, read as PROMPT.md describes: `{{ }}` holes, `<sc-if>`, `<sc-for>`, CSS in `<style>`, logic in the `data-dc-script` block. Port them into the codebase's patterns. They are the spec for style, copy, measurement and interaction, except where this plan's decisions overrule them. Leave out the `sh-*` site header, which the layout already renders.

## Decisions Alec made (2026-10-30)

1. **Live status.** `/products` ships now. Each card's badge, price and button come from Payload. An edition not on sale shows "Not on sale yet" and "Get notified".
2. **Digital products use Creem. Kits use Whop.** Runbook Task 10 no longer drops `creemProductId` or the Creem route.
3. **Switch Clone stays $12.** Alec removes "Free." from its CMS description.
4. **Red Flags is emailed as a link** to a PDF committed under `public/`.

## Decisions made in this plan (object at review)

- The course and service gates move to `planId()`. `BuyButton` is Whop-only, so a gate on `creemProductId` can only ever show "not on sale". No course row exists and no service has a Creem id, so nothing visible changes.
- **A digital product needs a deliverable to be on sale.** Switch Clone has a Creem id but no PDF, so a Creem-only gate would take $12 and deliver nothing. It stays "not on sale" until Alec attaches the PDF.
- Red Flags is a static lead magnet, not a `products` row, because a row would have to be published. The digital fields describe Switch Clone and future paid guides.
- The page says "The 15-Minute Key Rotation Playbook" from static content. The CMS name stays until Alec renames it in admin, so Creem receipts show the old name until then.
- `codex/warekit-delivery` (36 commits, September, Creem-era) rewrites `Products.ts` and `/products` differently. It is not merged, and this plan supersedes its page. Its unrelated work is left alone.
- OG images reuse the `products` key. No new artwork.

## Global Constraints

- Follow `AGENTS.md`. Import `motion` from `motion/react`. Use `useReducedMotion` from `@/components/AccessibilityProvider`. Prices use two decimals (`$499.00`).
- Never start a dev server. Never run `pnpm dev`. Never run `pnpm sim` without an explicit file path. Every Payload boot, including `pnpm build` and `next start`, sets `PAYLOAD_MIGRATING=true`.
- `src/payload-types.ts` is hand-edited; `payload generate:types` is broken.
- New columns are created by reviewed SQL with Alec's approval before anything reads them. **Every read of `products` names every declared column, so `pnpm build` fails until the SQL has run.**
- Publish no product. Create no Whop plan or Creem product.
- Leave `docs/design/**`, hook state, `package.json` and `pnpm-lock.yaml` uncommitted. Commit only when Alec asks.
- Unconfirmed facts get `TODO(alec)`. Invent no metrics.
- Public pages degrade gracefully: if the database read fails, render with every edition as planned and the guide not on sale.

## Review Focus

1. **Switch Clone has a Creem id but no file.** No Buy button appears and the server action refuses. Pinned in Task 2.
2. **Draft rows reach the client.** The kit query reads drafts, so only the reduced shape may cross to client components: no `githubRepo`, no plan ids, no `description`. Pinned in Task 4.
3. **The checklist email fails.** The visitor sees a real error, never "On its way". Pinned in Task 3.
4. **The Creem product id belongs to the other mode.** A 404 from Creem shows "not on sale", charges nothing and logs loudly. Pinned in Task 2.
5. **Copy that asserts availability while nothing is on sale.** "Lite is free", "Available now", "Free Lite editions" and "One-time purchase" appear only when true. Pinned in Tasks 4 and 5.

---

### Task 1: Schema, types and reviewed SQL

**Files:**
- Modify: `src/collections/Products.ts`, `src/payload-types.ts`
- Create: `sim/products-ddl.sim.test.mjs`, `docs/superpowers/plans/2026-10-30-products-split.sql`

**Interfaces:**
- Produces, on `Product`: `line?: 'warekit' | 'digital' | null`, `edition?: 'netsuite' | 'standard' | null`, `digitalFormat?: 'pdf-guide' | 'checklist' | null`, `pageCount?: number | null`, `audience?: ('founders' | 'developers')[] | null`.

- [ ] **Step 1: Add the fields to `Products.ts`.** `line` and `edition` are sidebar selects with admin descriptions, not required, added to `defaultColumns`. `digitalFormat`, `pageCount` (min 1) and `audience` (`hasMany: true`) use `admin.condition` to show only when `line === 'digital'`.
- [ ] **Step 2: Hand-edit `src/payload-types.ts`**, including the `ProductsSelect` type, then run `npx tsc --noEmit`. Expected: clean.
- [ ] **Step 3: Create the dry run** by copying `sim/projects-ddl.sim.test.mjs`. It asserts `hasDataLoss === false`, no `DROP`, and that every change touches `products`, `products_audience` or a `enum_products_*` type.
- [ ] **Step 4: Run it.** `PAYLOAD_MIGRATING=true DDL_OUT=<scratchpad>/products.sql pnpm sim sim/products-ddl.sim.test.mjs`. Expected: additive statements only. Any DROP means the database has drifted: stop and tell Alec.
- [ ] **Step 5: Write the `.sql` file** in the shape of `2026-10-29-projects-cms.sql`, in one transaction, adding this backfill after the DDL:

```sql
UPDATE products SET line = 'warekit', edition = 'netsuite'
 WHERE slug LIKE 'warekit-%-netsuite-%';
UPDATE products SET line = 'warekit' WHERE slug = 'warekit';
UPDATE products SET line = 'digital', digital_format = 'pdf-guide', page_count = 16
 WHERE slug = 'switch-clone-quick-key-rotation-guide';
```

Add the `products_audience` rows (founders, developers) for that product, using the table shape the dry run prints.

- [ ] **Step 6: STOP for Alec.** Show the SQL. It is a production write, so it runs only on his approval, by him in the Supabase SQL editor or by this session if he says so. Every later task except `pnpm build` can proceed while waiting. Until this branch reaches `main`, no `pnpm dev` from `main` or any older checkout.

### Task 2: Checkout routing and Creem purchase for digital products

**Files:**
- Create: `src/lib/commerce/checkoutRoute.ts`, `src/lib/commerce/digitalCheckout.ts`, `src/components/commerce/DigitalBuyButton.jsx`
- Modify: `src/app/(site)/products/[slug]/page.tsx:225-249`, `src/app/(site)/courses/[slug]/page.tsx:73`, `src/components/commerce/catalog-cards.jsx:146,268`, `docs/superpowers/plans/2026-09-22-whop-deploy-runbook.md`
- Test: `src/lib/commerce/__tests__/checkoutRoute.test.js`, `src/lib/commerce/__tests__/digitalCheckout.test.js`

**Interfaces:**
- Produces: `checkoutRoute(product, env?) → 'whop' | 'creem' | null`
- Produces: `startDigitalCheckout(prevState: { error: { message: string } | null }, formData: FormData)`, a server action reading `slug`
- Produces: `<DigitalBuyButton slug name price className>{label}</DigitalBuyButton>`

- [ ] **Step 1: Write the failing tests.**

```js
expect(checkoutRoute({ type: 'boilerplate', whopPlanId: 'plan_1' })).toBe('whop')
expect(checkoutRoute({ type: 'boilerplate', creemProductId: 'prod_1' })).toBe(null)
expect(checkoutRoute({ type: 'digital', creemProductId: 'prod_1', downloadUrl: 'https://x/y.pdf' })).toBe('creem')
expect(checkoutRoute({ type: 'digital', creemProductId: 'prod_1', downloadFile: 7 })).toBe('creem')
// Review Focus 1: a Creem id with nothing to deliver is not on sale.
expect(checkoutRoute({ type: 'digital', creemProductId: 'prod_1' })).toBe(null)
expect(checkoutRoute({ type: 'digital', whopPlanId: 'plan_1' })).toBe(null)
```

`digitalCheckout.test.js` mocks `getPayloadClient` and `createCheckoutSession`, and asserts:
- a draft, a non-digital product or a product with no deliverable returns the "not on sale" error and never calls Creem;
- a `CreemError` with status 404 returns that same error (Review Focus 4);
- any other Creem failure throws;
- a good product redirects to the checkout URL, with `successUrl` ending `/checkout/success?r=<requestId>` and metadata `{ itemType: 'product', itemId, slug }`.

- [ ] **Step 2: Run them.** `pnpm vitest run src/lib/commerce/__tests__/checkoutRoute.test.js src/lib/commerce/__tests__/digitalCheckout.test.js`. Expected: FAIL, modules missing.
- [ ] **Step 3: Implement `checkoutRoute`.** Digital needs `creemProductId` and (`downloadFile` or `downloadUrl`). Every other type needs `planId(product, env)`.
- [ ] **Step 4: Implement `startDigitalCheckout`.** Restore `git show dc58c4d^:src/lib/commerce/checkout.ts`, dropping the onboarding branch and the `itemType` input: this action sells digital products only, and it reuses `checkoutRoute`.
- [ ] **Step 5: Implement `DigitalBuyButton`** with `useActionState`, a pending label, the action's error message inline, and `whopTrack(WHOP_EVENT.beginCheckout, …)` on submit with the same fields `BuyButton` sends.
- [ ] **Step 6: Repoint the gates.** The product page branches on `checkoutRoute(product)`: `'whop'` renders `BuyButton`, `'creem'` renders `DigitalBuyButton`, `null` keeps the existing pending panel. The Free-kit branch stays first. The `ProductCard` pill uses `checkoutRoute(product)`. The course page and `ServiceAction` use `planId(...)`. Update the affected tests in `catalog-cards.test.jsx`.
- [ ] **Step 7: Update the runbook.** Items 2 and 3 of "Still to build": note the gates are done, and that Task 10 keeps `creemProductId`, `creem.ts`, `/webhooks/creem`, `/access/[token]` and `/checkout/success` because digital products sell through Creem.
- [ ] **Step 8: Run** `pnpm vitest run src/lib/commerce src/components/commerce`. Expected: PASS.

### Task 3: Email capture and contact routing

**Files:**
- Create: `src/lib/contact-intents.js`, `src/components/commerce/EmailCapture.jsx`, `public/downloads/amware-dev-shop-contract-red-flags.pdf` (from `~/Agents/Amware/Amware-Dev-Shop-Contract-Red-Flags.pdf`)
- Modify: `src/lib/resend.ts`, `src/collections/ContactSubmissions.ts`
- Test: `src/lib/__tests__/resend.test.js`, `src/components/commerce/__tests__/email-capture.test.jsx`

**Interfaces:**
- Produces: `RED_FLAGS_SUBJECT = 'Red Flags checklist'`, `kitWaitlistSubject(edition, pick) → 'WareKit waitlist · <edition> · <pick>'`, `isKitWaitlist(subject) → boolean`
- Produces: `<EmailCapture subject message cta note successMessage idPrefix onSuccess?>`, which posts to `/api/contact-submissions` with the same body shape, Turnstile handling and single-use token reset as `src/components/courses/course-waitlist.jsx`. The address stands in for `name`. Copy the design's inline error, "Enter an email address like name@company.com."

- [ ] **Step 1: Write the failing tests.** In `resend.test.js`, with Resend mocked:
  - a `kitWaitlistSubject(...)` submission notifies the owner and sends the visitor nothing, because the design promises "One email when your kit ships. Nothing else.";
  - a `RED_FLAGS_SUBJECT` submission sends the visitor a mail whose text contains `/downloads/amware-dev-shop-contract-red-flags.pdf`, and not "Thanks for reaching out";
  - any other subject behaves exactly as today.

  In `email-capture.test.jsx`: a 500 shows a real error and no success (Review Focus 3); success renders `successMessage`.

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement the routing in `sendContactEmails`.** Build the absolute PDF link from `NEXT_PUBLIC_SITE_URL`. In the `ContactSubmissions` hook, rethrow the error when `doc.subject === RED_FLAGS_SUBJECT`, so the request fails instead of promising a mail that never left. Other subjects keep swallowing and logging.
- [ ] **Step 4: Implement `EmailCapture`.** Do not refactor `course-waitlist.jsx`.
- [ ] **Step 5: Run the tests.** Expected: PASS.

### Task 4: WareKit NetSuite edition page

**Files:**
- Create: `src/content/site/warekit.js`, `src/lib/commerce/kitEditions.js`, `src/components/warekit/` (`netsuite-edition.jsx` plus section components), `src/styles/products.css`, `src/images/warekit/*.webp`
- Modify: `src/app/(site)/products/page.tsx`
- Test: `src/lib/commerce/__tests__/kitEditions.test.js`, `src/components/warekit/__tests__/netsuite-edition.test.jsx`

**Interfaces:**
- Consumes: `checkoutRoute`, `EmailCapture`, `kitWaitlistSubject`
- Produces: `editionStates(rows) → { [id]: { state: 'ready' | 'free' | 'planned', price: number | null, seats: number, slug: string } }`, where `id` is `react-lite` … `next-team`
- Produces: `recommendEdition(answers, states) → { kicker, name, why, cta, action }`

- [ ] **Step 1: Convert the covers.** The six `crown-edition/*.png` in the main checkout's `docs/design/2026-09-11-warekit-storefront/` become `src/images/warekit/<id>.webp` with `sharp`, at 1200px wide or less. Board blob map: `69564cdc` react-lite, `2d0d8156` react-pro, `610b040c` react-team, `97f55a1d` next-lite, `046965a2` next-pro, `3c2fbd0d` next-team.
- [ ] **Step 2: Write the failing tests.**

```js
const pro = { slug: 'warekit-next-netsuite-pro', stack: 'next-netsuite', tier: 'pro', type: 'boilerplate', price: 499, seats: 1, status: 'published', whopPlanId: 'plan_1' }
expect(editionStates([pro])['next-pro'].state).toBe('ready')
expect(editionStates([{ ...pro, status: 'draft' }])['next-pro'].state).toBe('planned')
expect(editionStates([{ ...pro, whopPlanId: null }])['next-pro'].state).toBe('planned')
expect(editionStates([{ ...pro, tier: 'lite', price: 0, whopPlanId: null }])['next-lite'].state).toBe('free')
expect(editionStates([{ ...pro, tier: 'lite', price: 0, status: 'draft' }])['next-lite'].state).toBe('planned')
expect(editionStates([])['react-team'].state).toBe('planned')
// Review Focus 2: only the reduced shape leaves the server.
expect(Object.keys(editionStates([{ ...pro, githubRepo: 'a/b' }])['next-pro']).sort()).toEqual(['price', 'seats', 'slug', 'state'])
```

  `recommendEdition` covers every path in the board's `rec` logic, with planned editions answering "Get notified" instead of "Buy" or "Get Lite". `netsuite-edition.test.jsx` renders with every edition planned and asserts the text "Free to claim", "Available", "Lite is free", "Free Lite editions to evaluate" and "One-time purchase" is absent (Review Focus 5), and that with Next Pro `ready` the checkout link and $499.00 appear.

- [ ] **Step 3: Run them.** Expected: FAIL.
- [ ] **Step 4: Move the board's constants** (`EDS`, the questions, compare rows, facts, setup steps) into `warekit.js`, verbatim, minus prices and statuses, which come from `editionStates`.
- [ ] **Step 5: Implement `kitEditions.js`.**
- [ ] **Step 6: Build the page.** `page.tsx` stays a server component with `revalidate = 60`. It reads `where: { line: { equals: 'warekit' }, edition: { equals: 'netsuite' } }` without a status filter, wrapped in try/catch so a failure passes `{}` and every edition is planned. Only `editionStates` output goes to the client.

  Port these sections from the board in order: hero (Dither with the board's exact props, cover fan and tilt), facts, 01 path picker with the three diagrams, 02 editions with the sliding switch and flip animation, Built-for-you panel, Help me choose, 03 compare table, 04 setup steps, Other editions card to `/products/standard`. Use a reveal hook from `src/components/projects/motion-hooks.js` if one fits, and match the reduced-motion states.

  Status rendering:
  - **Free:** "Free to claim" badge; "Get Lite" links to `/products/<slug>`.
  - **Ready:** "Available" badge, price from Payload; the Buy button links to `/products/<slug>`.
  - **Planned:** "Not on sale yet" badge, price "Planned"; the button scrolls to a "Get notified" `EmailCapture` under the grid, using subject `kitWaitlistSubject('NetSuite', label)`.

  With nothing on sale, hide the two hero chips and replace `edLead` for both families with "These editions are not on sale yet. Leave your email and you will hear when they are." The compare table's Price and Status rows use the same states. "Need it built instead" and "Book a strategy call" go to `/services`.

- [ ] **Step 7: Run** `pnpm vitest run src/lib/commerce src/components/warekit`. Expected: PASS.
- [ ] **Step 8: Remove what the old page leaves unused.** Delete `StoreHero`, `StoreEmpty` and `ProductCard` only if nothing else imports them; `services/page.tsx` and the tests still reference some of them, so check first.

### Task 5: Standard edition waitlist

**Files:**
- Create: `src/app/(site)/products/standard/page.jsx`, `src/components/warekit/standard-edition.jsx`
- Modify: `src/content/site/warekit.js`, `src/styles/products.css`
- Test: `src/components/warekit/__tests__/standard-edition.test.jsx`

**Interfaces:**
- Consumes: `EmailCapture`, `kitWaitlistSubject`, `editionStates`
- The page passes `anyOnSale: boolean`, using the same read and try/catch as Task 4.

- [ ] **Step 1: Write the failing tests.** Picking Drizzle updates the file tree, the join heading ("Get the Drizzle kit first.") and the subject to `WareKit waitlist · Standard · Drizzle`. With `anyOnSale` false, the text "Available now" and "Lite is free" is absent (Review Focus 5).
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Port the board.** Move `STACKS` and `COMMON` into `warekit.js`. Sections: hero with picker and animated tree, 01 How it works, 02 Join, NetSuite card to `/products`. With nothing on sale, the hero ghost reads "On NetSuite? See that edition →", the card's kicker reads "NetSuite edition", and the copy drops "Lite is free."
- [ ] **Step 4: Run the tests.** Expected: PASS.

### Task 6: Digital products page and wiring

**Files:**
- Create: `src/app/(site)/digital-products/page.jsx`, `src/content/site/digital-products.js`, `src/lib/digital-products/contract-score.js`, `src/components/digital-products/` (`digital-products.jsx` plus section components)
- Modify: `src/styles/products.css`, `src/lib/site-nav.js` (`DIGITAL_PRODUCTS_LIVE = true`), `src/app/sitemap.js` (add `/digital-products`, `/products/standard`), `src/lib/ai/catalog.js` if its product list needs the new routes, `src/components/founders/__tests__/site-header.test.jsx` if it asserts the old default
- Test: `src/lib/digital-products/__tests__/contract-score.test.js`, `src/components/digital-products/__tests__/digital-products.test.jsx`

**Interfaces:**
- Consumes: `checkoutRoute`, `DigitalBuyButton`, `EmailCapture`, `RED_FLAGS_SUBJECT`
- Produces: `contractVerdict(flags: ('pass' | 'fail' | null)[]) → { title, copy, tone, fails, checked }`

- [ ] **Step 1: Write the failing tests.** `contractVerdict` returns each branch of the board's `verdict` logic, with its exact copy:
  - nothing marked → "Start with clause 1";
  - 2 or more fails → "Renegotiate before you sign";
  - 1 fail, part way and at 7 of 7;
  - 0 fails, part way ("N left to check.") and at 7 of 7.

  The component test covers:
  - with the guide's route `null`, no Buy button and a "not on sale yet" line (Review Focus 1);
  - with route `creem`, `DigitalBuyButton` renders;
  - a failed database read still renders the page;
  - pressing a marked Pass again clears it;
  - the founders filter dims the guide cards as the board does.

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Put `CLAUSES`, `LIB`, `SC` and the included-items list** into `digital-products.js`, verbatim.
- [ ] **Step 4: Build the page.** `page.jsx` reads `where: { line: { equals: 'digital' }, status: { equals: 'published' } }` in a try/catch and passes `{ price, pageCount, route, slug }` for Switch Clone. The card and Buy block show the Payload price, falling back to no price when the read fails.

  Port from the board: hero with document fan, 01 library with filter, 02 Switch Clone with stepper and SVG diagram (2.8s auto-cycle that stops on a manual pick and never runs under reduced motion), buy block, 03 Red Flags scorer with `EmailCapture` (subject `RED_FLAGS_SUBJECT`), then the three links to `/courses`, `/products` and `/services`. Clause marks stay in React state only.
- [ ] **Step 5: Flip the nav flag and add the sitemap entries.** `secure-the-stack.jsx` picks up its cross-link from the flag with no further edit. Confirm its link now renders.
- [ ] **Step 6: Run** `pnpm vitest run src/lib/digital-products src/components/digital-products src/components/founders src/components/courses`. Expected: PASS.

### Task 7: Verification and hand-over

- [ ] **Step 1:** `npx eslint` on the changed files, `npx prettier --write` on them, `npx tsc --noEmit`, `pnpm test`. Expected: all clean. `package.json` and `pnpm-lock.yaml` stay out of the change.
- [ ] **Step 2 (needs the Task 1 SQL):** `PAYLOAD_MIGRATING=true pnpm build`. Expected: success.
- [ ] **Step 3:** Serve with the `.claude/launch.json` `next-start` config (`PAYLOAD_MIGRATING=true`, port 3100). Check `/products`, `/products/standard`, `/digital-products` and `/products/switch-clone-quick-key-rotation-guide` in the built-in browser at 375px and 1440px, keyboard through each quiz and control, and check with reduced motion on. Submit no form: a submission would write to production and send real mail.
- [ ] **Step 4:** Run the code-quality-reviewer agent and fix what it confirms.
- [ ] **Step 5:** Report what is left for Alec, below. Commit only if he asks.

## Left for Alec before anything sells

- **Switch Clone:** remove "Free." from the description, rename it in admin if wanted, and attach the PDF (`downloadFile`). The Buy button appears once that is done.
- **Creem production:** confirm `prod_5nPMKGh5vv6Yw5Ehesbwb9` exists in the mode of the production `CREEM_API_KEY`, that `CREEM_WEBHOOK_SECRET` and `ACCESS_LINK_SECRET` are set in Vercel, and that Creem's webhook points at `/webhooks/creem`. None of this could be checked from here. Make one real purchase to prove delivery.
- **Red Flags:** after deploy, submit the form once to see the real email arrive. It is unverified until then.
- **Kits:** publish them and add Whop plans when ready. The cards update on their own.
