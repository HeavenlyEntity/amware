# Polar Migration — Consolidating Creem + Whop onto Polar.sh — Design Spec

**Date:** 2026-09-20
**Status:** Draft for review
**Author:** Alec M (with Claude)
**Supersedes:** the commerce provider decisions in `2026-06-08-payload-commerce-b2-design.md` (Creem.io hosted checkout) and the Whop deposit path added afterwards.

## Goal

Replace **both** payment providers with **Polar.sh**, and replace our own GitHub
invitation code with Polar's **GitHub Repository Access benefit**, so that:

- there is one provider, one webhook, one ledger shape, and one checkout path;
- kit delivery is automatic and the buyer's GitHub account is **proven by OAuth**
  rather than typed into a form and hoped for;
- inviting a buyer as a repository collaborator costs nothing.

## Why now, and what is actually being fixed

The original motivation was "migrate off Whop to get automated GitHub invites."
Investigation changed the shape of that:

1. **Automated GitHub invites already work**, in `src/lib/commerce/githubInvite.ts`,
   and they are on the **Creem** side. Whop only takes engagement deposits, which
   have nothing to deliver (`fulfillmentStatus: 'not_required'`). Migrating Whop
   alone would have gained nothing on fulfillment.
2. **The collaborator cost is a GitHub plan problem, not a provider problem.**
   GitHub Free for organizations allows unlimited collaborators on unlimited
   private repositories; only GitHub Team bills per user. The kit repositories
   already live under the `amwaredotdev` **org**.
3. **Polar's GitHub benefit does not support personal-account repositories by
   default.** GitHub grants personal-repo collaborators full **write**, so Polar
   blocks it and requires you to contact them to enable it. Org repositories
   support a **Read** role and work out of the box.

So the plan is *not* "move repos to a personal account." It is "put the org on
GitHub Free, and let Polar drive the invitations."

The genuine wins are consolidation and deletion: one provider instead of two, and
roughly a dozen modules of bespoke fulfillment code retired in favour of a
platform feature.

## Migration risk: effectively nil

Measured against the production database on 2026-09-20:

| | Count | Detail |
|---|---|---|
| `purchases` rows | 4 | **all test data** |
| — Creem | 2 | `@resend.dev`; one $499, one $0 free claim |
| — Whop | 2 | `whopEnvironment: sandbox`, both `fulfillmentStatus: failed` |
| Live subscriptions | **0** | no row has `creemSubscriptionId` |
| WareKit products | 6 | **all `draft`** — never sold |
| Published products | 1 | `switch-clone-quick-key-rotation-guide` (digital, **no download file attached**) |
| Published services | 3 | `advisor`, `embedded-cto`, `fractional-cto` — live Whop deposit plans |

**There are no real customers and no live subscriptions.** This is a clean
cutover, not a data migration: no parallel run, no grandfathering, no
compatibility shims, no back-compat columns. The four test rows are deleted as
part of the schema change.

This also means the work is better understood as *"set Polar up correctly before
the kits launch"* than as *"migrate a running store."*

