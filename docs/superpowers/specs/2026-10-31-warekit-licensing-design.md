# WareKit licensing: one license from Lite to Enterprise

Date: 2026-10-31. Status: draft for Alec's review.

Builds on PR 19 (`claude/hungry-hawking-762203`), which is not merged yet. That PR has the
`checkoutRoute` gate, the Creem checkout action and the Creem webhook this design changes.

## Why

Alec wants to see a customer move from the free kit to Pro, Team and Enterprise, and to know what
each customer is entitled to. Today a purchase is a one-off row tied to one product. An upgrade would
be a second, unrelated row, the seats would stay on the first row, and nothing would show that the
two belong to the same customer.

MakerKit is the reference. It sells through GitHub repo access, with named seats and a pay-the-difference
upgrade page. WareKit keeps all of that and adds two things: a license record that survives upgrades,
and a count of the NetSuite accounts each license is used on.

## Decisions Alec made

- Paid kits move from Whop to Creem. This reverses the 2026-10-30 "kits on Whop" decision. Whop keeps
  engagement deposits.
- A license counts both developers and NetSuite accounts.
- Upgrades charge the difference, as MakerKit does.

## Goals

- One license per customer and kit stack, which moves up tiers in place.
- The admin shows, for each license: owner, stack, tier, seats used and allowed, NetSuite accounts used
  and allowed, and when it last changed tier.
- A Pro buyer can upgrade to Team alone, paying the difference, and keeps their seats.
- Enterprise can be quoted and sold without new code for each deal.
- Refunds move the license back down.

## Non-goals

- Customer accounts or logins. Signed links stay the only authentication, by earlier decision.
- Upgrade campaigns or drip emails. This records the signals. Acting on them comes later. The one automated
  email is the over-limit service notice to the license owner.
- Per-seat add-ons between Team and Enterprise.
- Replacing the kit license terms with enforcement. This tracks honest buyers. Anyone with the source
  can remove a check, so the written terms still protect the code.

## Anti-goals

These would make it a failure even if it worked:

- **A customer's running app or deploy depends on us.** Nothing in a kit may fail, slow down or change
  behaviour because amware.dev or Creem is unreachable, or because a license is over its limit.
- **The Creem API key reaches a buyer's machine.** Creem's license endpoints require `x-api-key`.
- **Sending data the customer did not choose to send.** No hidden telemetry.

## Tiers

| Tier | Price | Developers (GitHub seats) | NetSuite accounts |
| --- | --- | --- | --- |
| Lite | Free | 1, on the Lite repo | Not tracked, no key |
| Pro | $499 | 1 | 1 |
| Team | $999 | 5 | 3 |
| Enterprise | Quoted | Set per deal | Set per deal |

Prices and seats are the live `products` values. Alec decided that an account is an account: any paid license can
use its allowance on the customer's own NetSuite accounts or on clients'. Buyers never have to work out which category
they're in, and a solo consultant can start on Pro. Enterprise is for going past Team's limits, or for custom terms
such as a contract, invoicing or several companies.

A sandbox or Release Preview account shares its production account's number, so it does not use up an
allowance. `1234567_SB1`, `1234567-sb1` and `1234567_RP` all count as `1234567`. Oracle documents the `_SB`
and `_RP` suffixes. The kit's `.env.example` prefers the hyphen form, so both must parse. Any other format
counts as its own account, and an admin can fix a mistake by hand.

## The buyer journey

The rule for every step: one obvious next action, and no chance of paying for the wrong thing or paying twice.
Every limit is explained where it appears, in the customer's words.

| Step | Buyer does | Buyer feels | What supports it |
| --- | --- | --- | --- |
| 1 | Compares tiers on `/products` | "Am I picking wrong?" | Developers and accounts in plain words, "pay only the difference later" |
| 2 | Claims Lite or pays on Creem | "Is this safe, what am I committing to?" | One-time price, "your app never checks a license" |
| 3 | Returns and names a GitHub account | "Did it work?" | Result on the page, Lite username pre-filled |
| 4 | Accepts the invite, runs the kit | Momentum | One line added to `.env`, no separate activation |
| 5 | Hits a limit, or a new hire joins | "How much will this cost me?" | The limit, the price and one button, in the same place |
| 6 | Pays the difference | "Did I lose anything?" | "Your code, repo and key stay the same", confirmed on return |
| 7 | Outgrows Team | "Who do I talk to?" | A message already filled in with their kit and tier |

