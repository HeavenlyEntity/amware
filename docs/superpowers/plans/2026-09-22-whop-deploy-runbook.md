# Deploying `whop-consolidation` — runbook

The branch `whop-consolidation` (worktree `../my-next-spotlight-whop`) moved WareKit kit sales
from Creem to Whop, put kits **and** engagement deposits on Whop Elements, and fixed the funnel
defects found in review. It has passed three task-level review cycles and two whole-branch
reviews. Verdict: **merge with the fixes below applied; not deployable until the preconditions
hold.** Suite: 85 files, 831 tests; `tsc` clean.

This file exists because the database DDL previously lived only in a git-ignored ledger.

> **Updated 2026-10-31: kits sell on Creem, not Whop.** The WareKit licensing build
> (`docs/superpowers/specs/2026-10-31-warekit-licensing-design.md`) moved paid kits back to Creem, with
> one license per customer. **Whop keeps engagement deposits only.** What that changes below:
>
> - Kit steps use Creem. Whop plan creation and the Whop checkout for kits are gone, and the Whop
>   pixel still tracks kit events (`CreemBuyButton.jsx` and `ClaimFreeKit.jsx` fire `whopTrack`). The Whop webhook's kit branch stays in the file but is dormant: no Whop kit sale exists.
> - `completeOnboarding` is **not** deleted. The Creem onboarding link calls it
>   (`src/app/(site)/checkout/onboarding/page.tsx` through `OnboardingGithubForm`).
> - Anything below about Whop that is about a kit is history. The deposit parts still apply as written.
> - Go-live for kits is the new section "Before a paid kit goes on sale (Creem)", further down.

## Why order matters

Payload does not push schema in production, and it names every declared column in every query.
The collections on this branch declare seven columns the database does not have. Deployed without
them, every read of `products`, `courses` and `purchases` fails: the build dies at
`generateStaticParams`, and a running deploy would 500 the **live deposit webhook** on its
duplicate check. Merging to `main` first would block every later `main` deploy, including an urgent
fix. **Create the columns first.**

The old code on `main` keeps working alongside the new columns: they are nullable, have no default
and use non-unique indexes, and `main` never selects or inserts them. Rolling back stays safe.

## Preconditions, in order

### 1. Set `GITHUB_TOKEN` in Vercel production

It is not set today, so automated repo invitations have never run in production — every kit sale
takes the manual fallback. Use a fine-grained PAT on `amwaredotdev` with Administration: read and
write on the kit repositories (`docs/github-token.md`). Then `vercel redeploy https://www.amware.dev`
— Vercel functions only see variables added before their build.

### 2. Create the seven columns

```sql
ALTER TABLE products  ADD COLUMN whop_plan_id varchar, ADD COLUMN whop_sandbox_plan_id varchar;
ALTER TABLE courses   ADD COLUMN whop_plan_id varchar, ADD COLUMN whop_sandbox_plan_id varchar;
ALTER TABLE purchases ADD COLUMN whop_plan_id varchar, ADD COLUMN whop_membership_id varchar,
                      ADD COLUMN whop_checkout_ref varchar;
CREATE INDEX purchases_whop_plan_id_idx       ON purchases (whop_plan_id);
CREATE INDEX purchases_whop_membership_id_idx ON purchases (whop_membership_id);
CREATE INDEX purchases_whop_checkout_ref_idx  ON purchases (whop_checkout_ref);
```

This matches what Payload's push generates (text becomes `varchar`; indexes are named
`<table>_<column>_idx`; none of these collections use versions or localization), verified
against Payload's source. The checkout-ref index is deliberately non-unique, so a retried session
never turns a real payment into a 500.

> **Shared database hazard.** Payload pushes schema whenever a dev server starts outside
> production. A `pnpm dev` from any checkout whose collections lack these fields — your main
> checkout on `polar-migration`, or the other worktrees — generates `DROP COLUMN` for them.
> drizzle-kit only prompts (default _No_) for tables with rows; an **empty `courses` table loses its
> columns silently**, and one accepted prompt puts the deposit webhook back on 500s. Do not run
> `pnpm dev` from another checkout until these fields are on `main`.

