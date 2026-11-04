# WareKit Licensing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sell paid WareKit kits on Creem with one license per customer and kit, which moves up from Lite to Pro, Team and Enterprise and counts developers and NetSuite accounts.

**Architecture:** A new Payload `licenses` collection holds tier, seats and accounts. Tier is always derived from the license's paid purchases. The Creem webhook attaches each kit purchase to a license, and `/access/seats/<token>` becomes the customer's license page. Kits report the NetSuite account after `ns:deploy` through a route on amware.dev that holds the Creem key.

**Tech Stack:** Next 16 App Router, React 19, Payload 3 on Supabase Postgres, Creem, vitest, Tailwind 4. The CLI is TypeScript with commander.

**Spec:** `docs/superpowers/specs/2026-10-31-warekit-licensing-design.md`. Read it first. Its "The buyer journey" section holds the exact copy.

## Global Constraints

- Base: a new branch from `main` once PR 19 is merged. If PR 19 is still open, branch from `claude/hungry-hawking-762203`.
- The database is shared between dev and production. Never run `pnpm dev`, or `pnpm sim` without a file path. Any Payload boot needs `PAYLOAD_MIGRATING=true`.
- New tables and columns are created by reviewed SQL with Alec's approval before merge. `payload generate:types` is broken, so hand-edit `src/payload-types.ts`.
- Never start a dev server. Never publish a product, make a live purchase, or send real mail without Alec. Never publish to npm without Alec.
- New files are `.js` or `.jsx`, except Payload collections, which stay `.ts`. `motion` comes from `motion/react`. Prices use `.toFixed(2)`.
- Public pages degrade gracefully and never throw at a buyer. Prefer atomic writes. Guard empty arrays before `.in('id', [])`.
- Imports in `src/lib/commerce` are relative wherever the engine test project has to load the module.
- Customer-facing copy says "license", and "developers", not "GitHub accounts". Copy that a page touches changes from "licence" to "license".
- Tiers: Lite free, 1 developer, accounts not tracked. Pro $499, 1 developer, 1 account. Team $999, 5 developers, 3 accounts. Enterprise quoted, set per deal.
- Nothing in a kit may fail, slow down or change behaviour because amware.dev or Creem is unreachable, or because a license is over a limit. `CREEM_API_KEY` never leaves the server.
- After each task: `npx eslint <changed files>`, `npx prettier --write <changed files>`, `npx tsc --noEmit`, then `pnpm vitest run <the task's tests>`.
- Commits use gitmoji messages, stage only task files, leave `docs/design/**`, hook state, `package.json` and `pnpm-lock.yaml` out, and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- A buyer returns from an upgrade before the webhook lands: they must see "You don't need to pay again" and no second upgrade button. Pinned in Task 9.
- A stale upgrade page is opened after the license is already on Team: no checkout may start, so nobody pays twice. Pinned in Task 9.
- Creem redelivers an upgrade or refund webhook: nothing doubles, and the tier stays right. Pinned in Tasks 5 and 11.
- A buyer pays but abandons onboarding: the license exists with no developers, and its page must offer "Add your first developer". Pinned in Task 7.
- `/licenses/report` receives an empty body, oversized input or a key for another kit: a clean JSON answer, never a 500, and a deploy survives a hung request. Pinned in Tasks 16 and 18.

## File map

| File | Responsibility |
| --- | --- |
| `src/collections/Licenses.ts` | The license collection |
| `src/lib/commerce/creemEnv.js` | Live or sandbox Creem product ids, client-safe |
| `src/lib/commerce/license.js` | Pure rules: tiers, joining, limits, account IDs, next action |
| `src/lib/commerce/licenseRecord.js` | Database reads and writes for licenses |
| `src/lib/commerce/licenseUpgrade.js` | Server action starting an upgrade checkout |
| `src/lib/commerce/licenseRevoke.js` | Repo removal after a refund |
| `src/lib/commerce/licenseReport.js` | Account reporting and status logic |
| `src/lib/commerce/creemCheckout.ts` | Renamed from `digitalCheckout.ts`, sells kits and digital products |
| `src/components/commerce/CreemBuyButton.jsx` | Renamed from `DigitalBuyButton.jsx` |
| `src/components/commerce/LicensePanel.jsx` | Usage, action, key line and accounts on the license page |
| `src/app/(commerce)/licenses/report/route.js`, `.../status/route.js` | Public JSON routes for kits and the CLI |

---

## Part 1: Prove Creem

### Task 1: Run the four Creem checks in test mode

Nothing else starts until this is done. Alec makes the test products and completes the checkouts, since the dashboard and card entry are his.

**Files:**
- Create: `docs/superpowers/plans/2026-10-31-creem-proof.md`

- [ ] **Step 1: Ask Alec for a test setup**

In Creem test mode: one one-time product with a license key delivery and no activation limit or expiry, one one-time upgrade product with no key, and a webhook pointed at a throwaway request inspector of his choice.

- [ ] **Step 2: Run the checks**

Create checkouts through the Creem test API with `metadata: { itemType: 'product', itemId: '1', licenseId: '1', upgrade: 'team' }` and a `success_url` containing `?r=abc&s=def`, and have Alec complete them. Then record for each:

1. Is a key issued with `expires_at` null, and present in `checkout.completed`?
2. Do three activations with different `instance_name` values succeed? Does Creem's purchase email conflict with ours?
3. Refund one order. Paste the `refund.created` payload, and note the field matching `creemOrderId`, how a partial refund differs, and whether the key's status changes.
4. Does the upgrade checkout's webhook return our metadata? Does `success_url` return with `r` and `s` intact?

- [ ] **Step 3: Write the findings**

Save the real field names and payloads, with keys redacted, to `2026-10-31-creem-proof.md`. Tasks 5 and 11 read this file.