### Choosing a tier

- The word for a person is **developers**. "GitHub account" and "NetSuite account" side by side will be misread. Rename the
  compare rows in `src/content/site/warekit.js` from "Code seats" to "Developers", add "NetSuite accounts", and make the
  Next and React rows match. Today Next Pro says "collaborator" and React Pro says "account".
- The price line becomes `One-time · 5 developers · 3 NetSuite accounts`.
- Under the NetSuite accounts row: **"Yours or a client's. Sandboxes and Release Preview don't count."** Without it, every
  buyer with a sandbox assumes they need Team, and every consultant assumes they can't buy at all.
- Under the compare table: **"Start with Pro. Move to Team later and pay only the difference."** This removes the fear of
  choosing wrong, and it's the line MakerKit puts on its pricing page.
- Also under the table: **"Your app never checks a license. Nothing stops working if you go over a limit."** It's true by
  the anti-goals above, and it answers the first objection a developer has to a key.
- Enterprise is a line under the table, not a fourth column, so three prices stay easy to compare: **"More than five
  developers or three accounts? Talk to me about Enterprise."** It shows no price, and opens the contact form with the
  kit and tier filled in. It uses the secondary action style. The page's teal stays on the buy button.
- The Team card and product page carry **"Already on Pro? Pay only the difference."** linking to
  `/access/resend?intent=upgrade`. This is what stops most overpayment.
- Help Me Choose gains a third answer to "How many developers need the code?": "More than five". It ends at Enterprise.
- Beside the buy button: **"Full refund within 14 days if you haven't accepted the GitHub invite."** Alec chose this. Source
  code can't be returned once it's cloned, so the invite is the line. Alec checks the invite state by hand when a refund
  is requested.

### Paying and setting up

- The Creem `success_url` is the signed onboarding link, so the browser and the email lead to the same page.
- A Lite customer buying Pro sees their GitHub username pre-filled on onboarding, with the existing "this is my account"
  confirmation. They don't retype it.
- Onboarding ends on the license page's key line. The only step is copying `WAREKIT_LICENSE_KEY=…` into `.env`, beside
  `NS_ACCOUNT_ID`. The "Configure your account" setup step on `/products` says so.

### Lite to paid

Lite customers have no license page, so they need other routes to Pro:

- The claim's on-page result and email each carry one line on what Pro adds, linking to the Pro product page.
- The kit's session docs link to Pro at the point where Pro's difference matters.
- `warekit license status` on a Lite project prints what Pro adds.

There is no nagging. Nothing else in Lite mentions paying.

### The moment of upgrading

The license page shows, in this order: kit and tier, usage, one action. Usage is mono and tabular: `1 / 1 developers`,
`1 / 1 NetSuite accounts`. The action is the page's one teal button, which is what makes it obvious.

- Pro: **"Move to Team · $500.00"**, always visible but quieter until a limit is reached. Beneath it: **"Your code, repo and
  key stay the same. You get 5 developers and 3 NetSuite accounts."** The button goes straight to Creem. There's no modal.
- Team at a limit: **"Talk to me about Enterprise"**. Its link fills the contact subject with kit and tier through a new
  `kitEnterpriseSubject()` in `src/lib/contact-intents.js`. The contact page must accept that subject, which needs checking.
- `seatsFullMessage` currently says "get in touch about a larger licence", and the single-seat page links to `/products`,
  which would charge full price. Both become the actions above.
- Numbers come from the data, not copy, so a price change can't leave a stale "$500.00".

Return from Creem lands on the license page. While the webhook is on its way it says **"Confirming your upgrade. You don't
need to pay again."**, using `PendingRefresh`. Then it says **"You're on Team."** with focus on the add-developer field.