## Locked Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | Replace **both** Creem and Whop | One provider, one webhook, one ledger |
| GitHub delivery | **Polar's GitHub Repository Access benefit** | Deletes our invite code; OAuth-verified identity |
| Repo ownership | Stay in the **`amwaredotdev` org**, downgraded to **GitHub Free** | Free collaborators *and* a Read-only role; personal repos force write access |
| Collaborator role | **Read** | Buyers clone and fork; they never push to the product |
| Free WareKit Lite | A **$0 Polar product** with the same benefit | One delivery path for free and paid alike |
| Team tier | Polar **seat-based one-time** pricing (perpetual seats) | Benefits are granted per member, which is what a 5-seat licence means |
| Deposits | Polar **embedded** checkout | Preserves today's on-page Whop sheet feel |
| Kits / guide | Polar **hosted redirect** | Matches today's Creem behaviour |
| Post-purchase proof | `success_url` + `checkout_id={CHECKOUT_ID}`, verified via Polar's API | Stronger than our HMAC, and retires `ACCESS_LINK_SECRET` |
| Digital downloads | Polar **File Downloads** benefit | Nothing uses `/access/*` today; do not port dead machinery |
| License keys | Polar **License Keys** benefit, prefix `WAREKIT_`, on Pro and Team | Today's key is display-only and enforces nothing |
| Activation limit | **Equal to the seat count** — Pro 1, Team 5 | A shared key hits its activation cap; this is the control that actually bites |
| Where validation runs | In the **WareKit CLI**, against Polar's customer-portal endpoint | It needs no secret, so the CLI calls Polar directly with no proxy of ours |
| Whop ads pixel | **Keep**, unchanged | Ad attribution is independent of who processes payments |
| Sandbox | Polar's separate sandbox org | Mirrors the existing `whopEnv` dual-id pattern |
| Idempotency | Polar checkout id, unique on `purchases` | Same discipline as the Creem order id today |
| Schema change | **Payload's schema push**, not a written migration | This project has no `src/migrations` directory and has never used written migrations; with all four rows deleted first, there is no data to preserve through the change |
| Polar organization | The **existing pre-2026-05-27 org**. Never create a new one | The Early Member rate (4% + 40¢) attaches to the *organization*, not the account. A new org starts on Starter (5% + 50¢) "even if created by customers who signed up earlier" |
| Polar plan | **Stay on Early Member.** Never accept a Pro/Growth/Scale upgrade | Upgrading retires Early Member for that org irreversibly, and it does not pay off until roughly $10k/mo in sales |
| Redistribution control | A **`LICENSE.md`** in each kit repo, not the license key | Legal terms are what govern redistribution of source; the key governs concurrent use |

## Non-goals

- Porting historical Creem/Whop rows. They are test data and get deleted.
- Customer accounts or login. Delivery stays account-free on our side; Polar's
  customer portal is where a buyer connects GitHub.
- Changing prices, tiers, or the catalogue's shape.
- Removing or re-instrumenting the Whop ads pixel beyond repointing `purchase`.

## Phase 0 — Manual setup (no code; do this first)

Roughly half the work lives outside the repository. None of the code below can be
tested until this exists.

1. **Downgrade the `amwaredotdev` org to GitHub Free.** This is the step that
   actually removes the collaborator cost. Confirm first that the kit repos do not
   depend on Team-only features on private repos (protected branches, code
   owners, required reviews).
2. **Use the existing Polar organization — do not create a new one.** See the
   fee note below; this step is worth real money. Then install Polar's
   **dedicated GitHub App** on it. This is a separate authorization from Polar's
   GitHub login: the collaborator-management permission is not requested by the
   core app.
3. **Create two GitHub benefits**, one per repo family, role **Read**:
   - `amwaredotdev/warekit-next-netsuite` and `…-next-netsuite-lite`
   - `amwaredotdev/warekit-react-netsuite` and `…-react-netsuite-lite`
4. **Create the License Keys benefits** — one per paid tier, prefix `WAREKIT_`,
   no expiry, `limit_activations` equal to the seat count (Pro 1, Team 5). Lite
   gets none. Record each `benefit_id`: the CLI has to check it.
5. **Recreate the catalogue in Polar** — 8 products and 3 deposit products. Team
   tiers use seat-based one-time pricing with 5 seats. Lite tiers are $0.
6. **Repeat 2–5 in `sandbox.polar.sh`.** Polar's sandbox is a fully separate
   account with its own product ids, exactly like Whop's was.
7. **Record both product id sets** — they are what Phase 2 writes into Payload.

### The fee note, and why step 2 says what it says

This account qualifies for Polar's **Early Member** rate: **4% + 40¢, no monthly
fee**, plus 0.5% on subscription payments and the usual +1.5% on international
cards. Polar has committed to honouring it indefinitely.

But the rate attaches to the **organization**, not to the account. Polar's fee
page is explicit:

> Organizations created on or after May 27, 2026 start on Starter (5% + 50¢).
> This applies to new organizations even if they're created by customers who
> signed up earlier.

So creating a fresh org for this migration would silently cost **1% + 10¢ on
every sale, forever**. Sell through the existing org.

Two further guardrails on the same page:

- **Never accept an upgrade to Pro, Growth or Scale.** "The moment you upgrade to
  a paid plan, Early Member is retired for that organization," and downgrading
  later lands on Starter, not back on Early Member. It is one-way.