### 3. Confirm `pnpm build` passes on the branch

This is the real gate, and it only becomes possible after step 2.

### 4. ~~Fix the one parked copy defect~~ — done

The onboarding page's failed-lookup (database error) state no longer says "Your payment is safe
either way — … reply to your receipt". It now uses the same conditional sentences as the pending
states, offers a refresh and the contact route, and — because the page could not check — no second
purchase.

### 5. Environment

- `NEXT_PUBLIC_WHOP_ENV` and `WHOP_ENV` unset, or `production`, in Vercel. Whop is the deposit path now.
- `NEXT_PUBLIC_CREEM_ENV` and `CREEM_ENV` unset, or `production`, in Vercel. Unset means production, so a
  forgotten variable never points buyers at the sandbox. A sandbox preview sets both to `sandbox`, with a
  test-mode `CREEM_API_KEY` and webhook secret: Creem products and keys must be in the same mode.
- `CREEM_API_KEY` and `CREEM_WEBHOOK_SECRET` set for Production, for the same Creem mode as the product ids
  in the database. `ACCESS_LINK_SECRET` set too: a kit cannot be sold without it, because it signs the
  onboarding link the buyer returns to after paying. (`vercel env ls production` lists names only. It showed
  `ACCESS_LINK_SECRET` on 2026-09-22; run it again before launch. TODO(alec): confirm `CREEM_API_KEY` and
  `CREEM_WEBHOOK_SECRET` are in Production and in live mode.)
- `WAREKIT_REVOKE_ON_DEACTIVATE` **unset**. Revocation ships log-only, for Creem refunds as well as the
  dormant Whop route. Leave it off until Alec has run a refund test; see "Owner decisions".

### 6. Register `www.amware.dev` for Apple Pay and Google Pay

Whop hides both wallets in an embedded checkout until the page's domain is registered with Whop.
That applies to Elements on this branch and to the `@whop/checkout` embed live on `main` today.
One registration covers both wallets. It does not depend on this branch, so do it as soon as #13
is live.