### Links that outlive 30 days

Access links expire after 30 days, but an upgrade usually comes months later. A Pro customer opening their old email today
would meet "This link is invalid or expired", at the moment they're ready to pay.

An expired but correctly signed link keeps working as a door: **"This link has expired. Email a new one to j•••@acme.com"**,
one button, rate limited, sent only to the license owner. A new check beside `verifyAccessToken` reports "expired but
signed", and `verifyAccessToken` itself stays strict. A tampered link keeps today's invalid page.

### Swapping a developer

`seatsFullMessage` tells owners that removing someone on GitHub frees their seat. It doesn't: `addSeat` only appends to
`seatMembers`, and nothing reads GitHub back. A team replacing one developer would be locked out, or pushed to upgrade by
a false limit. The license page gets a Remove action on each developer, using `removeFromRepo`, which frees the seat. The
copy changes to match.

### Going over an account limit

Nothing is blocked. The deploy prints one line:

```
WareKit: account 7654321 is over this license's limit (1 of 1). Nothing is blocked. Your license page has the options.
```

The person deploying may not be the person who pays, so the owner also gets one short email, once per account, with a fresh
signed link. This is a service notice and the only automated email here. The account appears on the license page marked
"Over your limit", with a Remove action for one added by mistake.

### What each screen shows

| Surface | Loading | Empty | Error | Success | Partial |
| --- | --- | --- | --- | --- | --- |
| Upgrade button | "Opening checkout" on the button | n/a | Stays on the page: "Nothing was charged. Try again or get in touch." | Creem checkout | n/a |
| Return from upgrade | "Confirming your upgrade. You don't need to pay again." | n/a | After the checks run out: refresh link and contact, with the same wording | "You're on Team." | n/a |
| Developers | Server result after each add, as today | "Add your first developer" | Field error, as today | "@name invited" | Invite failed: "@name is on the license. I'll send the invite by hand." |
| NetSuite accounts | Static | "Shows up after your first `pnpm ns:deploy`." | n/a | Account list | Over limit, marked as above |
| Key line | Static | Older license with no key: "Get in touch for your key." | n/a | Masked, with Reveal and Copy | n/a |
| Refunded license | n/a | n/a | "This license was refunded." with a contact link | n/a | n/a |

The license page uses the existing `Container` and `.amw` tokens, and its heading follows `DESIGN.md`. It stays one column at
375px, with 44px targets including Remove, Reveal and Copy. Reveal and Copy are real buttons with labels. Results use
`role="status"`, as `SeatManager` does. Copy uses "license" throughout, which means replacing the existing "licence" in every
string these pages touch.

## The license record

Add a Payload collection, `licenses`:

- `ownerEmail`, stored lowercase.
- `stack`: `react-netsuite` or `next-netsuite`, as on `products`.
- `tier`: `lite`, `pro`, `team` or `enterprise`. Always derived, see below. Read-only in the admin.
- `seatOverride`, `accountOverride`: empty except on Enterprise, where both are required.
- `seatMembers`: moves here from `purchases`, with the same shape, because upgrades add purchases.
- `accounts`: an array of `accountId`, `status` (`active` or `over_limit`), `creemInstanceId`,
  `firstSeenAt`, `lastSeenAt`.
- `quoteCreemProductId`: the private Creem product for an Enterprise quote.
- `needsReview`: a checkbox for disputes, partial refunds and anything a person should look at.
- `tierChangedAt`.

Add to `purchases`:

- `license`: relationship to `licenses`.
- `grantsTier`: the tier this row gives.
- `creemEnvironment`: `production` or `sandbox`, like `whopEnvironment`.
- An index on `licenseKey`, because the reporting route looks up by key.

Add to `products`:

- `netsuiteAccounts`: allowance for the tier. Missing means 1, the same rule `seatLimit` uses.
- `creemUpgradeProductId`: on a Team row, the Creem product for Pro to Team on that stack.
- `creemSandboxProductId`: the test-mode product, like `whopSandboxPlanId`.
- `creemUpgradeSandboxProductId`: the test-mode upgrade product.