- **The dashboard's breakeven figures are measured against Starter, not against
  Early Member**, so they will overstate the case for upgrading. Against Early
  Member, Pro ($20/mo to save 0.2%) does not pay off until roughly **$10,000/mo**
  in sales, and Growth ($100/mo to save 0.4% + 5¢) not until roughly **$25,000/mo**.
  Below those, upgrading costs money *and* burns the Early Member rate.

The sandbox organization's creation date does not matter — no real money moves
through it.

At 4% + 40¢ the fee objection that shaped the original draft of this spec largely
dissolves: this is competitive with Creem rather than a clear step up in cost.

## Architecture

```
(site) kit / guide page
  └─ "Buy" → Server Action createCheckout(itemType, slug)          [checkout.ts, kept]
        ├─ loads the Payload item, reads polarProductId for this environment
        ├─ polar.checkouts.create({ products, successUrl, metadata })
        │     successUrl = <site>/checkout/onboarding?checkout_id={CHECKOUT_ID}
        │     metadata   = { itemType, itemId, slug }
        └─ redirect(checkout.url)                        → Polar hosted checkout
                                                              │ buyer pays
  Polar ──order.paid──────────────► POST /webhooks/polar   [Webhooks() from @polar-sh/nextjs]
        ├─ dedupe on polarCheckoutId (unique)
        ├─ create Purchase (email, item from metadata, amount, status=paid,
        │                   fulfillmentStatus = boilerplate ? 'pending' : 'not_required')
        └─ 200

  buyer connects GitHub in Polar's customer portal
  Polar invites them to the repo at Read

  Polar ──benefit_grant.created──► POST /webhooks/polar
        └─ stamp githubRepo + githubInviteUrl, append seatMembers,
           fulfillmentStatus = 'sent'

(site) services page
  └─ deposit → Polar embedded checkout (on-page)
  Polar ──order.paid (itemType: service)──► deposit receipt + owner notification
                                            fulfillmentStatus = 'not_required'
```

## Data model

### `purchases`

Two provider id families collapse into one. Because every existing row is test
data, the old columns are **dropped**, not deprecated.

| Removed | Added |
|---|---|
| `provider` | — (only one provider now) |
| `creemOrderId`, `creemProductId`, `creemRequestId`, `creemSubscriptionId`, `creemTransactionId` | `polarCheckoutId` (**unique, indexed** — the idempotency key), `polarOrderId`, `polarProductId`, `polarCustomerId`, `polarSubscriptionId` |
| `whopPaymentId`, `whopEnvironment` | `polarEnvironment` (`production` \| `sandbox`) |
| `accessTokenJti` | — (access links retired) |

Kept, but with a changed writer: `githubUsername`, `githubRepo`,
`githubInviteUrl`, and `seatMembers` are now populated from `benefit_grant.*`
webhooks rather than by our own GitHub call. `fulfillmentStatus` keeps its
existing option set.

`licenseKey` stays and gains `licenseKeyId` (Polar's record id, needed to rotate
a leaked key) and `licenseKeyBenefitId` (which tier the key belongs to — see
Licensing below for why that matters). Both are written from
`benefit_grant.created`.

`admin.listSearchableFields` becomes `['email', 'githubUsername', 'polarCheckoutId']`.

### `products` / `courses`

`creemProductId` → `polarProductId` + `polarSandboxProductId`. `githubRepo` stays
and remains the record of which repo a buyer paid for, copied onto the purchase
at sale time so a later catalogue edit cannot rewrite history. `seats` stays as
display metadata; Polar is the enforcer.

### `services`

`whopPlanId`, `whopSandboxPlanId` and `creemProductId` → `polarProductId` +
`polarSandboxProductId`. `bookingUrl` is unchanged and still drives the
post-deposit Cal.com step.

## Components

**New**

- `src/lib/commerce/polar.ts` — SDK client, `polarProductId(item, env)`, typed
  event payloads. The single place that knows about Polar's API surface.
- `src/lib/commerce/polarEnv.ts` — `production | sandbox`, read from
  `NEXT_PUBLIC_POLAR_ENV` / `POLAR_ENV`, **defaulting to production** so a
  forgotten variable can never point real customers at the sandbox. Modelled
  directly on the existing `whopEnv.ts`, which got this right.
- `src/app/(commerce)/webhooks/polar/route.ts` — one route, using `Webhooks()`
  from `@polar-sh/nextjs` for signature verification, with granular handlers for
  `order.paid`, `order.refunded`, `benefit_grant.created`,
  `benefit_grant.revoked`, and the `subscription.*` states.

