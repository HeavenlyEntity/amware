# Whop Consolidation — one platform for kits, services and community — Design Spec

**Date:** 2026-09-20
**Status:** Draft for review
**Author:** Alec M (with Claude)
**Supersedes:** `2026-06-08-payload-commerce-b2-design.md` (Creem.io checkout) and `2026-09-20-polar-migration-design.md` (the Polar route, rejected — see below).

## Goal

Retire **Creem** and run the whole business on **Whop**: the kits, the digital
guide, the courses, the engagement deposits, and — the part that is new — a
**community** that connects them.

Three outcomes:

1. **One platform, one ledger, one webhook.** Today commerce is split across
   Creem and Whop for no reason a customer can see.
2. **Customer acquisition becomes a system, not a hope.** Whop's marketplace,
   affiliates, reviews and community turn the free kit into the top of a funnel
   that ends at a fractional-CTO engagement.
3. **Fulfilment gets simpler, not more magical.** Whop plans carry custom
   checkout fields, so the GitHub username is collected *during* checkout and
   `githubInvite.ts` — code that already works — fires straight off the webhook.

## Why Whop and not Polar

The Polar route was designed in full before being rejected; that spec is retained
as a superseded document because its research is the argument. In short:

| | Whop | Polar |
|---|---|---|
| Human services (CTO, advisory, coaching, mentoring, web dev) | **First-class** — its own solution category | **Prohibited by the AUP** |
| Fee, domestic card | **2.7% + $0.30** | 4% + 40¢ (the Early Member rate) |
| International / FX | +1.5% / +1% | +1.5% |
| GitHub repo access | None — **we keep our own code** | Native benefit |
| Licence keys | Membership key + `checkAccess` | Native, with activation limits |
| Community: chat, forums, DMs, notifications | **Native and embeddable** | None |
| Courses | Native (`Experience`) | None |
| Affiliates / referrals | **Native** | None |
| Discovery | **Marketplace, 22M MAU, free to list** | None |
| Custom checkout fields | **Yes** (`plan.custom_fields`) | Yes |
| Merchant of Record / tax | **Unconfirmed — see Open items** | Yes, stated |

On real prices, WareKit Pro at $499 costs **$13.77** on Whop against **$20.36** on
Polar; Team at $999 costs **$27.27** against **$40.36**.

The decisive point is not the fee. It is that **Polar structurally cannot host
half the business.** Its Acceptable Use Policy states that "if your company's
primary offering is human services … the Services are not designed for and should
not be used by you," and the violation path is offboarding plus refunding the
offending payments. A Polar community would be a community of people who can
never buy the main offering.

Polar's single advantage — automated GitHub invites with an OAuth-verified
username — replaces `src/lib/commerce/githubInvite.ts`, which ships invitations
today. It is a convenience swap for code we already own. Whop's services support
and community layer are capabilities that cannot be rebuilt cheaply.

**We were optimising for deleting code. The right thing to optimise for is the
funnel.**

## Migration risk: low, and mostly already paid

Measured against the production database on 2026-09-20:

| | Count | Detail |
|---|---|---|
| `purchases` rows | 4 | **all test data** |
| — Creem | 2 | `@resend.dev`; one $499, one $0 free claim |
| — Whop | 2 | sandbox, both `fulfillmentStatus: failed` |
| Live subscriptions | **0** | no row has `creemSubscriptionId` |
| WareKit products | 6 | **all `draft`** — never sold |
| Published products | 1 | `switch-clone-quick-key-rotation-guide` (digital, **no download file attached**) |
| Published services | 3 | `advisor`, `embedded-cto`, `fractional-cto` — already on Whop |

No real customers, no live subscriptions, and **the services are already on Whop**
— so half this migration is simply "stop having a second provider." The four test
rows are deleted as part of the schema change: no parallel run, no grandfathering,
no back-compat columns.