The `enterprise` tier exists only on licenses. It gets no `products` row and no change to the
`products.tier` enum, so `editionStates` and the pricing cards are untouched.

### How a tier is decided

`tier` is the highest `grantsTier` among the license's purchases with status `paid`, recomputed whenever
one of those rows changes. A refund therefore needs no history table: mark the row refunded and recompute.

Limits follow the tier: the override if there is one, otherwise the value on the `products` row for that
stack and tier. The number on the pricing page and the number enforced stay the same one, as `seats.ts`
intends today.

### Which license a purchase joins

1. If checkout metadata carries a `licenseId`, it joins that license. Our server writes that metadata, so
   it can be trusted.
2. Otherwise, it joins the license with the same email and stack only if it raises the tier. A free Lite
   claim followed by a Pro sale under that email becomes one license.
3. Otherwise, it starts a new license. A second Pro on the same email is a second license, not a wasted
   purchase.

A Pro owner who pays full price for Team under the same email joins and moves up, having overpaid by the
difference. The webhook sets `needsReview` so Alec can refund it. Licenses split across two emails are merged by
hand in the admin.

## Selling kits on Creem

- `checkoutRoute` returns `creem` for any kit with a `creemProductId`, and stops reading `whopPlanId` for
  products. Services keep their deposit logic.
- `editionStates`, `pricingTable` and the product page follow that gate. Tests that pin "a kit with only
  a Creem id is not on sale" flip.
- The Creem checkout action sends kits to the onboarding page. Digital products keep `/checkout/success`.
- The webhook already creates kit purchases, reads `license_keys`, and handles seats. It gains the license
  logic above.
- The Whop webhook's kit branch stays dormant. It shares a file with deposits, and no Whop kit sale exists.

**Known gap.** The Creem webhook emails a signed `/checkout/onboarding?r=…&s=…` link, but the page only reads
Whop's `ref` and `payment_id`, and `completeOnboarding` in `src/lib/commerce/onboarding.ts` has no caller. A
Creem kit buyer would land on the manual state. The page must accept the signed link and use that action.
The runbook's "delete `completeOnboarding`" no longer applies.

**Funnel events.** Kits lose Whop's pixel and checkout events. The Creem path must report the same seven
funnel events where they still make sense, with the real sale amount. Creem's hosted checkout means
checkout-page events cannot fire on our domain, and the design accepts that.

## The license page

`/access/seats/<token>` keeps its URL and becomes the page for the whole license: tier, seats, NetSuite accounts,
the key and the upgrade button. The token gains one optional `licenseId` claim, because a new Enterprise license has no purchase yet. Otherwise the page reaches the license through the purchase.

- Every paid kit buyer now gets this link. Today only multi-seat buyers do, so a Pro buyer could not upgrade.
- `/access/resend` sends kit buyers here. With `intent=upgrade` its heading and copy talk about upgrading.
- `addSeat` reads seats and limits from the license.

## Upgrades

- **Lite to Pro or Team:** a normal purchase at full price, which joins by email. Lite and the paid kits are
  different repos, so the buyer goes through onboarding and is invited to the paid repo. The Lite username
  is not copied into `seatMembers`.
- **Pro to Team:** a separate Creem product per stack at the difference, $500 today, set in
  `creemUpgradeProductId`. The upgrade action passes `licenseId` in metadata. It uses the Team row as the item
  and refuses if the license is already at or above Team. The webhook's product-mismatch check accepts this
  id for an upgrade. The repo is the same, so no invite is needed. Seats simply open up.
- **Enterprise:** Alec creates the private Creem product, then sets `quoteCreemProductId` and both overrides
  on the license, creating the license first if the customer is new. The admin shows a signed checkout link
  for that license to send by hand. The webhook treats that product the same way, granting `enterprise`. The
  Creem product can't be a plain payment link, because a webhook without our metadata is ignored.

Creem bundles are not used. Their self-service upgrades are documented for subscription tiers only.