**Changed**

- `src/lib/commerce/checkout.ts` — keeps its server-action shape and its
  buyer-facing "this item is not on sale yet. Nothing has been charged." path.
  Only the provider call underneath changes. The `needsOnboarding` branch
  simplifies: every checkout now returns to the same URL carrying `checkout_id`.
- `src/components/commerce/DepositCheckout.jsx` — Whop embed → Polar embedded
  checkout. Same sheet, same trigger, same analytics event.
- `src/app/(site)/checkout/onboarding/page.tsx` — stops asking for a GitHub
  username. Verifies `checkout_id` against Polar's API, then shows the next
  steps: connect GitHub in Polar's portal, join Discord, run the CLI command.
- `src/lib/commerce/fulfillment.ts` — `sendAccessLinkEmail` is removed; the
  boilerplate confirmation email loses its "I could not send the invitation"
  branch (Polar owns that now) and gains a "connect your GitHub account" branch.
- `src/lib/analytics/whop.ts` and `docs/whop-events.md` — the `purchase` event
  fires off Polar instead of Creem; `event_id` becomes the Polar checkout id.
  The documented rule "never fire `purchase` for a sale Whop processed" now
  applies to **no** sale, since Whop processes none — worth restating in the doc
  so the next reader does not have to rediscover why it was there.

**Deleted**

`creem.ts`, `creemPriceEndpoint.ts`, `whop.ts`, `whopEnv.ts`, `githubInvite.ts`,
`githubUsername.ts`, `claim.ts`, `accessToken.ts`, `onboardingLink.ts`,
`seats.ts`, `addSeat.ts`, `webhooks/creem/route.ts`, `webhooks/whop/route.ts`,
`app/(site)/access/*`, `GithubAccountField.jsx`, `SeatManager.jsx`,
`ClaimFreeKit.jsx`, `fields/creem/*`, and their tests.

**Environment variables removed:** `CREEM_API_URL`, `CREEM_API_KEY`,
`CREEM_WEBHOOK_SECRET`, `WHOP_API_KEY`, `WHOP_WEBHOOK_SECRET`, `WHOP_ENV`,
`NEXT_PUBLIC_WHOP_ENV`, `GITHUB_TOKEN`, `ACCESS_LINK_SECRET`.

**Added:** `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_ENV`,
`NEXT_PUBLIC_POLAR_ENV`.

`docs/github-token.md` is deleted; its reasoning about OAuth-vs-PAT is
superseded, and its closing observation — that letting the buyer *prove* their
GitHub account would delete a whole class of mistake — is precisely what this
migration delivers. Worth quoting that line in the commit message.

## Licensing and leak control

### What exists today

Nothing enforceable. Creem issues a key, `webhooks/creem/route.ts` stores it on
the purchase, and `OnboardingSteps.jsx` prints it on the onboarding page. **No
code anywhere validates it.** The only real access control today is the
repository invitation itself. The migration must not quietly lose the key on the
way past — and it is worth being clear that there is currently nothing to lose
beyond the display.

### What a license key can and cannot do here

Be honest about the threat model, because overstating it leads to building the
wrong thing:

- **It cannot stop source redistribution.** WareKit ships as a Git repository.
  Once a buyer has cloned it they hold the source, and no key changes that. Any
  design that claims otherwise is selling a lock with no door. Redistribution is
  governed by the **licence document**, not the licence key — see below.
- **It can cap concurrent use.** With activations limited to the seat count, one
  key shared around a Discord stops working after the Nth machine.
- **It can make a leak attributable and revocable.** Keys are per purchase, so a
  key found in the wild names its buyer, and rotation kills it immediately.
- **It can gate what comes after the sale** — updates, the CLI, and any hosted
  piece — which is where recurring value lives and where enforcement is real.

### Design

**Benefit setup.** One Polar License Keys benefit per paid tier, prefix
`WAREKIT_`. `limit_activations` equals the seat count: **Pro 1, Team 5**. No
expiry — these are perpetual licences, and an expiring key on a one-time purchase
would be a support burden with no upside. Free Lite gets **no** license key, so
the presence of a key is itself the paid signal.