## Locked Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Platform | **Whop for everything.** Creem retired | Whop takes services *and* kits; Creem takes neither well |
| GitHub delivery | **Keep `githubInvite.ts`** | It works today; Whop has no repo benefit to replace it |
| GitHub username capture | **At checkout**, via `plan.custom_fields` | Removes the whole post-payment "come back and tell us" failure mode |
| Collaborator role | **Read** (`permission: 'pull'`) | Buyers clone and fork; they never push to the product |
| Repo ownership | **`amwaredotdev` org on GitHub Free** | Free collaborators *and* a read-only role; personal repos force write access |
| Free WareKit Lite | A **$0 Whop plan**, not a bespoke claim route | One delivery path; a free claim becomes a real membership and joins the community |
| Team tier | Our own `seats.ts` / `SeatManager`, unchanged | Whop has no seat primitive matching a 5-account perpetual licence |
| Checkout | Whop **embedded** checkout (`data-whop-checkout-plan-id`) | Already proven on the deposit flow; keeps buyers on our domain |
| Deposits | **Unchanged** | Already Whop; this migration must not disturb them |
| Digital downloads | Deferred — no product uses one | `/access/*` is dead machinery; do not port it |
| Licence keys | Whop membership key, validated via **Retrieve Membership by licence key** | The key already exists per membership |
| Activation cap | **Ours to build** — Whop has no device-limit primitive | Honest gap vs Polar; see Licensing |
| Redistribution control | A **`LICENSE.md`** per kit repo | Legal terms govern redistribution; the key governs concurrent use |
| `purchase` pixel event | **Stop firing it entirely** | Whop records its own sales and rejects duplicates — now that every sale is a Whop sale, we should fire none |
| Community | Membership-gated **channels + forum**, Chat Element embedded on `amware.dev` | Access follows the purchase; no entitlement code of ours |
| Idempotency | Whop payment id, unique on `purchases` | Already the discipline on the Whop webhook |
| Schema change | Payload's schema push | No `src/migrations` directory exists, and no data survives the change |

## Non-goals

- Porting historical Creem rows. They are test data and get deleted.
- Rebuilding the deposit flow. It already works and is already on Whop.
- Matching Polar's OAuth-verified GitHub identity. We keep the typed-username
  confirm, which is weaker and is a known, accepted trade.
- Building courses or the marketplace listing in this migration. Both become
  possible; neither is in scope here.

## Architecture

```
(site) kit / guide page
  └─ embedded Whop checkout   <div data-whop-checkout-plan-id="plan_…">
        plan.custom_fields: [ "GitHub username" ]      ← asked BEFORE payment
                                                           │ buyer pays
  Whop ──payment.succeeded──► POST /webhooks/whop      [existing route, extended]
        ├─ verify signature, dedupe on whopPaymentId (unique)
        ├─ resolve plan → product|course|service
        ├─ create Purchase (email, item, amount, licenceKey, githubUsername)
        └─ branch on item type:
             ├─ boilerplate → inviteToRepo({ repo, username })   [githubInvite.ts]
             │                  ok      → fulfillmentStatus 'sent',  store inviteUrl
             │                  failure → fulfillmentStatus 'pending_invite',
             │                            buyer gets the manual-path email
             └─ service     → deposit receipt + owner notification,
                              fulfillmentStatus 'not_required'    [unchanged]

  Whop membership grants community access automatically:
        Lite   → #warekit          Pro  → #warekit + #pro-support
        Team   → + private channel  Engagement → 1:1 support chat

(site) /community   ← Whop Chat Element, themed, on our own domain
```

The deposit half of this diagram is what runs in production today. The kit half is
the same shape, which is the point: one webhook, two branches.

## Data model

### `purchases`

Only the **Creem** id family is removed. The Whop columns are already correct and
already carry production traffic.

| Removed | Added | Unchanged |
|---|---|---|
| `creemOrderId`, `creemProductId`, `creemRequestId`, `creemSubscriptionId`, `creemTransactionId` | `whopPlanId`, `whopMembershipId` | `whopPaymentId` (**unique** — the idempotency key), `whopEnvironment` |
| `accessTokenJti` | — (access links retired) | `githubUsername`, `githubRepo`, `githubInviteUrl`, `seatMembers`, `licenseKey`, `fulfillmentStatus` |