**One key for the life of the license.** Each new key on upgrade would add a step for the customer and a confusing
Creem email. So tier products issue keys with unlimited activations, upgrade products issue none, and the license
table enforces the limits. Nothing changes in the customer's `.env` when they move up. Creem still records every
activation. An Enterprise quote issues a key only for a customer who doesn't have one.

## Refunds and disputes

The webhook handles `refund.created` and `dispute.created`, which it ignores today. Field names must be
confirmed in Creem's test mode.

- Full refund: set the purchase to `refunded` and recompute the tier. If no paid tier is left, the repo
  collaborators are handled with `removeFromRepo` behind the existing `WAREKIT_REVOKE_ON_DEACTIVATE` flag,
  logged only while the flag is off. Remember another license may still cover the same person.
- Refund of an upgrade: the tier falls back to the earlier one. Seats above the new limit stay, and
  `needsReview` is set.
- Refund of the original Pro while the upgrade stays paid: the tier stays Team under the derivation rule, and
  `needsReview` is set. Alec issues refunds himself, so he should refund both or neither. Rare enough that it
  doesn't justify linking purchases to each other.
- Partial refund or dispute: no tier change. Set `needsReview` and log it.

## Counting NetSuite accounts

This needs changes in `amwaredotdev/warekit-cli` and in the kit repos. The website route ships first.

**Route.** `POST /licenses/report`, in the `(commerce)` route group, takes the license key, the account ID and the
kit. It is public and needs rate limiting.

1. Find the purchase by `licenseKey`, then its license. An unknown key or a license with no paid tier returns
   `invalid`.
2. Normalise the account ID.
3. If the account is listed, update `lastSeenAt` and return `ok`.
4. If there is room, call Creem's activate on the license's key with the account ID as `instance_name`, store the
   instance id, and return `ok`.
5. If there is no room, record the account as `over_limit`, email the owner the first time, and return `over_limit`.
   That row is the upgrade signal in the admin.

If Creem fails at step 4, record the account anyway and retry the activation next time. The license table is
the authority, and Creem's count is a second record.

**CLI.** `warekit license status` reads `WAREKIT_LICENSE_KEY` and prints the tier and usage, or what Pro adds on a
Lite project. The CLI calls amware.dev and never Creem. There is no activate command, because a separate step is
one more thing to forget.

**Kits.** `ns:deploy` in `tooling/shared/deploy.mjs` already knows `NS_ACCOUNT_ID`. After a successful deploy it
reports using `WAREKIT_LICENSE_KEY` from `.env`. The report is short-timeboxed, cannot fail the deploy, and prints one
line at most. With no key on a paid kit it prints a one-line reminder. It never runs at app runtime, and nothing is
blocked at any limit. Each kit's docs and the license terms state that the account ID is sent and why.

Every Next buyer reaches this. The kit's README lists `pnpm ns:deploy` as a deploy step, and OAuth sign-in needs
the userinfo RESTlet it deploys. A customer who deploys once and never again still gets counted, but `lastSeenAt`
is only a rough signal, not proof the account is still in use.

## Creem facts this rests on

Documented:

- Keys are added as a delivery item with an activation limit and optional expiry.
- `checkout.completed` carries `license_keys`.
- Activate takes `key` and `instance_name`, and requires `x-api-key`.
- One key is issued per unit.
- `refund.created` and `dispute.created` exist.

Not documented, so to prove in Creem test mode before building Phase 1:

1. A key is issued on a one-time product with no expiry. A Creem blog post says so, the docs do not.
2. A key with no activation limit accepts repeat activations, and Creem's purchase email for a kit reads sensibly
   alongside ours. A customer shouldn't get two conflicting sets of instructions.
3. The `refund.created` payload includes something that matches `creemOrderId`, and whether Creem changes the
   key's status on refund.
4. A checkout for the upgrade product returns our metadata.

If 1 fails, the plan changes: our own generated key replaces Creem's, and the license table stays the same.

These four use a throwaway webhook receiver, not the site, with Alec completing the test checkouts.

## Testing without touching real sales

