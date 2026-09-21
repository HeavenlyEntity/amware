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
| Tax | **Collected on our behalf** (confirmed) | Collected and remitted (MoR) |

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
| Repo ownership | **`amwaredotdev` org, already on GitHub Free** | Free collaborators *and* a read-only role; personal repos force write access |
| Free WareKit Lite | A **$0 Whop plan**, not a bespoke claim route | One delivery path; a free claim becomes a real membership and joins the community |
| Lite vs Pro | **Separate repos**, as today. Lite is the blank AMWARE kit: skeleton, welcome, getting-started, branding language. No UI, no build-out | Lite teaches the architecture; Pro implements it |
| Why Lite is gated | To **capture a member**, not to protect code | Blank scaffolding has no extractable value; the invite is what turns a download into someone in `#warekit` |
| Team tier | Our own `seats.ts` / `SeatManager`, unchanged | Whop has no seat primitive matching a 5-account perpetual licence |
| Checkout | Whop **embedded** checkout (`data-whop-checkout-plan-id`) | Already proven on the deposit flow; keeps buyers on our domain |
| Deposits | **Unchanged** | Already Whop; this migration must not disturb them |
| Digital downloads | Deferred — no product uses one | `/access/*` is dead machinery; do not port it |
| Licence keys | Whop membership key, validated via **Retrieve Membership by licence key** | The key already exists per membership |
| Kit architecture | **Turborepo monorepo, MakerKit-shaped**: `apps/web` is theirs, `packages/*` is ours and stays updatable | Separates the customisation surface from the update surface architecturally, not by convention |
| Update channel | `upstream` git remote, `git pull upstream main` on an update branch | The same mechanism MakerKit uses; needs no registry or new infrastructure |
| Licence enforcement | **Repo access is the licence.** No activation cap | Updates are the ongoing value; revoking access stops updates without breaking a running business |
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
| Claims free Lite | `#warekit` | Turns a download into a member — Lite's whole purpose |
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

### Repo access is the licence

Polar ships licence keys with platform-enforced **activation limits**; Whop has no
equivalent, and its key is simply the membership's identifier. That gap looked
like something to build around. The kit architecture removes the need.

**If updates are the ongoing value, and updates come from `upstream`, then the
GitHub collaborator invite is the enforcement mechanism.** It is already built,
in `githubInvite.ts`. Revoke a leaked buyer's access and they stop receiving
`packages/*` improvements, while their `apps/web` — their actual business — keeps
running untouched.

That has three properties no device cap has:

- **Nothing ever bricks.** Warn-don't-brick is not a policy we have to remember;
  it is what the mechanism does.
- **No new service.** There is no activation table, no endpoint of ours in the
  buyer's build path, no uptime obligation on a customer's `pnpm build`.
- **It aligns with the buyer.** The thing being withheld is the thing they want,
  rather than a punishment bolted onto something they already own.

So the licence key's job shrinks to what it is actually good at: **identity and
status.** It names which buyer a leaked copy belongs to, and resolving it to an
inactive membership flags a refunded or cancelled licence. That is validated by
retrieving the membership by licence key — no cap, no activation records, no
table.

**Decision: no activation cap.** Ship status-only validation, and let repo access
carry the enforcement.

### Kit architecture — MakerKit-shaped, and why it is not self-destruct

The idea this replaced was a "self-destruct": the kit rewrites itself into the
buyer's brand and removes its own scaffolding, keeping `upstream` attached for
updates. The instinct — make it theirs, keep updates flowing — is right. The
mechanism fights itself: the more thoroughly a kit rewrites itself, the less any
upstream merge can land, and the update promise dies around release two.

MakerKit's answer inverts it. Nothing is deleted. Instead the repository has two
zones:

```
apps/
  web/            ← the operator's business. 90% of their work. Brand, routes,
                    content, config. They own this outright.
packages/
  netsuite/       ← ours. NetSuite client, auth, record types
  sync/           ← ours. Record sync, queues, retries
  ui/             ← ours. Shared components
  config/         ← ours. Shared eslint / ts / tailwind config
turbo.json
```

The customisation surface is separated from the update surface **architecturally
rather than by convention**, so a buyer can go as deep as they like inside
`apps/web` and `git pull upstream main` still merges. Branding is configuration
in `apps/web/config`, not a find-and-replace across the tree.

What legitimately goes away on setup is small and safe: the kit's own marketing
and demo routes, its README and docs, and anything under `apps/` the operator has
no use for. `packages/*` stays WareKit-shaped forever, and that is precisely what
keeps it updatable — and, per the section above, what makes access worth having.

**Scope: this is a restructure of the kit repositories, not of this site.** It is
real work in its own right and does not block this migration, but the licensing
model above depends on it, so it should be sequenced before the kits leave
`draft`.

**Resolved: separate repos per tier**, which is what the catalogue already does.
GitHub grants access per repository rather than per directory, so this was always
forced; the existing layout is already correct:

| Repo | Tiers |
|---|---|
| `amwaredotdev/warekit-next-netsuite-lite` | Lite (free) |
| `amwaredotdev/warekit-next-netsuite` | Pro, Team (differ only by seat count) |
| `amwaredotdev/warekit-react-netsuite-lite` | Lite (free) |
| `amwaredotdev/warekit-react-netsuite` | Pro, Team |

Whatever else changes: **warn, do not brick.** A starter kit that refuses to build
when the network is down costs more in support and reputation than the piracy it
prevents.

### What Lite actually is

Lite is **not a crippled Pro**. It is the blank AMWARE kit: the Turborepo
skeleton, a welcome, a getting-started guide, and the branding language — no UI
elements and no build-out. Pro is the implementation of the same architecture.

That distinction does real work:

- **Lite is a preview of the architecture, not of the features.** Its value is
  that a developer sees how `apps/web` and `packages/*` relate before paying. A
  Lite that did not share Pro's shape would fail at its only job.
- **Lite's code has no extractable value**, because there is nothing in it to
  extract. So its `LICENSE.md` can be far more permissive than Pro's, and a copy
  of Lite circulating is marketing rather than leakage.
- **Which means Lite is gated to capture a member, not to protect code.** Keeping
  it private and invite-only is what converts an anonymous download into a real
  Whop membership, a person in `#warekit`, and someone the Pro upgrade can reach.
  That is the entire point of routing a free kit through checkout at all, and it
  is worth stating plainly so a future reader does not "simplify" Lite into a
  public repo and quietly delete the top of the funnel.

**A design constraint that follows, for the restructure work:** because Lite and
Pro are separate repos, upgrading is a repo change, and a Lite user's own work
lives in `apps/web` — which in Pro is already built out. The cleaner that seam
is, the cheaper the upgrade. **Push as much of Pro's value into `packages/*` as
possible and keep `apps/web` thin in both repos.** The same architectural
principle then serves twice: it keeps upstream merges clean *and* it makes
Lite → Pro a matter of pointing at new packages rather than restarting.

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

1. ~~Confirm Whop's tax position.~~ **Resolved:** Whop collects tax on our
   behalf. The plan-level machinery backs this up — `collect_tax`, `tax_type`
   (`inclusive` / `exclusive` / `unspecified`) and `POST /plans/{id}/calculate_tax`.
   Set `tax_type` deliberately per plan rather than leaving it `unspecified`.
   One residual worth getting in writing rather than assuming: *collecting* and
   *remitting* are different obligations, and which one Whop performs decides
   whether any VAT registrations sit with us. Ask once, keep the reply.
2. ~~Confirm `amwaredotdev` can move to GitHub Free.~~ **Resolved:** the org is
   on GitHub Free. Collaborator invites now cost nothing, which is what made the
   whole delivery model viable. Note the trade that came with it: protected
   branches, code owners and required reviews are gone on private repos, so the
   kit repos' safety now rests on convention rather than enforcement.
3. **Verify Whop's custom checkout fields reach the webhook payload.** Still
   open, and still the highest-risk assumption in the spec: the whole
   "collect the username at checkout" design rests on it, and Phase 2 is written
   against it. **Prove it in the sandbox during Phase 0**, before any code is
   written. If the field does not survive to the webhook, the fallback is the
   post-purchase onboarding page — which is why Phase 3 keeps that page rather
   than deleting it outright.
4. ~~Decide the activation-cap question.~~ **Resolved: no activation cap.** The
   MakerKit-shaped kit architecture makes repo access the licence — updates are
   the ongoing value, and `githubInvite.ts` already grants and can revoke them.
   The licence key keeps only identity and status. Nothing to build.
5. **Draft and review `LICENSE.md` per kit repo**, lawyer-reviewed before launch.
   This gates the kits leaving `draft`. Two notes. It has a second job now: the
   terms should say plainly that access to updates ends with the licence, since
   that is the enforcement mechanism and should not be a surprise. And **Lite and
   Pro want different licences** — Lite holds no extractable value and can be
   permissive, while Pro's is the commercial licence described above. Writing one
   document for both would either over-restrict the funnel or under-protect the
   product.
6. **Restructure the kit repos into the Turborepo layout** (Licensing → Kit
   architecture). Separate work in the kit repos, not blocking this migration,
   but the licensing model rests on it. The Lite-vs-Pro repo question is
   **resolved** — separate repos, as the catalogue already has them. The live
   constraint for that work is the seam: keep `apps/web` thin in both repos and
   push Pro's value into `packages/*`, so Lite → Pro is an upgrade rather than a
   restart.
7. **Chargebacks cannot claw back a cloned repo.** Whatever the platform, a
   refunded buyer keeps whatever they already forked. Revoking collaborator
   access on refund is worth wiring, while understanding it closes the door after
   the fact rather than preventing the exit.