`provider` is **dropped**. With Creem gone there is one provider, and a column
that can only hold one value is a lie that costs a reader time. (Note the
contrast with the superseded Polar spec, where keeping it was correct — there,
two providers really did coexist.)

`licenseKey` stays, now sourced from the Whop membership rather than Creem.

`admin.listSearchableFields` becomes `['email', 'githubUsername', 'whopPaymentId']`.

### `products` / `courses`

`creemProductId` → `whopPlanId` + `whopSandboxPlanId`, matching the dual-id pattern
`services` already uses and `whopEnv.ts` already resolves. `githubRepo` and `seats`
are unchanged and still drive delivery.

### `services`

**Untouched.** `whopPlanId`, `whopSandboxPlanId` and `bookingUrl` stay exactly as
they are. The only edit is deleting the unused `creemProductId` field, which no
service has ever carried.

## Components

**Changed**

- `src/app/(commerce)/webhooks/whop/route.ts` — the one substantive change. It
  grows from "record a deposit" to "record a sale, then fulfil by item type." The
  deposit branch keeps its current behaviour byte for byte; the boilerplate branch
  calls `inviteToRepo` and is lifted from the Creem route, which already does
  exactly this.
- `src/lib/commerce/checkout.ts` — the Creem session call goes. Kits move to the
  embedded checkout element, the same mechanism `DepositCheckout.jsx` already uses,
  so most of this module is deleted rather than rewritten.
- `src/components/commerce/BuyButton.jsx` — redirect-to-Creem becomes the Whop
  embed.
- `src/lib/commerce/whopEnv.ts` — `depositPlanId()` generalises to `planId()` and
  serves products and courses as well as services. Its production-by-default rule
  is kept exactly; it is the safest thing in the commerce layer.
- `src/lib/commerce/fulfillment.ts` — `sendAccessLinkEmail` removed. The
  boilerplate confirmation email keeps **all** its branches, including "I could
  not send the invitation," because we own the invite again and that failure is
  real.
- `docs/whop-events.md` — every sale is now a Whop sale, so the documented rule
  "never fire `purchase` for a sale Whop processed" means we fire **none**. That
  is a deletion, not a rewiring.

**Kept — and this is the point of choosing Whop**

`githubInvite.ts`, `githubUsername.ts`, `GithubAccountField.jsx`, `seats.ts`,
`addSeat.ts`, `SeatManager.jsx`, `whop.ts`, `whopEnv.ts`, `DepositCheckout.jsx`,
`BookCallButton.jsx`, `calLink.ts`, `GITHUB_TOKEN`, and the whole Whop analytics
module. None of it moves.

**Deleted**

`creem.ts`, `creemPriceEndpoint.ts`, `webhooks/creem/route.ts`, `accessToken.ts`,
`onboardingLink.ts`, `claim.ts`, `app/(site)/access/*`, `ClaimFreeKit.jsx`,
`fields/creem/*`, `TrackPurchase.jsx`, and their tests.

`app/(site)/checkout/onboarding/` loses its reason to exist as a *gate* — the
username is collected before payment — but is worth keeping as a plain thank-you
page showing the licence key, the Discord link and the CLI command. It no longer
needs a signed return URL.

**Env removed:** `CREEM_API_URL`, `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`,
`ACCESS_LINK_SECRET`. **Added:** none — `WHOP_API_KEY`, `WHOP_WEBHOOK_SECRET`,
`WHOP_ENV`, `NEXT_PUBLIC_WHOP_ENV` and `GITHUB_TOKEN` all already exist.

## Community — the actual design

This is the reason the platform choice went the way it did, so it gets specified
rather than gestured at.

### Primitives Whop provides

An **Experience** is "a feature or content module within a product, such as a
chat, course, or custom app." A **channel** is "a shared chat room connected to
products and memberships." That sentence is the whole design: **membership is the
access-control list.** There is no entitlement code of ours in this at all.