The database is shared and `pnpm dev` is banned, so the site is tested on a Vercel preview. This copies how Whop is
already handled in `src/lib/commerce/whopEnv.ts`:

- A client-safe `creemEnv.ts` reads `NEXT_PUBLIC_CREEM_ENV` and `CREEM_ENV`, and unset means production. It picks the
  live or sandbox product id. `checkoutRoute` and the Creem checkout action use it, for digital products too.
- The preview gets those variables, a test-mode API key and webhook secret.
- A kit row published with only a sandbox id can't be bought in production, because the gate finds no live id. Alec
  publishes it, since publishing stays his call.
- Sandbox purchases are stored with `creemEnvironment: sandbox`. `PurchaseLedger` excludes them, as it does Whop's.
  They do create real `purchases` and `licenses` rows in the shared database, so the test ends by deleting them.
- The one thing test mode cannot show is the live key and webhook pair. The first real sale is a small live run with
  Alec, using a discount code if Creem still fires the webhook for it, followed by a refund test.

## Constraints

- The database is shared between dev and production. Never run `pnpm dev`, or `pnpm sim` without a file path. Any
  Payload boot needs `PAYLOAD_MIGRATING=true`.
- New tables and columns are created by reviewed SQL with Alec's approval before merge, following
  `docs/superpowers/plans/2026-10-30-products-split.sql`. A new collection also needs its column on
  `payload_locked_documents_rels`, plus RLS on and API grants revoked as in `2026-10-30-close-public-tables.sql`.
- `payload generate:types` is broken, so hand-edit `src/payload-types.ts`.
- Do not publish products or send real purchases without Alec.
- Creem products and API keys must be in the same mode.

## Existing data

Production has two kit purchases: one free claim on React Lite and one paid Next Pro, both Creem-side, and no Whop
kit rows. All kit products are `draft`, and no row has a license key. The SQL or a one-off script creates a
license for each and copies `seatMembers`. The paid row has no key, so that license can't report accounts until it
is given one. The legacy `warekit` product row has no stack or tier and is ignored.

## Build order

1. **Prove Creem:** the four checks above in test mode.
2. **Website:** license record, kits on Creem with the onboarding fix, license page, upgrades, refunds. Useful alone.
3. **Accounts:** `/licenses/report`, CLI commands, kit tooling.

## Before any paid kit goes on sale

- **Kit license files.** Every kit's `LICENSE` is still a placeholder. Real terms must cover seats, accounts, the 14-day
  refund, and the account ID being reported. They must also say that client work is allowed within the account allowance.
  My assumption for the lawyer: deploying into a client's NetSuite account is allowed, but handing a client the kit's
  source repo is not. The runbook calls for a lawyer's review.
- Create the Creem products per tier and stack, with key delivery and no activation limit, plus the two upgrade
  products with no key.
- React Pro and Team stay off sale: `warekit-react-netsuite` does not exist.
- Update `docs/superpowers/plans/2026-09-22-whop-deploy-runbook.md`, whose kit steps assume Whop.

## Left to the builder

- Rate limiting for `/licenses/report` and the expired-link email.
- Admin list columns and filters beyond the goals above.
- Seat and account arrays stay read-then-write, like `seatMembers` today. A race can only overshoot a limit by one,
  and it blocks nothing.

## My calls for Alec to check

- One key for the life of a license, with limits enforced by our table instead of Creem's.
- No separate activation step: the key is one line in `.env`.
- Enterprise stays a line under the compare table, not a fourth column.
- The owner gets one email per account that goes over the limit.
- Owners can remove a developer on the license page, because today's "remove them on GitHub" copy isn't true.
- A second purchase at the same tier starts a new license.
- Reporting happens after deploy, and never blocks anything.
- `tier` is derived from purchases, and our table outranks Creem's activation count.
- Lite gets a license record but no key.
- Testing runs on a Vercel preview with sandbox ids, copying the Whop setup, and writes test rows that get deleted.
- Refunding an original Pro while its upgrade stays paid keeps Team and flags the license for review.
