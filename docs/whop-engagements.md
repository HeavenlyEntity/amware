# Whop: the engagement deposit

Whop takes the $1,500 deposit that starts a retainer. Creem keeps the kits
and downloads. They never meet.

## How a sale flows

1. A published retainer carries `whopPlanId` (a one-time Whop plan) and
   `depositAmount`. The service card offers **Reserve your start** beside
   the intro call.
2. `DepositCheckout` opens a side sheet and mounts Whop's embedded checkout
   from the plan id alone. No server call first: the plan is the product.
3. Whop charges the card inside the sheet and fires `payment.succeeded` at
   `https://www.amware.dev/webhooks/whop`.
4. The route verifies the Standard Webhooks signature with
   `WHOP_WEBHOOK_SECRET`, records one Purchase (`provider: whop`,
   `whopPaymentId` unique), mails the buyer a receipt with the booking link
   and the owner (`CONTACT_NOTIFY_TO`) a heads-up, and answers 200.

A payment for a plan no service claims is still recorded, with no item and
`fulfillmentStatus: failed`, so it shows up in the admin as something to
look at rather than vanishing.

## Setup and idempotency

Step 6 of the sim creates, once each: the hidden product "Anti-Slop Alec
engagements", one deposit plan per published retainer (found again by
`internal_notes: deposit:<slug>`), and the webhook. It writes each plan id
onto its service. Running it twice changes nothing. It needs `WHOP_API_KEY`
in `.env.local`. Run that file on its own, with the schema push off:

```bash
PAYLOAD_MIGRATING=true pnpm sim sim/6-whop-engagements.sim.test.mjs
```

Both parts matter.

- **Run step 6 alone.** A plain `pnpm sim` runs every file, and the others
  seed the catalogue, place test orders and send real mail.
- **Turn the schema push off.** Outside production, Payload pushes the
  checkout's collection schema to the database every time it starts. This
  database is shared with production, so a push from a checkout whose
  collections differ from production's adds or drops production columns.
  Payload's own `migrate` command sets `PAYLOAD_MIGRATING=true` to skip that
  push, and nothing else reads the variable.

The webhook secret is shown by Whop **once**, on creation; the step writes
it to `.whop-webhook-secret` (git-ignored). Store it as
`WHOP_WEBHOOK_SECRET` in `.env.local` and in Vercel production, redeploy,
then delete the file. Lose it and the only fix is to delete the webhook and
create it again.

## Verify

- `curl -X POST https://www.amware.dev/webhooks/whop -d '{}'` must answer
  **401**.
- `POST https://api.whop.com/api/v1/webhooks/<hook id>/test` with
  `{"event":"payment.succeeded"}` must report `status: 200`. Whop's sample
  payload carries a fake plan, so the route records it as a `failed` Whop
  purchase and mails the sample address; delete that row afterwards.

## Sandbox: testing the whole flow with test cards

Whop's sandbox is a separate account (`biz_ENQ4Ezoxk2a62S`, on
sandbox.whop.com) with its own key, plans and webhook. Locally:

```
WHOP_API_KEY=<sandbox key>
WHOP_WEBHOOK_SECRET=<sandbox webhook secret>
WHOP_ENV=sandbox
NEXT_PUBLIC_WHOP_ENV=sandbox
```

With that set, the same command creates the product and plans on the sandbox and
writes them to `whopSandboxPlanId` (the live `whopPlanId` is untouched: the
database is shared, and a sandbox plan must never reach a real customer),
the cards mount the sandbox embed with a visible "Sandbox" chip, and the
sandbox webhook (`https://my-portfolio.ngrok.app/webhooks/whop`, reachable
with `pnpm dev:tunnel`) lands on the local server. Payments are recorded
with `whopEnvironment: sandbox` and left out of the admin's revenue
figures. Test card `4242 4242 4242 4242`, any future date, any CVC;
`4000 0000 0000 0002` declines.

Production has none of these variables set and so is always live.

## The pixel

Opening the sheet reports `begin_checkout` (`content_type: deposit`).
Nothing reports `purchase` for these: Whop processes the sale and reports it
to the ad platforms itself, and its pixel rejects the duplicate. Kit and
download sales on Creem still report `purchase`. See `docs/whop-events.md`.

## Where things live

|                          |                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Plan ids, deposit amount | Payload → Services → each retainer                                                                                     |
| Product, plans, webhook  | Whop dashboard → `biz_PGSOCOwANQSket`                                                                                  |
| Deposits taken           | Payload → Purchases, `provider: whop`                                                                                  |
| Client code              | `src/lib/commerce/whop.ts`, `src/app/(commerce)/webhooks/whop/route.ts`, `src/components/commerce/DepositCheckout.jsx` |