Around that: forums (rich text, attachments, polls, reactions), DMs, 1:1 support
chats, push notifications scoped per experience or per user, reviews, affiliates,
and a **Chat Element** that embeds in our own pages with our own theming.

### The ladder

| Someone who… | Lands in | Purpose |
|---|---|---|
| Claims free Lite | `#warekit` | Turns a download into a member |
| Buys Pro | `+ #pro-support` | Support that others can read; answers compound |
| Buys Team | `+ private channel` | Seat holders together |
| Books an engagement | 1:1 support chat | The chat *is* the engagement's workspace |

### Why this is the acquisition system

The free kit currently produces an email address. Under this design it produces a
**member** — someone in a room where they ask NetSuite questions for three months
before they ever need a fractional CTO. When they do, they already trust the
answer. That is the path from $0 to a $1,500 deposit, and it is the thing the
original brief asked for in the words "easier to get customers through the
customer acquisition process."

Two compounding effects worth designing for deliberately:

- **The forum is a knowledge base.** Every answered question reduces repeat
  support and is public surface area for search.
- **Affiliates make buyers into distributors.** A kit buyer who refers another
  developer is the cheapest acquisition channel available.

### Scope boundary

Phase 4 below sets the community up and embeds it. Courses, the marketplace
listing and the affiliate programme are **deliberately not in this spec** — each
is its own piece of work, and each is unblocked by this one rather than required
by it.

## Licensing and leak control

The threat model and the `LICENSE.md` shape carry over unchanged from the
superseded Polar spec, which should be read for the full reasoning. In summary: a
licence key cannot stop source redistribution, because a buyer who clones the repo
holds the source. It can cap concurrent use, make a leak attributable, and gate
the CLI and updates. **Redistribution is governed by the licence document.**

`LICENSE.md` per kit repo: commercial and explicitly not OSI; seats named in the
terms matching the tier; unlimited end products; no resale, sublicensing or
republication of the source; the end product must be a product rather than a
reskinned kit; perpetual for the version received, no warranty. Written in our own
words rather than copied from MakerKit — a licence document is itself a
copyrighted work — and lawyer-reviewed before the kits leave `draft`.

### What changes by choosing Whop, stated honestly

Polar ships licence keys with **activation limits**: cap a key at N devices and a
shared key stops working at machine N+1, enforced by the platform. **Whop has no
equivalent.** Its key is the membership's identifier, validated by retrieving the
membership by licence key and checking its status.

So on Whop the options are:

1. **Validate status only.** The CLI checks the key resolves to an active
   membership. This catches refunded and cancelled buyers, not sharing. Cheap,
   and strictly better than today's display-only key.
2. **Build the activation cap ourselves.** A small table keyed by licence key
   recording activation ids, capped at the tier's seat count, behind an endpoint
   on this site. Real enforcement, and genuinely our code to run and keep up.

**Recommendation: ship (1) with the migration and treat (2) as a separate
decision once there is evidence of sharing.** Building a device-cap service before
a single kit has sold is speculative work against an unmeasured problem, and the
`LICENSE.md` plus per-buyer attributable keys cover the realistic early cases.

Whichever is chosen: **warn, do not brick.** A starter kit that refuses to build
when the network is down costs more in support and reputation than the piracy it
prevents.

## Error handling

The existing Whop webhook's discipline is correct and is kept verbatim: verify
before parsing, cap the body at 64 KiB, dedupe on the unique payment id, answer
**200** for anything that is not our fault, **500** only for a failed write
because that is the one case where a retry helps, and treat mail as best effort
since the sale is what must not be lost.

The boilerplate branch adds one rule, inherited from the Creem route:
**`inviteToRepo` never throws and never fails the webhook.** GitHub being
unreachable says nothing about whether the sale was good. Every failure comes back
as a value, the order is recorded, `fulfillmentStatus` becomes `pending_invite`,
and the buyer gets the email describing the manual path. That email already exists
and already tells the truth about which case it is in.