1. Merge [#13](https://github.com/HeavenlyEntity/amware/pull/13). It serves Whop's verification
   file at `/.well-known/apple-developer-merchantid-domain-association`. The file is Whop's, byte
   for byte, so never edit or reformat it. Check that
   https://www.amware.dev/.well-known/apple-developer-merchantid-domain-association returns the
   228-byte file.
2. In Whop, go to Settings → Checkout → **Apple Pay and Google Pay for embedded checkout** →
   **Configure** → **+** → **Self-hosted verification**, and enter `www.amware.dev`. Whop fetches
   the file before it registers the domain with Apple.

Register `www.amware.dev` only. `amware.dev` 308-redirects to it, so no checkout ever renders on
the bare domain.

### 7. ~~Subscribe the Whop webhook to `membership.deactivated`~~ — no longer a gate

That event only revoked a Whop kit membership, and kits are not sold on Whop now. The owner reported the
subscription done on 2026-09-25 and it can stay. TODO(alec): confirm. Kit revocation comes from Creem's `refund.created`; see
the Creem section below.

## Merging with your uncommitted branch

Your main checkout has uncommitted edits to `pricing.jsx`, `catalog-cards.jsx`, `BookCallButton.jsx`,
`Services.ts`, `catalog-cards.test.jsx` and `pricing-tabs.test.jsx`. Expect:

- **`pricing-tabs.test.jsx`** — the branch changed only its checkout mock: `@whop/checkout/react` →
  `@/components/commerce/WhopCheckout`. Take that line; keep the rest of yours.
- **`pricing.jsx`** — renders `DepositCheckout`, whose props are byte-identical on the branch. No change needed.
- **`BookCallButton.jsx`** — its `onClick` prop and the comment at lines 19-22 no longer have a caller
  (the in-sheet "deposit received" popup is gone). Remove them when you merge.
- **`src/components/commerce/deposit-check-frames.js`** — the sheet's checkmark/LED animation is now
  imported by nothing. Delete it, or reuse it on the deposit page's "Your start is reserved" state.

## Straight after deploying — with instant rollback ready

Whop Elements' sandbox is not generally available, so the Elements checkout can only be proven in
production. This list is for the **deposit** checkout now. Kits are checked in "Before a paid kit goes
on sale (Creem)".

- [ ] Buy with a **100%-off promo code** on a deposit plan. Confirm a $0 order emits
      `payment.succeeded`. If it does not, make one real small charge on a test plan, then refund it —
      a $0 order proves nothing about the webhook.
- [ ] Confirm `payment.metadata.checkout_ref` arrives on the webhook and is stored as
      `whop_checkout_ref`. If it does not, the deposit return page will show "Confirming…" and then
      "Check your email" — no money is lost, but the confirmation page never works.
- [ ] Record the exact return URL Whop produces on success, and check that `ref` survives intact.
- [ ] The deposit return page reaches its confirmed state within about 30 seconds.
- [ ] **One real 3DS payment on the deposit sheet.** Unverified: if Whop draws the 3DS dialog on your
      page rather than inside its frame, it sits outside the modal sheet and may be unclickable, or a
      click may close the sheet mid-payment. A 100%-off order runs no 3DS, so it cannot reveal this.
- [ ] Watch the Whop pixel for duplicate `begin_checkout` events.
- [ ] Delete the test rows from the shared database.

Until this list has evidence, the honest status is **"staging journey verified; production revenue
capture unverified."**

## Owner decisions still open

- **`begin_checkout` semantics.** With an inline checkout it now fires per page view that shows a
  plan, not per button press. It feeds Whop's ad optimisation.
- **Turning revocation on.** Leave `WAREKIT_REVOKE_ON_DEACTIVATE` unset until Alec has run a refund
  test on Creem and read what the webhook logged. With the flag off, a full refund logs
  `Would revoke repo access (flag off)` and sets `needsReview` on the license; nothing is removed from
  GitHub. Only after those log lines look right, set `WAREKIT_REVOKE_ON_DEACTIVATE=1`. Restoring access
  when a refund is reversed is not handled on either route. TODO(alec): decide whether it needs to be.

## Before a paid kit goes on sale (Creem)

Nothing on this list is done until it is ticked with evidence. Kits stay `draft` until Alec publishes
them, and a kit with no live Creem product id is off sale whatever its status.

- [ ] **Licensing SQL applied.** `docs/superpowers/plans/2026-10-31-licensing.sql`, by Alec in the
      Supabase SQL editor, before the licensing branch reaches `main`. Its header says it has not been
      run. Until the branch is on `main`, no `pnpm dev` or `pnpm sim` from `main` or an older checkout:
      their schema push would drop the new tables and columns.
- [ ] **Kit `LICENSE` files.** Every kit's `LICENSE` is a placeholder. The terms must cover seats,
      accounts, the 14-day refund and the account id being reported, and must say client work is allowed
      within the account allowance. A lawyer reviews them. TODO(alec): name the lawyer and the date.
- [ ] **Creem products, one per tier and stack,** in live mode, with a license key delivery item and **no
      activation limit**. The live product ids go in each kit row's `creemProductId`.
      TODO(alec): confirm which live products exist; the proof run used test-mode products.
- [ ] **The two upgrade products,** Pro to Team, one per stack, with **no key** delivery item. Each
      price in Creem must equal **Team minus Pro** (today $999.00 less $499.00, so $500.00). The license
      page computes that difference from the two rows and shows it as the button price, but Creem charges
      whatever the upgrade product says, so a mismatch charges a different amount than the page promised.
      Recheck it whenever either price changes.
- [ ] **Webhook subscription.** `<origin>/webhooks/creem` subscribes to `checkout.completed`,
      `refund.created` and `dispute.created`. Without `refund.created` and `dispute.created`, refunds and
      disputes change nothing on a license. The signing secret in Vercel is for the same mode as the key.
- [ ] **Low-balance refund check, before the 14-day promise goes live.** The refund API once failed with
      `400 Insufficient balance` on a first refund and succeeded in the dashboard about two minutes later,
      after a second payment came in (`2026-10-31-creem-proof.md`, "Refund limits"). The cause is not
      established. The kit pages promise a 14-day refund the moment a kit has a `creemProductId`, so
      check how a refund behaves with a low store balance, especially on the first sale, before that
      happens. TODO(alec): record the result here.
- [ ] **Sandbox walk-through on a Vercel preview** with `CREEM_ENV` and `NEXT_PUBLIC_CREEM_ENV` set to
      `sandbox`: buy, onboard, upgrade, refund. It creates real `purchases` and `licenses` rows in the
      shared database, so end by deleting them.
- [ ] **First live sale with Alec,** small, then a refund. Test mode cannot show the live key and webhook
      pair.
- [ ] **Vercel Firewall rate limit on `/licenses/*`.** The license routes are public and have no limit
      in code (`src/lib/commerce/licenseReport.js` leaves it to this rule), so add the rule before a kit
      ships with a key. TODO(alec): choose the requests-per-minute figure and record it here.
- [ ] **`WAREKIT_REVOKE_ON_DEACTIVATE` still unset** at launch. It stays off until the refund test above
      has been read; see "Owner decisions".
- [ ] **React Pro and Team stay off sale.** `warekit-react-netsuite` does not exist.

The free Lite claim says nothing about paying, with one exception: while a Pro kit for the same stack
is on sale (published, with a live Creem product id) the result and the email each carry one line,
"Want sessions in NetSuite? Pro adds them.", linking to its page. React Lite gets it automatically on
the day React Pro sells.

## Still to build for the full funnel

In order, after deploy:

1. ~~**Migration Task 1:** Whop plans for Next Lite/Pro/Team and React Lite.~~ **Removed.** Kits sell on
   Creem, and Lite is a free claim that needs no plan. Whop plans remain only for engagement deposits.
2. **Migration Task 9, corrected.** The buy-button gates are done: `products/[slug]/page.tsx`,
   `catalog-cards.jsx` and the pricing table's `cta()` branch on `checkoutRoute(product)` (kits and
   digital products to Creem, anything else to its Whop plan), and `courses/[slug]/page.tsx` reads
   `planId(course)`. The `ServiceAction` gate still reads `creemProductId` on purpose: a service's
   `whopPlanId` is its deposit plan, so gating on it would replace the reservation CTA. Keep
   `access/seats/`, `access/resend/` and `accessToken.ts`. **Keep `completeOnboarding`:** the Creem
   onboarding link uses it. It is no longer on the delete list.
