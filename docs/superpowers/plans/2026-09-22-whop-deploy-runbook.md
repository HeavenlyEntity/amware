# Deploying `whop-consolidation` — runbook

The branch `whop-consolidation` (worktree `../my-next-spotlight-whop`) moves WareKit kit sales
from Creem to Whop, puts kits **and** engagement deposits on Whop Elements, and fixes the funnel
defects found in review. It has passed three task-level review cycles and two whole-branch
reviews. Verdict: **merge with the fixes below applied; not deployable until the preconditions
hold.** Suite: 85 files, 831 tests; `tsc` clean.

This file exists because the database DDL previously lived only in a git-ignored ledger.

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

- `NEXT_PUBLIC_WHOP_ENV` and `WHOP_ENV` unset, or `production`, in Vercel.
- `WAREKIT_REVOKE_ON_DEACTIVATE` **unset**. Revocation ships log-only; see "Owner decisions".

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

### 7. Subscribe the webhook to `membership.deactivated`

The sim (`sim/6-whop-engagements.sim.test.mjs`) now requests the event and updates an existing hook,
but it has not been run — it calls Whop's live API. Without the subscription, revocation never
receives an event.

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
production.

- [ ] Buy with a **100%-off promo code** on a kit plan and a deposit plan. Confirm a $0 order emits
      `payment.succeeded`. If it does not, make one real small charge on a test plan, then refund it —
      a $0 order proves nothing about the webhook.
- [ ] Confirm `payment.metadata.checkout_ref` arrives on the webhook and is stored as
      `whop_checkout_ref`. If it does not, both return pages will show "Confirming…" and then
      "Check your email" — no money is lost, but the confirmation page never works.
- [ ] Record the exact return URL Whop produces on success, and check that `ref` survives intact.
- [ ] Each return page reaches its confirmed state within about 30 seconds.
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
- **Turning revocation on.** Before setting `WAREKIT_REVOKE_ON_DEACTIVATE=1`: step 7 above, read the
  log lines from a real sandbox or production refund, and decide on restoring access when a membership
  is reinstated (`membership.activated` is not handled).

## Still to build for the full funnel

In order, after deploy:

1. **Migration Task 1**, updated for Elements: Whop plans for Next Lite/Pro/Team and React Lite with a
   `GitHub username` custom field, plan ids into Payload, and the custom-field capture (the hosted
   checkout in the sandbox still works for that).
2. **Migration Task 9, corrected**, and its first step is non-negotiable: repoint the buy-button gates
   off `creemProductId` (`products/[slug]/page.tsx:227`, `courses/[slug]/page.tsx:73`,
   `catalog-cards.jsx:311`). Until then no kit renders a checkout at all. Keep `access/seats/`,
   `access/resend/` and `accessToken.ts`; repoint resend to `/access/seats/<token>` for multi-seat
   purchases; delete `completeOnboarding`.
3. **Migration Task 10** (drop the Creem columns, keep `accessTokenJti`) and **Task 11** (preflight).
4. **The community plan** (`2026-09-20-whop-community.md`), which needs two more columns.
5. **Kit repositories:** `LICENSE.md` in each (Lite permissive, Pro commercial and lawyer-reviewed),
   the Turborepo restructure, and a decision on `warekit-react-netsuite`, which does not exist — React
   Pro/Team stay off sale until it does.
6. **Growth:** the Whop marketplace listing and affiliate programme. Elements now passes
   `affiliateCode`, `attribution` and `promoCode` natively.