Collecting the username at checkout removes the largest failure mode in the
previous design — a buyer who pays and never returns to name their account — and
replaces it with a smaller one: a typo'd username. That is what
`githubUsername.ts`'s lookup and the avatar confirm are for, and both survive.

## Testing

- **Unit** — the extended Whop webhook gets tests per branch: deposit
  (unchanged behaviour, asserted), boilerplate success, boilerplate invite
  failure → `pending_invite`, duplicate payment id, unknown plan, failed write →
  500. `whopEnv.planId()` keeps its production-by-default test.
- **Regression** — every existing deposit test must pass **untouched**. They are
  the alarm for the half of commerce this migration is not supposed to disturb.
- **Component** — `BuyButton` with the Whop embed, `catalog-cards`, `SeatManager`,
  `GithubAccountField`.
- **Sim (`pnpm sim`)** — `0-github-token.sim` stays as-is; it is the right
  preflight again now that we own the invite. `3-checkout` and `5-free-claim` are
  rewritten against Whop's sandbox. Sim runs through vitest, not `tsx`, per
  `vitest.sim.config.mjs`.
- **Gate** — `npx eslint` on changed files, `npx prettier --write`,
  `npx tsc --noEmit`, `pnpm build`, then the code quality reviewer agent.

## Sequencing

| Phase | Work | Done when |
|---|---|---|
| **0** | Whop dashboard: create the 8 product plans + sandbox twins, add the "GitHub username" custom field to each kit plan, downgrade `amwaredotdev` to GitHub Free | Both plan id sets recorded; a sandbox checkout shows the username field |
| **1** | Schema: delete the 4 test rows, drop the Creem columns and `provider`, add `whopPlanId` / `whopSandboxPlanId` to products and courses | Payload boots clean; the deposit flow still records |
| **2** | Extend the Whop webhook with the boilerplate branch, lifting `inviteToRepo` wiring from the Creem route. Repoint `BuyButton` / `checkout.ts` to the embed | A sandbox Pro purchase sends a real repo invite |
| **3** | Delete the Creem modules, route, `/access/*`, `ClaimFreeKit`, `TrackPurchase`, `fields/creem/*`, their tests and env vars | `grep -ri creem src/` returns nothing |
| **4** | Community: channels per tier, forum, Chat Element embedded at `/community` | A sandbox Lite claim lands the buyer in `#warekit` |

Phases 0–3 are the migration. **Phase 4 is the reason for it** and should not be
deferred indefinitely — without it this is a cheaper Creem, which is a much
smaller prize than the one that justified the change.

The completion grep is **`creem` only**. Every `whop` hit is supposed to be there.

## Open items

1. **Confirm Whop's tax position — this is the one material unknown.** Whop's
   `Plan` object carries `collect_tax` ("based on the account's tax
   configuration"), `tax_type` (`inclusive` / `exclusive` / `unspecified`) and a
   `POST /plans/{id}/calculate_tax` endpoint, so Whop clearly *collects* tax. What
   the docs do **not** state is whether Whop acts as merchant of record and
   **remits** it, the way Polar states plainly. If it does not, EU digital-goods
   VAT registration lands on us and can exceed the 1.3% fee saving. Ask Whop
   directly before the kits leave `draft`.
2. **Confirm `amwaredotdev` can move to GitHub Free** without losing something the
   kit repos rely on — protected branches, code owners and required reviews are
   Team-only on private repos.
3. **Verify Whop's custom checkout fields reach the webhook payload.** The whole
   "collect the username at checkout" design rests on it. Prove it in the sandbox
   in Phase 0, before Phase 2 is written.
4. **Decide the activation-cap question** (Licensing, above) on evidence rather
   than in advance. Default: status-only validation.
5. **Draft and review `LICENSE.md` per kit repo**, lawyer-reviewed before launch.
   This gates the kits leaving `draft` in a way the CLI does not.
6. **Chargebacks cannot claw back a cloned repo.** Whatever the platform, a
   refunded buyer keeps whatever they already forked. Revoking collaborator
   access on refund is worth wiring, while understanding it closes the door after
   the fact rather than preventing the exit.