**Activation.** On first run inside a project the WareKit CLI calls
`POST /v1/customer-portal/license-keys/activate` with the key, our
`organization_id`, a `label` (the machine or project name, so the buyer can tell
their own activations apart in the portal) and `conditions: { major_version }`.
It stores the returned `activation_id` in the project.

**Validation.** Subsequent runs call
`POST /v1/customer-portal/license-keys/validate` with `key`, `organization_id`,
`activation_id` and the same `conditions`.

**Both endpoints are customer-portal endpoints and need no API token.** The CLI
calls Polar directly. Do not build a proxy route on this site for it — there is
no secret to protect, and a proxy would put our uptime in the path of every
buyer's build.

**Validate `benefit_id` on the response.** Polar's docs are explicit that
`organization_id` only scopes keys to the organization, not to a tier. With Lite,
Pro and Team under one org, skipping this check means a Pro key validates
anything Team-only. This is the single easiest thing to get wrong here.

**Failure behaviour: warn, do not brick.** A failed validation prints a clear
message and a link to the portal. It does not delete files, refuse to build, or
phone home on every command. A starter kit that bricks itself when Polar is down
— or when a buyer is on a plane — generates more damage and support load than the
piracy it prevents. Cap validation to once per day, cached locally, and treat a
network failure as a pass.

**Responding to a leak.** A key found in public is rotated from the dashboard or
`POST /v1/license-keys/{id}/rotate`; the old string stops validating at once and
the buyer takes the new one from their portal. Because the repo invitation is
separate, a leaked *repo* shows up instead as an unexpected name in the
collaborator list — worth a periodic look, and a reason to keep `seatMembers`
accurate.

### `LICENSE.md` — the redistribution control

The licence *key* caps concurrent use. The licence *document* is what makes
redistribution a breach, and it is the only layer that addresses the "someone
uploads the kit to a torrent" case at all. Each kit repository carries a
`LICENSE.md`, in the shape commercial boilerplates like MakerKit use:

- **A commercial, non-exclusive, non-transferable licence**, not an open-source
  one. State plainly that it is not OSI-licensed, so nobody assumes MIT by habit.
- **Seats named in the terms, matching the tier and the key's activation cap** —
  Pro one developer, Team five named developers. The legal limit and the
  technical limit must be the same number, or one of them is decoration.
- **Unlimited end products.** The buyer can ship as many of their own projects
  and client projects from the kit as they like. This is the thing buyers
  actually want to know, and burying it costs sales.
- **No redistribution, resale, sublicensing, or publishing the kit's source**,
  in whole or in substantial part, including to a public repository — and no
  sharing with developers outside the licensed seat count.
- **The end product must be a product, not the kit.** Shipping a
  lightly-reskinned WareKit as a competing starter kit is out.
- **Perpetual for the version received**, no warranty, no obligation to support.

Two cautions. Write our own text rather than copying MakerKit's — a licence
document is itself a copyrighted work, and theirs is drafted for their product,
not ours. And have a lawyer look at it before the kits leave `draft`; this spec
fixes the *shape*, not the wording.

### Scope boundary

Both the CLI and `LICENSE.md` live in the WareKit repositories, not in this one.
This spec fixes the **contract** — benefit shape, activation limits, which
endpoints, `benefit_id` checking, warn-don't-brick, and the licence terms above —
and the site's job is to issue the key, store `licenseKeyId` /
`licenseKeyBenefitId`, and show the key on the onboarding page. Implementing
either is separate work in a separate repo and should not block this migration.

## Error handling

The existing webhook discipline is kept verbatim, because it is correct:

- Verify the signature before parsing the body. Reject unverified with 401.
- Cap the body at 64 KiB.
- Dedupe on the unique key; treat a race on it as the duplicate it is.
- Answer **200** for anything that is not our fault (unknown event, missing
  fields, unknown product). Only a **failed write** gets a 500, because a retry
  is the only case where retrying helps.
- Mail is best-effort: the sale is recorded, which is what must not be lost. A
  mail failure is logged and still answers 200.

**The new failure mode** is a buyer who pays but never connects GitHub in Polar's
portal. No `benefit_grant.created` ever fires, so the row sits at `pending`
indefinitely and nobody is told. Today's equivalent failure at least produced an
email explaining the manual path. Mitigations, both required:

1. `PurchaseLedger` surfaces "paid, awaiting GitHub connection" as a visible
   state with an age, not as an indistinguishable `pending`.