3. **Migration Task 10 does not run as written, and neither does its `DELETE FROM purchases;`.** Digital
   products sell through Creem, so every `purchases` Creem column stays: `provider`, `creemProductId`,
   `creemOrderId`, `creemSubscriptionId`, `creemTransactionId`, `creemRequestId`. So do `licenseKey`
   and `accessTokenJti`. Deleting the rows would erase real sales, and dropping `creemOrderId` would
   break the Creem webhook's idempotency lookup. Likewise keep `creemProductId` on `products`,
   `creem.ts`, `/webhooks/creem`, `/access/[token]` and `/checkout/success`. Rewrite Task 10 before
   anyone runs it. **Task 11** (preflight) is unaffected.

   Creem delivers digital products: the file is attached to the product in Creem's dashboard (File
   Downloads) and reaches the buyer through Creem's purchase email and customer portal. A published
   `digital` product with a `creemProductId` is on sale, and nothing here can see whether Creem has a
   file, so confirm that in the same Creem mode as the production key before publishing. The webhook
   records these sales as `not_required` and sends no access link, so a digital sale needs
   `CREEM_WEBHOOK_SECRET` but not `ACCESS_LINK_SECRET`.

4. **The community plan** (`2026-09-20-whop-community.md`), which needs two more columns.
5. **Kit repositories:** `LICENSE.md` in each (Lite permissive, Pro commercial and lawyer-reviewed),
   the Turborepo restructure, and a decision on `warekit-react-netsuite`, which does not exist — React
   Pro/Team stay off sale until it does.
6. **Growth:** the Whop marketplace listing and affiliate programme. Elements now passes
   `affiliateCode`, `attribution` and `promoCode` natively.