**Stop rule:** if check 1 fails, stop and tell Alec. The spec's fallback replaces Creem's key with our own, which changes Tasks 5, 7 and 16.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-10-31-creem-proof.md
git commit -m "📝 Record the Creem license checks"
```

---

## Part 2: Website

### Task 2: Add the schema and its reviewed SQL

**Files:**
- Create: `src/collections/Licenses.ts`, `sim/licensing-ddl.sim.test.mjs`, `docs/superpowers/plans/2026-10-31-licensing.sql`
- Modify: `src/collections/Purchases.ts`, `src/collections/Products.ts`, `src/payload.config.*`, `src/payload-types.ts`

**Interfaces:**
- Produces, on `licenses`: `ownerEmail`, `stack`, `tier` (`lite | pro | team | enterprise`, nullable, read-only in admin), `seatOverride`, `accountOverride`, `seatMembers[]` (`githubUsername`, `inviteUrl`, `addedAt`), `accounts[]` (`accountId`, `status: active | over_limit`, `creemInstanceId`, `firstSeenAt`, `lastSeenAt`, `notifiedAt`), `quoteCreemProductId`, `needsReview`, `tierChangedAt`, `lastLinkSentAt`, `creemEnvironment`.
- Produces, on `purchases`: `license` (relationship), `grantsTier`, `creemEnvironment`, and an index on `licenseKey`.
- Produces, on `products`: `netsuiteAccounts`, `creemUpgradeProductId`, `creemSandboxProductId`, `creemUpgradeSandboxProductId`.

- [ ] **Step 1: Write the collection and fields**

Copy the admin-only `access` block from `Purchases.ts`. Default list columns: `ownerEmail`, `stack`, `tier`, `needsReview`, `tierChangedAt`. `purchases.seatMembers` stays, because dropping a column is not part of this work, but its description says new seats live on the license.

- [ ] **Step 2: Hand-edit `src/payload-types.ts`**

- [ ] **Step 3: Create the dry run**

Copy `sim/products-ddl.sim.test.mjs`. Assert `hasDataLoss === false`, no `DROP`, and that every change touches `licenses`, `licenses_seat_members`, `licenses_accounts`, `purchases`, `products`, `payload_locked_documents_rels` or an `enum_licenses_*` or `enum_purchases_*` type.

Run: `PAYLOAD_MIGRATING=true DDL_OUT="$TMPDIR/licensing.sql" pnpm sim sim/licensing-ddl.sim.test.mjs`
Expected: PASS, printing additions only.

- [ ] **Step 4: Write the SQL file**

Follow the header and transaction style of `2026-10-30-products-split.sql`. Leave out numeric-default no-ops and any `DISABLE ROW LEVEL SECURITY`. Add for each new table: `ENABLE ROW LEVEL SECURITY` and `REVOKE ALL` from `anon, authenticated`, as in `2026-10-30-close-public-tables.sql`.

Add the backfill:
- `UPDATE products SET netsuite_accounts = 1 WHERE tier = 'pro'`, and `3` for `team`.
- One license per kit purchase, using the purchase's email, its product's `stack` and `tier`. Set `purchases.license_id` and `grants_tier`. Copy `seatMembers` for paid tiers only.
- Skip the `warekit` product, which has no stack or tier.

- [ ] **Step 5: Stop for Alec**

Show him the SQL. He approves before it runs on production. Do not continue to merge without it. Later tasks can proceed on the branch.

- [ ] **Step 6: Commit**

```bash
git add src/collections src/payload.config.* src/payload-types.ts sim/licensing-ddl.sim.test.mjs docs/superpowers/plans/2026-10-31-licensing.sql
git commit -m "🗃️ Add the license record"
```

### Task 3: Sell kits through Creem

**Files:**
- Create: `src/lib/commerce/creemEnv.js`, `src/lib/commerce/__tests__/creemEnv.test.js`
- Rename: `src/lib/commerce/digitalCheckout.ts` to `creemCheckout.ts`, `src/components/commerce/DigitalBuyButton.jsx` to `CreemBuyButton.jsx`, and their tests
- Modify: `src/lib/commerce/checkoutRoute.ts`, `src/lib/commerce/kitEditions.js`, `src/lib/commerce/pricingTable.ts`, `src/app/(site)/products/[slug]/page.tsx`, `src/app/(site)/digital-products/page.jsx`, `src/components/admin/PurchaseLedger.tsx`, `.env.example`
- Test: `checkoutRoute.test.js`, `kitEditions.test.js`, `pricingTable.test.js`, `catalog-cards.test.jsx`, `creemCheckout.test.js`

**Interfaces:**
- Produces: `creemEnvironment(): 'production' | 'sandbox'`, reading `NEXT_PUBLIC_CREEM_ENV || CREEM_ENV`, unset means production.
- Produces: `creemProductIdFor(item, env?): string | null`, `creemUpgradeProductIdFor(item, env?): string | null`.
- Produces: `startCreemCheckout(prev, formData)`, the renamed action.

- [ ] **Step 1: Write the failing tests**

```js
// creemEnv.test.js
it('uses the sandbox id only in sandbox', () => {
  const item = { creemProductId: 'live', creemSandboxProductId: 'test' }
  expect(creemProductIdFor(item, 'production')).toBe('live')
  expect(creemProductIdFor(item, 'sandbox')).toBe('test')
})
it('treats an unset environment as production', () => {
  expect(creemEnvironment()).toBe('production')
})

// checkoutRoute.test.js
it('sends a kit with a Creem id to Creem and ignores a Whop plan', () => {
  expect(checkoutRoute({ type: 'boilerplate', creemProductId: 'p', whopPlanId: 'w' })).toBe('creem')
})
it('leaves a kit with only a Whop plan off sale', () => {
  expect(checkoutRoute({ type: 'boilerplate', whopPlanId: 'w' })).toBeNull()
})
it('keeps a published kit with only a sandbox id off sale in production', () => {
  expect(checkoutRoute({ type: 'boilerplate', creemSandboxProductId: 't' }, 'production')).toBeNull()
})