2. The confirmation email says plainly that the kit is not delivered until they
   connect GitHub, and links straight to the portal.

`order.refunded` and `benefit_grant.revoked` walk a purchase back rather than
leaving a refunded buyer marked `sent`.

## Testing

Mirrors what exists today; the test suite is the part of this codebase most worth
preserving.

- **Unit** — one file per module: `polar.test.js` (signature verification
  including a tampered body, event routing), `polarEnv.test.js` (the
  default-to-production guarantee), webhook handler tests for the duplicate path,
  the unknown-product path, the refund path, and the write-failure 500.
- **Component** — `DepositCheckout`, `BuyButton`, `catalog-cards`, the onboarding
  page, and the rewired `purchase` analytics event.
- **Sim (`pnpm sim`)** — rewritten against Polar's sandbox. `0-github-token.sim`
  becomes a **benefit-configuration preflight**: assert that every published
  product's `polarProductId` resolves in Polar, and that each kit product has a
  GitHub benefit attached pointing at the repo the Payload record names. This
  replaces the old token preflight and guards the same class of silent failure —
  a misconfiguration that only surfaces when a customer is already waiting.
  Note that `sim` runs through vitest, not `tsx`, per the existing
  `vitest.sim.config.mjs`.
- **Verification gate** — `npx eslint` on changed files, `npx prettier --write`,
  `npx tsc --noEmit`, `pnpm build`, then the code quality reviewer agent.

## Sequencing

The code work splits into four phases. Each ends somewhere the site still builds
and sells, so the migration can stop between any two of them.

| Phase | Work | Done when |
|---|---|---|
| **0** | Manual setup (above): GitHub Free, Polar org + sandbox, GitHub + License Key benefits, products | Both product id sets recorded, both `benefit_id`s noted |
| **1** | `polar.ts`, `polarEnv.ts`, the webhook route, and their unit tests. Nothing wired to a page yet; Creem and Whop still serve traffic | Sandbox `order.paid` writes a purchase row |
| **2** | Schema change (delete the 4 test rows, drop Creem/Whop columns, add Polar ones incl. `licenseKeyId` / `licenseKeyBenefitId`), then repoint `checkout.ts`, `DepositCheckout`, the onboarding page, and the `purchase` analytics event | A sandbox Pro purchase delivers a repo invite **and** a `WAREKIT_` key shown on the onboarding page |
| **3** | Delete the dead modules, routes, components, tests, env vars and `docs/github-token.md`; rewrite the sim suite as a benefit-configuration preflight | `grep -ri 'creem\|whop' src/` returns only the ads-pixel files |

Phase 3's grep is the completion test, and it is deliberately narrow: the Whop
**ads pixel** files are the one expected survivor, and naming that up front stops
a future reader from "finishing the job" by deleting a working ad channel.

## Open items for the implementation plan

1. ~~Confirm the current Creem rate.~~ **Resolved:** this account predates
   2026-05-27 and holds Polar's Early Member rate at 4% + 40¢. The remaining
   action is not a decision but a discipline — sell through the **existing**
   org and never accept a plan upgrade. Both are now Locked Decisions.
2. **Confirm `amwaredotdev` can move to GitHub Free** without losing a feature
   the kit repos rely on (protected branches and code owners are Team-only on
   private repos).
3. **Confirm Polar seat claiming grants the GitHub benefit per member**, not once
   to the payer, in the sandbox before the Team tier goes on sale. The docs say
   benefits are granted to members, not to the billing customer; at $999 for five
   seats this should be proven, not assumed.
4. **Confirm Polar's personal-repo policy is not needed.** It is not, under this
   design — but if the org route is ever abandoned, note that enabling personal
   repos requires contacting Polar *and* accepts write access for every buyer.
5. **Schedule the WareKit CLI licensing work separately.** This spec fixes the
   contract; the CLI lives in the kit repos. Until that lands, license keys are
   issued and displayed but still enforce nothing — the same position as today,
   so the migration does not regress anything, but the anti-piracy benefit is
   not realised until the CLI ships. Worth sequencing before the kits leave
   `draft`.
6. **Draft and review `LICENSE.md` for each kit repo**, to the shape above, in
   our own words rather than MakerKit's, with legal review before the kits leave
   `draft`. This is the only layer that addresses redistribution, so it gates
   launch in a way the CLI does not.