// creemCheckout.test.js
it('sends a kit buyer back to the signed onboarding link', async () => {
  // boilerplate item: createCheckoutSession receives a successUrl containing /checkout/onboarding?r=
})
it('keeps a digital buyer on /checkout/success', async () => {})
it('refuses before calling Creem when the onboarding link cannot be signed', async () => {})
```

Flip `catalog-cards.test.jsx`'s "A kit with only a Creem id is not on sale": it now says `View spec`, and a kit with only `whopPlanId` says `Details`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/commerce/__tests__/creemEnv.test.js src/lib/commerce/__tests__/checkoutRoute.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement**

`creemEnv.js` mirrors `whopEnv.ts`. `checkoutRoute` takes `env` as a Creem environment: `digital` and `boilerplate` read `creemProductIdFor`, anything else keeps `planId`. Update its header comment. `saleState` in `kitEditions.js` checks for `'creem'`. The checkout action uses `creemProductIdFor` and sets `successUrl` to `${site}${onboardingPath(requestId)}` for a kit. `PurchaseLedger` excludes `creemEnvironment: sandbox` exactly as it excludes Whop's sandbox rows.

Add `CREEM_ENV` and `NEXT_PUBLIC_CREEM_ENV` to `.env.example`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/commerce src/components/commerce`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "✨ Sell kits through Creem"
```

### Task 4: Write the license rules

**Files:**
- Create: `src/lib/commerce/license.js`, `src/lib/commerce/__tests__/license.test.js`

**Interfaces:**
- Produces: `tierRank(tier): number`, `highestTier(tiers: string[]): string | null`.
- Produces: `joinDecision({ licenseId, candidates, tier }): { join: id } | { create: true }`, where `candidates` is `[{ id, tier }]`.
- Produces: `licenseLimits(license, product): { seats: number, accounts: number | null }`.
- Produces: `normalizeAccountId(raw): string | null`.
- Produces: `nextAction({ license, hasQuote, seatsUsed, seatLimit, accountsUsed, accountLimit }): { kind: 'upgrade-team' | 'enterprise-quote' | 'enterprise-contact' | null, urgent: boolean }`.

- [ ] **Step 1: Write the failing tests**

```js
it('takes the highest tier and ignores nulls', () => {
  expect(highestTier(['lite', 'pro', null])).toBe('pro')
  expect(highestTier([])).toBeNull()
})
it('joins the license named in metadata', () => {
  expect(joinDecision({ licenseId: 7, candidates: [], tier: 'team' })).toEqual({ join: 7 })
})
it('joins by email only when the tier goes up', () => {
  expect(joinDecision({ candidates: [{ id: 1, tier: 'lite' }], tier: 'pro' })).toEqual({ join: 1 })
})
it('starts a new license for a second purchase at the same tier', () => {
  expect(joinDecision({ candidates: [{ id: 1, tier: 'pro' }], tier: 'pro' })).toEqual({ create: true })
})
it('reads limits from the product and defaults accounts to 1', () => {
  expect(licenseLimits({ tier: 'team' }, { seats: 5, netsuiteAccounts: 3 })).toEqual({ seats: 5, accounts: 3 })
  expect(licenseLimits({ tier: 'pro' }, { seats: 1 })).toEqual({ seats: 1, accounts: 1 })
})
it('prefers Enterprise overrides', () => {
  expect(licenseLimits({ tier: 'enterprise', seatOverride: 20, accountOverride: 12 }, null)).toEqual({ seats: 20, accounts: 12 })
})
it('does not track accounts on Lite', () => {
  expect(licenseLimits({ tier: 'lite' }, { seats: 1 }).accounts).toBeNull()
})
it.each([
  ['1234567', '1234567'],
  ['1234567_SB1', '1234567'],
  ['1234567-sb2', '1234567'],
  ['1234567_RP', '1234567'],
  [' tstdrv123 ', 'TSTDRV123'],
])('normalises %s', (raw, want) => expect(normalizeAccountId(raw)).toBe(want))
it.each(['', '   ', null, 'x'.repeat(65)])('rejects %s', (raw) => {
  expect(normalizeAccountId(raw)).toBeNull()
})
it('offers Team to a Pro license and marks it urgent at a limit', () => {
  const base = { license: { tier: 'pro' }, seatsUsed: 1, seatLimit: 1, accountsUsed: 0, accountLimit: 1 }
  expect(nextAction(base)).toEqual({ kind: 'upgrade-team', urgent: true })
  expect(nextAction({ ...base, seatsUsed: 0 })).toEqual({ kind: 'upgrade-team', urgent: false })
})
it('puts a quote ahead of everything else', () => {
  expect(nextAction({ license: { tier: 'pro' }, hasQuote: true, seatsUsed: 0, seatLimit: 1, accountsUsed: 0, accountLimit: 1 }).kind).toBe('enterprise-quote')
})
it('offers Enterprise contact only to a Team license at a limit', () => {
  const team = { license: { tier: 'team' }, seatsUsed: 5, seatLimit: 5, accountsUsed: 1, accountLimit: 3 }
  expect(nextAction(team).kind).toBe('enterprise-contact')
  expect(nextAction({ ...team, seatsUsed: 2 }).kind).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/commerce/__tests__/license.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement in `license.js`**

Pure functions with no imports. `normalizeAccountId` strips a `[_-](sb\d+|rp)` suffix case-insensitively, uppercases what remains, and rejects anything over 64 characters.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/commerce/__tests__/license.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/commerce/license.js src/lib/commerce/__tests__/license.test.js
git commit -m "✨ Add the license rules"
```

### Task 5: Attach purchases to licenses

**Files:**
- Create: `src/lib/commerce/licenseRecord.js`, `src/lib/commerce/__tests__/licenseRecord.test.js`
- Modify: `src/app/(commerce)/webhooks/creem/route.ts`, `src/lib/commerce/claim.ts`, `src/lib/commerce/accessToken.ts`, `src/lib/commerce/fulfillment.ts`
- Test: `src/app/(commerce)/webhooks/creem/__tests__/route.test.jsx`, `accessToken.test.js`, `fulfillment.test.js`

**Interfaces:**
- Consumes: `joinDecision`, `highestTier`, from Task 4. Field names from Task 2.
- Produces: `attachPurchase(payload, { purchase, email, stack, grantsTier, licenseId?, environment }): Promise<License>`.
- Produces: `recomputeTier(payload, licenseId): Promise<{ tier: string | null, changed: boolean }>`.
- Produces: `licenseFromClaims(payload, claims): Promise<{ license, purchase, product } | null>`, which resolves a license from `claims.licenseId` or through `claims.purchaseId`.
- Produces: `currentKey(payload, licenseId): Promise<string | null>`, the newest paid purchase's `licenseKey`.
- Produces: `expectedProductIds({ item, license, upgrade, env }): string[]`.
- Changes: `AccessTokenPayload` gains optional `licenseId`, and `purchaseId` may be null. This is the spec's one token change, needed because a new Enterprise license has no purchase yet.

- [ ] **Step 1: Write the failing tests**

In `licenseRecord.test.js`, with a fake `payload`:

```js
it('creates a license for a first purchase', async () => {})      // create called; purchase updated with license and grantsTier
it('joins a Lite license by lowercased email and raises the tier', async () => {})
it('flags a full-price Team sale joining a Pro license', async () => {
  // result data contains needsReview: true
})
it('does not flag an upgrade that named its license', async () => {})
it('derives tier from paid purchases only', async () => {
  // rows: pro paid, team refunded -> { tier: 'pro', changed: true }
})
it('sets tierChangedAt only when the tier changes', async () => {})
it('returns tier null when no paid purchase remains', async () => {})
it('finds the key on the newest paid purchase', async () => {})
```

In the webhook `route.test.jsx`:

```js
it('attaches a kit sale to a license and emails the license page', async () => {})
it('still records a sale whose license cannot be attached', async () => {
  // attachPurchase rejects -> 200, purchase kept, error logged
})
it('accepts the upgrade product when metadata says upgrade', async () => {
  // object.product.id = 'prod_upgrade', metadata.upgrade = 'team', item.creemUpgradeProductId = 'prod_upgrade'
  // fulfillmentStatus stays not failed, grantsTier 'team', no repo invite
})
it('flags a mismatched product even on an upgrade', async () => {})
it('accepts an Enterprise quote product and grants enterprise', async () => {})
it('does nothing on a redelivered upgrade', async () => {
  // existing creemOrderId -> 'ok (duplicate)', attachPurchase not called
})
it('stores the Creem environment on the purchase', async () => {})
```

In `accessToken.test.js`: a token with `licenseId` and null `purchaseId` verifies and keeps both claims.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/commerce/__tests__/licenseRecord.test.js "src/app/(commerce)/webhooks/creem"`
Expected: FAIL.

- [ ] **Step 3: Implement `licenseRecord.js`**

`attachPurchase` queries licenses by lowercased `ownerEmail`, `stack` and `creemEnvironment`, calls `joinDecision`, writes the purchase, then calls `recomputeTier`. The overpayment flag applies when there is no `licenseId`, the joined license is `pro`, and `grantsTier` is `team`.

- [ ] **Step 4: Wire the webhook**

- `isBoilerplate` branch: read `meta.licenseId` and `meta.upgrade`. `grantsTier` is `meta.upgrade` or `item.tier`. If there's no tier or stack, as on the legacy `warekit` row, skip the license and log it.
- Replace the single-id `productMismatch` test with `expectedProductIds`.
- An upgrade skips the invite and fulfilment as `not_required`, and returns after attaching.
- `attachPurchase` runs inside a catch, so GitHub or license failures never lose a sale, in the style of the existing comments.
- Mint the access token for every paid kit, not only `seats > 1`, and write seats to the license.
- Set `creemEnvironment` from `creemEnvironment()`.

- [ ] **Step 5: Wire the free claim**

`claim.ts` calls `attachPurchase` with `grantsTier: 'lite'` after creating the row. A failure there must not fail the claim. The username is not added to `seatMembers`.

- [ ] **Step 6: Update the email**

In `sendBoilerplateConfirmationEmail`, the `seatsUrl` block applies to every paid kit: "Your license page, for your key, your team and upgrades:", and it no longer depends on `seats > 1`. Update `fulfillment.test.js`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/commerce "src/app/(commerce)/webhooks/creem"`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git commit -m "✨ Attach kit purchases to a license"
```

### Task 6: Finish onboarding for Creem buyers

**Files:**
- Create: `src/components/commerce/OnboardingGithubForm.jsx`, `src/components/commerce/__tests__/onboarding-github-form.test.jsx`
- Modify: `src/app/(site)/checkout/onboarding/page.tsx`, `src/lib/commerce/onboarding.ts`, `src/components/commerce/OnboardingSteps.jsx`
- Test: `src/components/commerce/__tests__/onboarding.test.jsx`

**Interfaces:**
- Consumes: `completeOnboarding(prev, formData)`, which has no caller today. It needs `r`, `s` and `githubUsername`, and looks up `creemRequestId`.
- Produces: `/checkout/onboarding?r=&s=` as a working path.

- [ ] **Step 1: Write the failing tests**

```js
it('asks a signed Creem buyer for a GitHub account', async () => {})
it('shows "Confirming your payment" for a signed link with no row yet', async () => {})
it('rejects an unsigned r', async () => {})               // ManualState
it('pre-fills the username from a Lite claim on the same license', async () => {})
it('reports the purchase with its real amount once', async () => {}) // TrackPurchase rendered
it('offers the license page after delivery', async () => {})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/commerce/__tests__/onboarding.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

The page parses `r` and `s`, verifies them with `verifyOnboardingLink`, and looks up `creemRequestId`. Whop's `ref` and `payment_id` paths stay. `PendingRefresh` gets `r` and `s` through `keepParams`. An unanswered kit renders `OnboardingGithubForm`, built on `GithubAccountField` and `useActionState(completeOnboarding, …)`. The Lite username comes from the license's newest `grantsTier: 'lite'` purchase.

`completeOnboarding` writes the seat to the license instead of `purchases.seatMembers`. Delete the runbook's instruction to remove it in Task 14.

`OnboardingSteps` gains a final step linking to the license page: "Add your key to `.env`." The page passes that URL, minted with `tryCreateAccessToken`. Render `TrackPurchase` for a confirmed kit, as `/checkout/success` does.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/commerce`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "🐛 Finish onboarding for Creem kit buyers"
```

### Task 7: Build the license page

**Files:**
- Create: `src/components/commerce/LicensePanel.jsx`, `src/components/commerce/__tests__/license-panel.test.jsx`
- Modify: `src/app/(site)/access/seats/[token]/page.jsx`, `src/lib/commerce/addSeat.ts`, `src/lib/commerce/seats.ts`, `src/components/commerce/SeatManager.jsx`
- Test: `seats.test.js`, `seat-manager.test.jsx`

**Interfaces:**
- Consumes: `licenseFromClaims`, `currentKey`, `licenseLimits`, `nextAction`. `maskLicenseKey` from `onboardingDisplay`.
- Produces: `<LicensePanel token license product limits keyValue action />`. Tasks 8, 9 and 12 add to it.
- Changes: `canAddSeat(members, username, limit: number)` now takes the limit, because it comes from `licenseLimits`.

- [ ] **Step 1: Write the failing tests**

```js
it('leads with kit and tier, then usage, then one action', () => {})     // DOM order
it('shows 1 / 1 developers and 1 / 1 NetSuite accounts', () => {})
it('says "Add your first developer" with no seats', () => {})
it('says accounts show up after the first ns:deploy', () => {
  // text: Shows up after your first `pnpm ns:deploy`.
})
it('masks the key until Reveal, and Copy copies the env line', () => {})
it('tells an older license with no key to get in touch', () => {})
it('says the license was refunded when tier is null', () => {})
it('marks an over-limit account', () => {})
```

In `seats.test.js`: `canAddSeat` takes a limit number. `seatsFullMessage(5, 5)` returns exactly `This license covers 5 developers and all 5 are in use. Remove someone below, or see your options above.` In `addSeat` coverage, seats are appended to the license.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/commerce/__tests__/license-panel.test.jsx src/lib/commerce/__tests__/seats.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement**

Follow the spec's "What each screen shows" table and `DESIGN.md`: `amw-kicker`, `.amw-mono` tabular usage, one column at 375px, 44px targets, real labelled buttons, `role="status"` for results. The single-seat early return goes away, because every tier now uses the same page. The page keeps `noindex`, and renames its metadata title to "Your license".

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/commerce src/lib/commerce`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "✨ Turn the seat page into the license page"
```

### Task 8: Let owners remove developers and accounts

**Files:**
- Modify: `src/lib/commerce/addSeat.ts`, `src/lib/commerce/creem.ts`, `src/components/commerce/SeatManager.jsx`, `src/components/commerce/LicensePanel.jsx`
- Test: `src/lib/commerce/__tests__/creem.test.js`, `seat-manager.test.jsx`

**Interfaces:**
- Consumes: `removeFromRepo({ repo, username })`.
- Produces: `removeSeat(prev, formData): AddSeatState`, in `addSeat.ts`.
- Produces: `removeAccount(prev, formData)`, also in `addSeat.ts`, using the signed token. `addSeat.ts` is `'use server'`. `licenseRecord.js` must stay out of that directive, or every helper in it becomes a public action.
- Produces: `activateLicense({ key, instanceName }): Promise<{ instanceId: string }>`, `deactivateLicense({ key, instanceId }): Promise<void>`, in `creem.ts`, throwing `CreemError`.

- [ ] **Step 1: Write the failing tests**

```js
it('frees the seat after GitHub removes the person', async () => {})
it('keeps the seat and says so when GitHub refuses', async () => {})
it('refuses a removal with a bad token', async () => {})
it('removes an account and deactivates it in Creem', async () => {})
it('still removes the account when Creem fails', async () => {})
it('activateLicense posts key and instance_name with x-api-key', async () => {})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/commerce/__tests__/creem.test.js src/components/commerce/__tests__/seat-manager.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Remove buttons have accessible names, such as "Remove @name". Removing the last developer is allowed: an owner may be swapping themselves out. Seat counts come from the server result, as `SeatManager` does today.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/commerce src/components/commerce`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "✨ Let license owners remove developers and accounts"
```

### Task 9: Add upgrades

**Files:**
- Create: `src/lib/commerce/licenseUpgrade.js`, `src/lib/commerce/__tests__/licenseUpgrade.test.js`
- Modify: `src/components/commerce/LicensePanel.jsx`, `src/app/(site)/access/seats/[token]/page.jsx`
- Test: `src/components/commerce/__tests__/license-panel.test.jsx`

**Interfaces:**
- Consumes: `creemUpgradeProductIdFor`, `licenseFromClaims`, `tierRank`, `nextAction`, `createCheckoutSession`.
- Produces: `startUpgrade(prev, formData): Promise<{ error: { message: string } | null }>`, taking `token` and `target` (`team | enterprise`).
- Metadata sent: `{ itemType: 'product', itemId, slug, licenseId, upgrade: target }`. `successUrl`: `${site}/access/seats/${token}?upgraded=${target}`.

- [ ] **Step 1: Write the failing tests**

```js
it('starts a Pro to Team checkout at the upgrade product', async () => {})
it('uses the Team row of the same stack as the item', async () => {})
it('refuses when the license is already on the target tier', async () => {
  // no createCheckoutSession call; message: You're already on Team.
})
it('refuses a bad token', async () => {})
it('uses the quote product for enterprise', async () => {})
it('returns "Nothing was charged" when Creem fails', async () => {})

it('shows Move to Team with the live price difference', () => {
  // Team $999, Pro $499 -> Move to Team · $500.00
})
it('makes the button teal only when urgent', () => {})
it('says the code, repo and key stay the same', () => {})
it('shows no upgrade button while confirming', () => {
  // upgraded=team, license still pro -> text "Confirming your upgrade. You don't need to pay again." and no button
})
it('confirms the upgrade once the tier changes', () => {
  // upgraded=team, license team -> "You're on Team." and focus on the add-developer field
})
it('gives a refresh link when the checks run out', () => {})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/commerce/__tests__/licenseUpgrade.test.js src/components/commerce/__tests__/license-panel.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

The price difference is `team.price - pro.price`, formatted with `.toFixed(2)`. The button is a form with a pending label of "Opening checkout". The page reads `upgraded` and `attempt`, and uses `PendingRefresh` with `keepParams`. It compares with `tierRank`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/commerce src/components/commerce`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "✨ Let Pro customers pay the difference for Team"
```

### Task 10: Keep old links useful

**Files:**
- Modify: `src/lib/commerce/accessToken.ts`, `src/lib/commerce/addSeat.ts`, `src/lib/commerce/fulfillment.ts`, `src/app/(site)/access/seats/[token]/page.jsx`, `src/app/(site)/access/resend/page.jsx`
- Test: `accessToken.test.js`, `src/components/commerce/__tests__/license-panel.test.jsx`, `fulfillment.test.js`

**Interfaces:**
- Produces: `readAccessToken(token): { state: 'valid' | 'expired', claims } | { state: 'invalid' }`. `verifyAccessToken` stays strict and delegates to it.
- Produces: `sendLicenseLinkEmail({ to, itemName, url, reason: 'link' | 'upgrade' })`.
- Produces: `emailFreshLicenseLink(prev, formData)`, in `addSeat.ts`, using the expired token. It sends at most once per 10 minutes per license, tracked by `lastLinkSentAt`.

- [ ] **Step 1: Write the failing tests**

```js
it('reports an expired but signed token as expired, with claims', () => {})
it('reports a tampered token as invalid', () => {})
it('verifyAccessToken still rejects an expired token', () => {})
it('masks the owner email on the expired page', () => {})     // j•••@acme.com
it('sends one fresh link in ten minutes', async () => {})
it('sends it only to the license owner', async () => {})
it('resend sends a kit buyer the license page link', async () => {})
it('resend talks about upgrading with intent=upgrade', async () => {})
it('resend behaves identically for an unknown email', async () => {})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/commerce/__tests__/accessToken.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement**

Resend: `not_required` kit upgrade rows must not hide the original purchase. Pick the newest `paid` row with a license, and mint the token from it. Non-kit purchases keep `sendAccessLinkEmail`. Heading with `intent=upgrade`: "Upgrade your license". Copy: "Enter the email you bought with, and I'll send your license page."

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/commerce src/components/commerce`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "✨ Keep expired license links useful"
```

### Task 11: Handle refunds and disputes

**Files:**
- Create: `src/lib/commerce/licenseRevoke.js`, `src/lib/commerce/__tests__/licenseRevoke.test.js`
- Modify: `src/app/(commerce)/webhooks/creem/route.ts`
- Test: `src/app/(commerce)/webhooks/creem/__tests__/route.test.jsx`

**Interfaces:**
- Consumes: the `refund.created` shape in `2026-10-31-creem-proof.md`, `recomputeTier`, `removeFromRepo`.
- Produces: `revokeLicenseAccess(payload, license): Promise<void>`, behind `WAREKIT_REVOKE_ON_DEACTIVATE === '1'`, logging only otherwise.

- [ ] **Step 1: Write the failing tests**

```js
it('marks a full refund and recomputes the tier', async () => {})
it('falls back to Pro when the upgrade is refunded and flags seats over the limit', async () => {})
it('keeps Team and flags review when the original Pro is refunded', async () => {})
it('flags a partial refund without changing the tier', async () => {})
it('flags a dispute without changing the tier', async () => {})
it('is a no-op for a redelivered refund', async () => {})
it('ignores a refund for an unknown order with 200', async () => {})
it('only logs repo removal while the flag is off', async () => {})
it('skips anyone covered by another paid license', async () => {})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run "src/app/(commerce)/webhooks/creem" src/lib/commerce/__tests__/licenseRevoke.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add `refund.created` and `dispute.created` to the `POST` router. Digital purchases are marked refunded too, with no license work. Follow the Whop route's revocation structure at `route.ts:500-545`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run "src/app/(commerce)/webhooks/creem" src/lib/commerce`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "✨ Move a license back down on refund"
```

### Task 12: Sell Enterprise quotes

**Files:**
- Modify: `src/collections/Licenses.ts`, `src/payload-types.ts`, `src/components/commerce/LicensePanel.jsx`, `src/lib/contact-intents.js`
- Test: `src/lib/commerce/__tests__/licenseRecord.test.js`, `src/components/commerce/__tests__/license-panel.test.jsx`

**Interfaces:**
- Consumes: `startUpgrade` with `target: 'enterprise'`.
- Produces: virtual `enterpriseLink` on `licenses`, read by signed-in admins through an `afterRead` hook. It needs no column.
- Produces: `kitEnterpriseSubject(kit: string, tier: string): string`, returning `WareKit Enterprise · ${kit} · ${tier}`.

- [ ] **Step 1: Write the failing tests**

```js
it('builds an admin link only for a license with a quote', async () => {})
it('requires both overrides on an Enterprise license', () => {})
it('shows Complete your Enterprise upgrade when a quote exists', () => {})
it('links a full Team license to a prefilled contact form', () => {})
it('kitEnterpriseSubject names kit and tier', () => {})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/commerce/__tests__/license-panel.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

The hook mints a token with `licenseId` and null `purchaseId`. Admin validation goes on `seatOverride` and `accountOverride`. `ContactForm.jsx` already fills its subject around line 157: read that path and pass the subject the same way, extending it only if it accepts a fixed list.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/commerce src/components/commerce`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "✨ Sell Enterprise through private Creem quotes"
```

### Task 13: Update the pricing pages

**Files:**
- Modify: `src/content/site/warekit.js`, `src/lib/commerce/kitEditions.js`, `src/components/warekit/compare-table.jsx`, `src/components/warekit/help-me-choose.jsx`, `src/components/warekit/netsuite-edition.jsx`, `src/app/(site)/products/[slug]/page.tsx`
- Test: `src/lib/commerce/__tests__/kitEditions.test.js`, `src/components/warekit/__tests__/`

**Interfaces:**
- Consumes: `kitEnterpriseSubject`, `row.netsuiteAccounts`.
- Produces: `editionView().priceSub`, for example `One-time · 5 developers · 3 NetSuite accounts`.

- [ ] **Step 1: Write the failing tests**

```js
it('prices Team with developers and accounts', () => {
  // priceSub === 'One-time · 5 developers · 3 NetSuite accounts'
})
it('uses singular words for Pro', () => {
  // 'One-time · 1 developer · 1 NetSuite account'
})
it('labels the compare rows Developers and NetSuite accounts', () => {})
it('says sandboxes do not count under the accounts row', () => {
  // Yours or a client's. Sandboxes and Release Preview don't count.
})
it('tells buyers they can pay the difference later', () => {})
it('tells buyers the app never checks a license', () => {})
it('offers Enterprise as a line with no price', () => {})
it('adds More than five to Help Me Choose, ending at Enterprise', () => {})
it('shows the refund line beside a paid kit buy button only', () => {})
it('shows Already on Pro on Team, linking to /access/resend?intent=upgrade', () => {})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/commerce/__tests__/kitEditions.test.js src/components/warekit`
Expected: FAIL.

- [ ] **Step 3: Implement**

Use the spec's copy word for word. Update `setup` step copy: "Configure your account" also says to add the key to `.env`. Teal stays on the buy button. Enterprise is the secondary action style. Make Next and React rows match.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/commerce src/components/warekit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "💄 Explain developers, accounts and upgrades on the pricing page"
```

### Task 14: Add Lite's route to Pro and update the docs

**Files:**
- Modify: `src/components/commerce/ClaimFreeKit.jsx`, `src/lib/commerce/fulfillment.ts`, `docs/superpowers/plans/2026-09-22-whop-deploy-runbook.md`, `.env.example`
- Test: `src/components/commerce/__tests__/claim-free-kit.test.jsx`, `fulfillment.test.js`

- [ ] **Step 1: Write the failing tests**

```js
it('adds one line on what Pro adds to the claim result', () => {})
it('adds the same line to the claim email', async () => {})
```

The line for Next Lite is "Want sessions in NetSuite? Pro adds them." and links to the Pro product page. React Lite gets no line while React Pro is off sale.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/commerce/__tests__/claim-free-kit.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implement, then update the runbook**

Runbook: kit steps now use Creem, "delete `completeOnboarding`" is removed, and Whop plan creation for kits is removed. Whop stays for deposits.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/commerce src/lib/commerce`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "✨ Point Lite customers at Pro"
```

### Task 15: Test the whole purchase on a preview

**Needs Alec.** The SQL from Task 2 must be on production first, because the preview shares its database.

- [ ] **Step 1: Set up the preview**

Alec sets Vercel Preview variables for this branch: `CREEM_ENV=sandbox`, `NEXT_PUBLIC_CREEM_ENV=sandbox`, a test-mode `CREEM_API_KEY`, and `CREEM_WEBHOOK_SECRET`. He points a Creem test webhook at the preview, sets sandbox ids on the Next Pro and Team rows and on the upgrade product, and publishes those rows. With no live id they can't be bought in production.

- [ ] **Step 2: Walk the journey in a browser at 375px and 1440px**

1. Compare page copy is right, with no console errors.
2. Buy Pro with a test card. Land on onboarding, name a test GitHub account.
3. License page shows `1 / 1` developers, key Reveal and Copy work.
4. Move to Team. Return shows "Confirming…", then "You're on Team.". Add and remove a developer.
5. Refund the upgrade in Creem. The tier falls back to Pro and the license is flagged.

- [ ] **Step 3: Clean up**

Delete test `purchases` and `licenses` rows, marked `creemEnvironment: sandbox`, remove the test collaborators, and unpublish the rows. Show Alec the row counts first.

- [ ] **Step 4: Record the result**

Add evidence to `2026-10-31-creem-proof.md` and commit it with `✅ Record the Creem preview run`.

---

## Part 3: Counting NetSuite accounts

### Task 16: Add the report and status routes

**Files:**
- Create: `src/lib/commerce/licenseReport.js`, `src/lib/commerce/__tests__/licenseReport.test.js`, `src/app/(commerce)/licenses/report/route.js`, `src/app/(commerce)/licenses/status/route.js`
- Modify: `src/lib/commerce/fulfillment.ts`

**Interfaces:**
- Consumes: `normalizeAccountId`, `licenseLimits`, `activateLicense`, `currentKey`.
- Produces: `reportAccount(payload, { key, accountId, kit }): Promise<{ status: 'ok' | 'invalid' | 'over_limit', tier?, used?, limit? }>`.
- Produces: `licenseStatus(payload, { key, kit }): Promise<{ status: 'ok' | 'invalid', tier?, developers?: { used, limit }, accounts?: { used, limit } }>`.
- Produces: `sendOverLimitEmail({ to, accountId, used, limit, url })`.

- [ ] **Step 1: Write the failing tests**

```js
it('returns invalid for an unknown key', async () => {})
it('returns invalid for a refunded license', async () => {})
it('returns invalid for a key from another kit', async () => {})
it('updates lastSeenAt for a listed account without calling Creem', async () => {})
it('treats a sandbox as its production account', async () => {
  // 1234567 listed; report 1234567_SB1 -> ok, no new row
})
it('activates a new account when there is room', async () => {})
it('records the account when Creem fails, and retries next report', async () => {
  // no creemInstanceId stored; next report calls activateLicense again
})
it('records over_limit and emails the owner once', async () => {})
it('does not email again for the same account', async () => {})

// route tests
it('answers 400 JSON for an empty body', async () => {})
it('answers 413 above 2 KB', async () => {})
it('answers 400 for an unusable account ID', async () => {})
it('answers 200 JSON on success and never exposes the key', async () => {})
it('answers 503 JSON, not a 500 page, when the database throws', async () => {})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/commerce/__tests__/licenseReport.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement**

Follow the spec's numbered route steps. Look up by `purchases.licenseKey`, then its license. Pull the two handlers' shared parsing into `licenseReport.js`. Rate limiting is a Vercel Firewall rule, added in Task 19.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/commerce/__tests__/licenseReport.test.js "src/app/(commerce)/licenses"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "✨ Count NetSuite accounts on a license"
```

### Task 17: Add `warekit license status`

Repo: `amwaredotdev/warekit-cli`. Work on a branch and open a PR there. Publishing to npm is Alec's call.

**Files:**
- Create: `src/commands/license/license.command.ts`
- Modify: `src/index.ts`, `src/warekit.test.ts`, `README.md`

**Interfaces:**
- Consumes: `POST https://www.amware.dev/licenses/status`, and `withProject`.
- Produces: `warekit license status [-C dir]`.

- [ ] **Step 1: Write the failing tests**

```ts
it('prints tier and usage for a paid project', async () => {})
it('prints what Pro adds on a Lite project, without a network call', async () => {})
it('asks for WAREKIT_LICENSE_KEY when a paid project has none', async () => {})
it('says it could not check, and exits 0, when the request fails', async () => {})
it('reads the key from .env beside warekit.json', async () => {})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add the command with commander, matching `info.command.ts`. Use a 3-second `AbortSignal.timeout`. Lite's line for the Next kit matches Task 14. Add it to the README's command table.

- [ ] **Step 4: Run tests to verify they pass, then open the PR**

Run: `pnpm test`
Expected: PASS.

```bash
git commit -m "✨ Add warekit license status"
```

### Task 18: Report after deploy in the kits

Repos: `amwaredotdev/warekit-next-netsuite`, then synced to `warekit-next-netsuite-lite` and `warekit-react-netsuite-lite`. `warekit-react-netsuite` doesn't exist yet. PRs only.

**Files:**
- Create: `tooling/shared/report-license.mjs`, with a test beside the tooling's other tests
- Modify: `tooling/shared/deploy.mjs`, `.env.example`, `README.md`, `docs/shared-tooling.md`, and in Next Lite, `docs/authentication.md`

**Interfaces:**
- Consumes: `POST https://www.amware.dev/licenses/report`, `NS_ACCOUNT_ID`, `WAREKIT_LICENSE_KEY`, `warekit.json`'s `kit` and `edition`.
- Produces: `reportLicense({ env, manifest, fetchImpl? }): Promise<string | null>`, returning the one line to print.

- [ ] **Step 1: Write the failing tests**

```js
it('does nothing on a Lite project', async () => {})
it('reminds a paid project with no key, in one line', async () => {})
it('posts key, account and kit', async () => {})
it('returns the over-limit line', async () => {
  // WareKit: account 7654321 is over this license's limit (1 of 1). Nothing is blocked. Your license page has the options.
})
it('returns null and never throws when the request hangs or fails', async () => {
  // fetchImpl rejects after the timeout
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL.

- [ ] **Step 3: Implement**

Timeout is 3 seconds. Call it only after a successful `deploy` in `deploy.mjs`, and never let it change the exit code. Add `WAREKIT_LICENSE_KEY=` to `.env.example`, with a comment on what is sent and why. Copy to the other kits with `pnpm tooling:sync`, and confirm `pnpm tooling:check`. In Next Lite's `docs/authentication.md`, link to the Pro product page where it explains session storage. Lite has no `docs/sessions.md`.

- [ ] **Step 4: Run tests to verify they pass, then open the PRs**

Run: `pnpm test`
Expected: PASS.

```bash
git commit -m "✨ Report the NetSuite account after deploy"
```

---

## Part 4: Go live

### Task 19: Open sales with Alec

Nothing here is code. Each line needs Alec.

- [ ] **Step 1: Kit license terms.** Replace every kit's placeholder `LICENSE`, covering seats, accounts, client work, the 14-day refund and account reporting, after a lawyer's review. Include the assumption that handing a client the source repo isn't allowed.
- [ ] **Step 2: Live Creem products.** Next Pro and Team with key delivery and no activation limit, and the Pro to Team upgrade product at $500.00 with no key. Set ids on the rows.
- [ ] **Step 3: Vercel.** Add a Firewall rate limit on `/licenses/*`. Confirm `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `ACCESS_LINK_SECRET` and `GITHUB_TOKEN` in production, and that `CREEM_ENV` is unset. Confirm the webhook is subscribed to `checkout.completed`, `refund.created` and `dispute.created`.
- [ ] **Step 4: Merge and publish.** Merge the site, publish the CLI, merge the kit PRs, and publish the Next rows. React Pro and Team stay off sale.
- [ ] **Step 5: First live sale.** One real Pro purchase, using a discount code if Creem still fires the webhook, then an upgrade and a refund test. Check the license, the emails and the admin list.
- [ ] **Step 6: Update the project notes.** Record in memory that kits are live on Creem and the date.
