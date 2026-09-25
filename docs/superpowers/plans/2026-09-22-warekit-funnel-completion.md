# WareKit Funnel Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the WareKit funnel from "mostly migrated" to "a stranger can find a kit, claim or buy it, receive it, set it up and upgrade — without the founder touching anything."

**Architecture:** The Whop consolidation (Tasks 2–7, branch `whop-consolidation`) moved checkout and delivery onto Whop. This plan closes the gaps a funnel review found in that work — Team seats, the payment-to-onboarding handoff, refund revocation — and sequences everything still outstanding, re-basing the 2026-09-11 WareKit delivery backlog onto Whop.

**Tech Stack:** Next.js 16 App Router, React 19, Payload 3 on Postgres, Whop (`@whop/checkout/react`, webhooks), GitHub REST, Resend, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-20-whop-consolidation-design.md` is binding. `docs/superpowers/plans/2026-09-11-warekit-delivery/` is the funnel's acceptance contract, written against Creem and re-based below.

## Global Constraints

Everything in `2026-09-20-whop-consolidation.md` § Global Constraints, plus:

- **Destructive external actions default off.** Anything that removes a person's access ships behind an env flag that defaults to log-only.
- **Hand-edit `src/payload-types.ts`** and prove it with `npx tsc --noEmit`. `pnpm generate:types` fails in every checkout (the known tsx/ESM defect).
- **Every existing deposit test passes unedited.**
- **Do not edit earlier plan files.** Corrections to them are recorded here.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## The funnel today

| Stage | What the buyer does | State on 2026-09-22 |
|---|---|---|
| **Discover** | Finds WareKit via search, content, Whop ads, marketplace, a referral | Ads pixel live. **No Whop marketplace listing, no affiliate programme.** |
| **Evaluate** | Reads the storefront, pricing, product page | Pages exist. **All six kits are `draft`**, so nothing is listed. |
| **Claim / buy** | Opens the Whop embed, gives a GitHub username, pays or claims $0 | Embed built (Task 7). **Buy buttons still gate on `creemProductId`**, so none render for a Whop-planned kit. |
| **Deliver** | Gets a repo invitation and an email | Webhook invites (Task 6). **`GITHUB_TOKEN` is unset in production**, so every sale takes the manual path. **Team buyers cannot reach their other four seats.** |
| **Activate** | Lands on an onboarding page, clones, runs the CLI, joins the community | **The embed never routes the buyer to onboarding.** Onboarding page still Creem-keyed. No community yet. |
| **Retain** | Pulls updates from `upstream` | Needs the Turborepo restructure and `LICENSE.md` in the kit repos. **A refund never removes access.** |
| **Expand** | Lite → Pro, Pro → Team, kit → engagement | **No upgrade prompt anywhere.** Engagement booking exists (moving to Cal.com on your branch). |
| **Measure** | — | Client pixel events wired. `purchase` still fires from the Creem path. |

## What this review found

1. **Automated delivery has never run in production.** `vercel env ls production` shows no `GITHUB_TOKEN`. `inviteToRepo` returns `not-configured`, the order sits at `pending_invite`, and the buyer gets the manual-fallback email. This was the original reason for the whole migration, and it is a missing secret, not missing code.
2. **Team seats are unreachable — my plan's defect.** Task 6 passes `seatsUrl: null`, so a $999 Team buyer's email never mentions four more seats. Migration Task 9 would then delete `src/app/(site)/access/`, which holds `access/seats/[token]/page.jsx` — the only page rendering `SeatManager` — and `accessToken.ts`, which signs those links. The spec says Team is "unchanged"; the plan removed the route that makes it reachable.
3. **Paying does not lead anywhere — my plan's defect.** Task 7 used the bare loader-script embed, which has no completion callback. `WhopCheckoutEmbed`, which the working deposit flow already uses, exposes `onComplete(plan_id, receipt_id)` and `returnUrl`. Without it the buyer finishes payment and is never sent to onboarding.
4. **Refunds never revoke.** The webhook ignores every event except `payment.succeeded`. "Repo access is the licence" is only half true while a refunded buyer keeps the repo.
5. **`amwaredotdev/warekit-react-netsuite` does not exist** (GitHub 404). React Pro and React Team cannot be delivered and must stay `draft`.
6. **Six database columns are missing** — `whop_plan_id` / `whop_sandbox_plan_id` on `products` and `courses`, `whop_plan_id` / `whop_membership_id` on `purchases`. The Task 6 webhook writes two of them, so **the Whop kit path fails at runtime** until they exist, and `pnpm build` fails at page-data collection.
7. **Migration Task 9 is 28 edits plus deletions**, not the ~10 its brief implied, and it overlaps your uncommitted branch in `pricing.jsx`, `catalog-cards.jsx`, `Services.ts` and their tests.
8. **Your in-flight branch moves engagement payment into Cal.com**, with the Whop deposit kept as a fallback. That narrows the spec's "Whop for everything" to "Whop for kits, Cal.com-first for engagements." The funnel's last step is a booking either way, so nothing here fights it.
9. **Memory was stale:** it recorded Next Pro and Team as published and `ACCESS_LINK_SECRET` as unset. The database shows every kit as `draft`; production has `ACCESS_LINK_SECRET`.

## Corrections to the migration plan

Recorded here rather than by editing `2026-09-20-whop-consolidation.md`:

| Task | Correction |
|---|---|
| 7 | Superseded by **F2**. Replace the loader-script embed with `WhopCheckoutEmbed`. |
| 8 | Superseded by **F3**. Adds the payment-pending state, upgrade prompts, and keys on the embed's `receipt_id`. |
| 9 | **Keep** `src/app/(site)/access/seats/`, `access/resend/`, `src/lib/commerce/accessToken.ts` and `ACCESS_LINK_SECRET`. Delete only `access/[token]/`. Run **after** your uncommitted commerce branch lands, then rebase. |
| 10 | **Keep** `accessTokenJti`. It stores the seat link's id. |

## The 2026-09-11 backlog, re-based onto Whop

| WK | Title | Status under Whop |
|---|---|---|
| 01 | Offer and licensing evidence | **Carried.** Now includes `LICENSE.md` ×2 (Lite permissive, Pro commercial) and the React repo decision. |
| 02 | Isolated test data | **Carried, and now blocking.** The database is shared with production, which is why schema changes are blocked. A Supabase branch is the clean answer. |
| 03 | Baseline scorecard | Carried. |
| 04–05 | Structured offers, price validation | **Partly obsolete.** Whop plans own the price. Remaining work is keeping displayed price and plan price in agreement. |
| 06–08 | Reference page, variants, guided catalog | Carried — overlaps your in-flight `pricing.jsx` / `catalog-cards.jsx` work. |
| 09 | Resilience, discoverability | Carried. |
| 10 | Release-tested onboarding guides | Carried. Content lives in the kit repos and on the F3 page. |
| 11 | Harden checkout creation | **Obsolete.** The embed has no server-side session to create or lose. |
| 12 | Durable, idempotent recording | **Done** — Whop webhook, unique `whopPaymentId`, race-safe. |
| 13 | Delivery retries | **Deferred as F5.** Needs `CRON_SECRET` and a Vercel cron. |
| 14 | Recoverable onboarding and free claims | **Mostly obsolete.** Free claims become $0 Whop plans. F3 handles payment-pending. |
| 15 | Atomic Team seats | Carried. Unchanged by Whop; `addSeat.ts` still owns it. |
| 16 | Signed access, recovery endpoints | **Narrowed** to seat links only, kept per the Task 9 correction. |
| 17 | Refunds and disputes | **F4** covers access. Revenue reconciliation stays carried. |
| 18 | Instrument and reconcile | Carried. `purchase` stops firing (Whop records its own). |
| 19 | 3D and polish | Carried. |
| 20–21 | Journey rehearsal, release | Carried — the launch gate below. |
| 22–24 | Operate, experiment, expansion | Carried post-launch. F3's upgrade prompts are the first slice of 24. |

## Owner: you, in this order

1. **Set `GITHUB_TOKEN` in Vercel production**, then `vercel redeploy https://www.amware.dev`. A fine-grained PAT on `amwaredotdev` with Administration: read and write on the kit repos — `docs/github-token.md` has the steps. Without it no kit is ever delivered automatically.
2. **Create the six database columns** — or authorise a Supabase branch so they can be created away from production. The exact DDL is in `.superpowers/sdd/2026-09-20-whop-consolidation/progress.md`.
3. **Do migration Task 1** in the Whop dashboard: plans for Next Lite / Pro / Team and React Lite, a `GitHub username` custom field on each, and one sandbox capture.
4. **Commit or land your commerce branch** so Task 9 can rebase onto it.
5. **Kit repos:** `LICENSE.md` in each (Lite permissive, Pro commercial), and decide whether `warekit-react-netsuite` gets built or React Pro/Team come off the price list.
6. **Publish** Next Lite, Next Pro, Next Team and React Lite once their plan ids are in Payload.
7. **Growth, after launch:** Whop marketplace listing and affiliate programme.

---

### Task F1: Restore Team seat links

**Files:**
- Modify: `src/app/(commerce)/webhooks/whop/route.ts`
- Test: `src/components/commerce/__tests__/whop-webhook.test.jsx`

**Interfaces:**
- Consumes: `tryCreateAccessToken({ purchaseId, itemType, itemId })` from `@/lib/commerce/accessToken`, returning `{ ok: true, token, jti } | { ok: false, reason: 'not-configured' | 'unsignable' }`. `seatLimit(item)` from `@/lib/commerce/seats`.
- Produces: `accessTokenJti` written on multi-seat purchases; `seatsUrl` passed to `sendBoilerplateConfirmationEmail`.

The Creem route did this correctly. It is being restored, not invented.

- [ ] **Step 1: Write the failing tests**

Add beside the existing mocks in `whop-webhook.test.jsx`:

```jsx
vi.mock('@/lib/commerce/accessToken', () => ({ tryCreateAccessToken: vi.fn() }))
import { tryCreateAccessToken } from '@/lib/commerce/accessToken'
```

Add a Team fixture beside `product`:

```jsx
const teamProduct = { ...product, id: 8, slug: 'warekit-next-netsuite-team', seats: 5 }
```

Add these tests inside `describe('Whop webhook', …)`:

```jsx
const teamDb = () =>
  find.mockImplementation(async ({ collection }) => {
    if (collection === 'purchases') return { docs: [] }
    if (collection === 'products') return { docs: [teamProduct] }
    return { docs: [] }
  })

it('signs a seat link for a Team licence and puts it in the email', async () => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://www.amware.dev'
  verifyWhopWebhook.mockReturnValue(event(kitPayment()))
  teamDb()
  const update = vi.fn().mockResolvedValue({})
  getPayloadClient.mockResolvedValue({ find, create, update })
  inviteToRepo.mockResolvedValue({ ok: true, state: 'invited', url: 'https://github.com/i/1', id: 1 })
  tryCreateAccessToken.mockReturnValue({ ok: true, token: 'tok_team', jti: 'jti_team' })

  const res = await POST(request())

  expect(res.status).toBe(200)
  expect(tryCreateAccessToken).toHaveBeenCalledWith(
    expect.objectContaining({ purchaseId: 99, itemType: 'product', itemId: 8 })
  )
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ accessTokenJti: 'jti_team' }) })
  )
  expect(sendBoilerplateConfirmationEmail).toHaveBeenCalledWith(
    expect.objectContaining({
      seats: 5,
      seatsUrl: 'https://www.amware.dev/access/seats/tok_team',
    })
  )
})

it('mints no seat link for a single-seat licence', async () => {
  verifyWhopWebhook.mockReturnValue(event(kitPayment()))
  kitDb()
  const update = vi.fn().mockResolvedValue({})
  getPayloadClient.mockResolvedValue({ find, create, update })
  inviteToRepo.mockResolvedValue({ ok: true, state: 'invited', url: 'https://github.com/i/1', id: 1 })

  await POST(request())

  expect(tryCreateAccessToken).not.toHaveBeenCalled()
  expect(sendBoilerplateConfirmationEmail).toHaveBeenCalledWith(
    expect.objectContaining({ seatsUrl: null })
  )
})

it('still delivers seat one when the seat link cannot be signed', async () => {
  verifyWhopWebhook.mockReturnValue(event(kitPayment()))
  teamDb()
  const update = vi.fn().mockResolvedValue({})
  getPayloadClient.mockResolvedValue({ find, create, update })
  inviteToRepo.mockResolvedValue({ ok: true, state: 'invited', url: 'https://github.com/i/1', id: 1 })
  tryCreateAccessToken.mockReturnValue({ ok: false, reason: 'not-configured' })

  const res = await POST(request())

  expect(res.status).toBe(200)
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ fulfillmentStatus: 'sent' }) })
  )
  expect(sendBoilerplateConfirmationEmail).toHaveBeenCalledWith(
    expect.objectContaining({ seatsUrl: null })
  )
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run --project ui src/components/commerce/__tests__/whop-webhook.test.jsx`
Expected: the first test FAILS — `tryCreateAccessToken` is never called.

- [ ] **Step 3: Implement**

Add to the imports in `route.ts`:

```ts
import { tryCreateAccessToken } from '@/lib/commerce/accessToken'
```

Inside the boilerplate `try`, after the invite and before `payload.update`:

```ts
      /* A Team licence covers more than one GitHub account, and the other
         seats are filled later from a signed page: /access/seats/<token>.
         The buyer never has an account with us, so this link is the only
         way back to that page. Without it a five-seat buyer gets one seat
         and no way to use the other four.
       *
         Signing can fail when ACCESS_LINK_SECRET is unset. That must not
         cost the buyer seat one, which they already have, so the failure
         is logged and delivery carries on. */
      const seats = seatLimit(item)
      const signed =
        seats > 1
          ? tryCreateAccessToken({
              purchaseId: purchase.id,
              itemType: 'product',
              itemId: item.id,
            })
          : null
      if (signed && !signed.ok) {
        console.error('Seat link not signed for payment', paymentId, signed.reason)
      }
      const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
      const seatsUrl =
        signed?.ok && site ? `${site}/access/seats/${signed.token}` : null
```

Add `...(signed?.ok ? { accessTokenJti: signed.jti } : {}),` to the `payload.update` data, and in the email call replace `seats: seatLimit(item), seatsUrl: null,` with `seats, seatsUrl,`.

- [ ] **Step 4: Run the ui project**

Run: `npx vitest run --project ui`
Expected: PASS, deposit tests unedited.

- [ ] **Step 5: Commit**

```bash
npx eslint "src/app/(commerce)/webhooks/whop/route.ts" src/components/commerce/__tests__/whop-webhook.test.jsx
npx prettier --write "src/app/(commerce)/webhooks/whop/route.ts" src/components/commerce/__tests__/whop-webhook.test.jsx
npx tsc --noEmit
git add "src/app/(commerce)/webhooks/whop/route.ts" src/components/commerce/__tests__/whop-webhook.test.jsx
git commit -m "🐛 fix(commerce): give Team buyers their seat link again

The Whop webhook passed seatsUrl: null, so a five-seat buyer received seat
one and no way to reach the other four. Restores the signed
/access/seats/<token> link the Creem route minted. A signing failure is
logged and never costs the buyer the seat they already have.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task F2: Send the buyer from payment to onboarding

**Files:**
- Modify: `src/components/commerce/BuyButton.jsx`
- Test: `src/components/commerce/__tests__/buy-button.test.jsx`

**Interfaces:**
- Consumes: `WhopCheckoutEmbed` from `@whop/checkout/react` — `planId`, `returnUrl`, `onComplete(plan_id, receipt_id)`. `WHOP_EVENT` and `whopTrack` from `@/lib/analytics/whop`.
- Produces: navigation to `/checkout/onboarding?payment_id=<receipt_id>`, consumed by F3.

Supersedes migration Task 7's loader-script embed. `DepositCheckout.jsx` is the working precedent — read it first and match its shape.

- [ ] **Step 1: Rewrite the tests**

Replace `src/components/commerce/__tests__/buy-button.test.jsx`:

```jsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

let embedProps
vi.mock('@whop/checkout/react', () => ({
  WhopCheckoutEmbed: (props) => {
    embedProps = props
    return <div data-testid="embed" data-plan={props.planId} />
  },
}))

vi.mock('@/lib/analytics/whop', () => ({
  WHOP_EVENT: { beginCheckout: 'begin_checkout' },
  whopTrack: vi.fn(),
}))

import { whopTrack, WHOP_EVENT } from '@/lib/analytics/whop'
import { BuyButton } from '../BuyButton'

beforeEach(() => {
  vi.clearAllMocks()
  embedProps = undefined
  process.env.NEXT_PUBLIC_SITE_URL = 'https://www.amware.dev'
})

describe('BuyButton', () => {
  it('mounts the Whop embed for the plan', () => {
    render(<BuyButton planId="plan_pro" itemType="product" slug="pro" name="Pro" price={499} />)
    expect(screen.getByTestId('embed')).toHaveAttribute('data-plan', 'plan_pro')
  })

  it('sends the buyer to onboarding with the receipt when payment completes', () => {
    render(<BuyButton planId="plan_pro" itemType="product" slug="pro" name="Pro" price={499} />)
    embedProps.onComplete('plan_pro', 'pay_123')
    expect(push).toHaveBeenCalledWith('/checkout/onboarding?payment_id=pay_123')
  })

  it('still sends the buyer to onboarding when Whop gives no receipt id', () => {
    render(<BuyButton planId="plan_pro" itemType="product" slug="pro" name="Pro" />)
    embedProps.onComplete('plan_pro', undefined)
    expect(push).toHaveBeenCalledWith('/checkout/onboarding')
  })

  it('returns bank-redirect payments to the same onboarding page', () => {
    render(<BuyButton planId="plan_pro" itemType="product" slug="pro" name="Pro" />)
    expect(embedProps.returnUrl).toBe('https://www.amware.dev/checkout/onboarding')
  })

  it('reports begin_checkout with the price, and omits value when price is unknown', () => {
    const { unmount } = render(
      <BuyButton planId="plan_pro" itemType="product" slug="pro" name="Pro" price={499} />
    )
    const [event, data] = whopTrack.mock.calls[0]
    expect(event).toBe(WHOP_EVENT.beginCheckout)
    expect(data.value).toBe(499)
    expect(data.currency).toBe('USD')
    expect(data.content_type).toBe('product')
    expect(data.content_id).toBe('pro')
    expect(data.content_name).toBe('Pro')
    unmount()

    whopTrack.mockClear()
    render(<BuyButton planId="plan_pro" itemType="product" slug="pro" name="Pro" />)
    expect(whopTrack.mock.calls[0][1].value).toBeUndefined()
  })

  it('says the item is not on sale rather than rendering a dead embed', () => {
    render(<BuyButton planId={null} itemType="product" slug="pro" name="Pro" />)
    expect(screen.getByRole('status')).toHaveTextContent(/not on sale yet/i)
    expect(screen.queryByTestId('embed')).toBeNull()
  })
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run --project ui src/components/commerce/__tests__/buy-button.test.jsx`
Expected: FAIL — `BuyButton` renders the loader div, not `WhopCheckoutEmbed`.

- [ ] **Step 3: Rewrite the component**

Replace `src/components/commerce/BuyButton.jsx`:

```jsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WhopCheckoutEmbed } from '@whop/checkout/react'
import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'

/* Kit checkout, on the same Whop embed the deposit flow already uses.
 *
 * The plan is the product, so there is no session to mint. The GitHub
 * username is a custom field on the plan, asked inside the embed before
 * the card.
 *
 * The earlier version mounted Whop's bare loader script, which has no
 * completion callback: a buyer finished paying and the page never moved.
 * onComplete is what carries them to onboarding, where the licence key,
 * the repo and the next step live. returnUrl covers the payment methods
 * that leave the page (bank redirects, some wallets) and come back.
 *
 * The receipt id is passed along so onboarding can find the order. If
 * Whop gives none, the buyer still lands there: the page shows a
 * thank-you and the email carries the rest. */

const ONBOARDING = '/checkout/onboarding'

export function BuyButton({ planId, itemType, slug, name, price }) {
  const router = useRouter()

  /* Fired once when the embed is on screen. No event id: each open is an
     attempt, and Whop should see how many attempts a sale takes. */
  useEffect(() => {
    if (!planId) return
    whopTrack(WHOP_EVENT.beginCheckout, {
      value: typeof price === 'number' ? price : undefined,
      currency: 'USD',
      content_type: itemType,
      content_id: slug,
      content_name: name,
    })
  }, [planId, itemType, slug, name, price])

  if (!planId) {
    return (
      <p role="status" className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">
        This item is not on sale yet. Nothing has been charged. Check back
        shortly or get in touch.
      </p>
    )
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || ''

  return (
    <div className="mt-8">
      <WhopCheckoutEmbed
        planId={planId}
        returnUrl={`${site}${ONBOARDING}`}
        onComplete={(_plan, receiptId) =>
          router.push(
            receiptId
              ? `${ONBOARDING}?payment_id=${encodeURIComponent(receiptId)}`
              : ONBOARDING
          )
        }
      />
    </div>
  )
}
```

- [ ] **Step 4: Run the ui project and typecheck**

Run: `npx vitest run --project ui && npx tsc --noEmit`
Expected: PASS. Callers already pass `planId`; no call site changes.

- [ ] **Step 5: Commit**

```bash
npx eslint src/components/commerce/BuyButton.jsx src/components/commerce/__tests__/buy-button.test.jsx
npx prettier --write src/components/commerce/BuyButton.jsx src/components/commerce/__tests__/buy-button.test.jsx
git add src/components/commerce/BuyButton.jsx src/components/commerce/__tests__/buy-button.test.jsx
git commit -m "🐛 fix(commerce): send kit buyers to onboarding when payment completes

The loader-script embed had no completion callback, so a buyer paid and
the page never moved. Uses WhopCheckoutEmbed, as the deposit flow does:
onComplete routes to onboarding with the receipt id, returnUrl catches
payment methods that leave the page.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task F3: Onboarding that confirms, delivers and offers the next step

**Files:**
- Modify: `src/app/(site)/checkout/onboarding/page.tsx`
- Modify: `src/components/commerce/OnboardingSteps.jsx`
- Create: `src/components/commerce/NextStep.jsx`
- Test: `src/components/commerce/__tests__/onboarding.test.jsx`, `src/components/commerce/__tests__/next-step.test.jsx`

**Interfaces:**
- Consumes: `?payment_id=` from F2; `whopPaymentId`, `item` (depth 1), `licenseKey`, `githubRepo`, `githubUsername`, `fulfillmentStatus` on `purchases`.
- Produces: `NextStep({ tier })` — `tier` is `'lite' | 'pro' | 'team'`.

Supersedes migration Task 8. Three states, from the 2026-09-11 failure-message table:

| State | Shown |
|---|---|
| No `payment_id`, or no matching purchase yet | "Confirming your payment. You do not need to pay again." Auto-refresh, bounded to 6 attempts over ~30 s, then a manual refresh link and the support email. |
| Purchase found, `fulfillmentStatus: sent` | Repo, licence key, CLI command, community link, `NextStep` |
| Purchase found, `pending_invite` | "Payment received. Repository access is being prepared" + the GitHub username on file + reply-to-fix line, then the same `NextStep` |

The page grants nothing, so it needs no signature — but it must never render another buyer's details. It shows only a masked licence key (`WAREKIT…XXXX`, last four characters) and the repo name. The full key is in the email, and anyone holding a `payment_id` already has the receipt.

- [ ] **Step 1: Write `NextStep` tests**

Create `src/components/commerce/__tests__/next-step.test.jsx`:

```jsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextStep } from '../NextStep'

describe('NextStep', () => {
  it('offers Pro to a Lite member', () => {
    render(<NextStep tier="lite" />)
    expect(screen.getByRole('link', { name: /pro/i })).toHaveAttribute('href', '/pricing')
  })

  it('offers Team seats to a Pro buyer', () => {
    render(<NextStep tier="pro" />)
    // Not /team/i: both the heading and the body mention Team, and getByText
    // throws on more than one match.
    expect(screen.getByText(/working with a team/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /compare team/i })).toHaveAttribute('href', '/pricing')
  })

  it('offers implementation help to everyone, including Team', () => {
    render(<NextStep tier="team" />)
    expect(screen.getByRole('link', { name: /book/i })).toHaveAttribute('href', '/services')
    expect(screen.queryByText(/upgrade to team/i)).toBeNull()
  })
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run --project ui src/components/commerce/__tests__/next-step.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `NextStep`**

Create `src/components/commerce/NextStep.jsx`:

```jsx
import Link from 'next/link'

/* The one next step worth offering, after the buyer already has what they
 * paid for — never before, and never in the way of it.
 *
 * Lite members are shown Pro, because Lite is the architecture and Pro is
 * the implementation. Pro buyers are shown Team, for the colleagues who
 * need source access. Everyone is shown implementation help, because the
 * kit is where a NetSuite build starts, not where it ends. No urgency, no
 * invented discount: the 2026-09-11 plan rules both out. */

const UPGRADE = {
  lite: {
    title: 'Ready for the built-out kit?',
    body: 'Pro is the same architecture with the UI, NetSuite packages and updates in place.',
    cta: 'See WareKit Pro',
  },
  pro: {
    title: 'Working with a team?',
    body: 'Team covers five GitHub accounts on the same repository, with the same updates.',
    cta: 'Compare Team',
  },
}

export function NextStep({ tier }) {
  const upgrade = UPGRADE[tier]
  return (
    <aside className="mt-12 space-y-6 border-t border-zinc-200 pt-8 dark:border-zinc-800">
      {upgrade && (
        <div>
          <h2 className="text-base font-semibold">{upgrade.title}</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{upgrade.body}</p>
          <Link href="/pricing" className="mt-3 inline-block text-sm font-medium underline">
            {upgrade.cta}
          </Link>
        </div>
      )}
      <div>
        <h2 className="text-base font-semibold">Want it built with you?</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          The kit is where a NetSuite build starts. If you want help taking it
          to production, that is what an engagement is for.
        </p>
        <Link href="/services" className="mt-3 inline-block text-sm font-medium underline">
          Book an intro call
        </Link>
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Run and watch them pass**

Run: `npx vitest run --project ui src/components/commerce/__tests__/next-step.test.jsx`
Expected: PASS.

- [ ] **Step 5: Write the onboarding tests**

Replace `src/components/commerce/__tests__/onboarding.test.jsx`:

```jsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OnboardingSteps } from '../OnboardingSteps'

const base = {
  itemName: 'WareKit Next NetSuite (Pro)',
  repo: 'amwaredotdev/warekit-next-netsuite',
  maskedLicenseKey: 'WAREKIT…A1B2',
  githubUsername: 'octocat',
  discordUrl: null,
  cliCommand: 'npx warekit init',
  tier: 'pro',
}

describe('OnboardingSteps', () => {
  it('shows the repo, the masked key and the next step once delivered', () => {
    render(<OnboardingSteps {...base} delivered />)
    expect(screen.getByText('amwaredotdev/warekit-next-netsuite')).toBeInTheDocument()
    expect(screen.getByText('WAREKIT…A1B2')).toBeInTheDocument()
    expect(screen.getByText(/working with a team/i)).toBeInTheDocument()
  })

  it('says access is being prepared, and names the account, when the invite is pending', () => {
    render(<OnboardingSteps {...base} delivered={false} />)
    expect(screen.getByText(/being prepared/i)).toBeInTheDocument()
    expect(screen.getByText(/octocat/)).toBeInTheDocument()
  })

  it('never asks for a GitHub account', () => {
    render(<OnboardingSteps {...base} delivered />)
    expect(screen.queryByLabelText(/github/i)).toBeNull()
  })
})
```

- [ ] **Step 6: Rework `OnboardingSteps` and the page**

In `OnboardingSteps.jsx`: remove the `requestId` / `signature` props, the `GithubAccountField` import and its form, and the full `licenseKey` render. Accept `{ itemName, repo, maskedLicenseKey, githubUsername, discordUrl, cliCommand, tier, delivered }`. When `delivered`, keep the existing repo / clone / licence / Discord / CLI blocks, rendering `maskedLicenseKey`. When not, render: "Payment received. Repository access is being prepared for **@{githubUsername}**. If that is the wrong account, reply to your receipt email and it will be fixed." Always render `<NextStep tier={tier} />` last.

In `page.tsx`:
- Remove `verifyOnboardingLink`, `TrackPurchase` and `centsToValue` imports and their use. `purchase` no longer fires; Whop records its own sales.
- Read `payment_id` from `searchParams` and look it up on `whopPaymentId`, `depth: 1`, `overrideAccess: true`, inside `try/catch`.
- No id, or no row: render a pending panel that refreshes itself. Use a client component with a 5-second timer, capped at 6 attempts via a `?attempt=` counter in the URL, then a manual refresh link and the contact email.
- Row found: derive `tier` from the item slug (`-lite` → `lite`, `-team` → `team`, otherwise `pro`), mask the key (`key.slice(0, 7) + '…' + key.slice(-4)` when the key is longer than 11 characters, else `null`), and pass `delivered: fulfillmentStatus === 'sent'`.
- A database error renders the existing `loadError` fallback — this is a public page.
- Keep `export const dynamic = 'force-dynamic'` and `robots: { index: false }`.

- [ ] **Step 7: Run everything**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
npx eslint "src/app/(site)/checkout/onboarding/page.tsx" src/components/commerce/OnboardingSteps.jsx src/components/commerce/NextStep.jsx src/components/commerce/__tests__/onboarding.test.jsx src/components/commerce/__tests__/next-step.test.jsx
npx prettier --write "src/app/(site)/checkout/onboarding/page.tsx" src/components/commerce/OnboardingSteps.jsx src/components/commerce/NextStep.jsx src/components/commerce/__tests__/onboarding.test.jsx src/components/commerce/__tests__/next-step.test.jsx
git add -A
git commit -m "✨ feat(commerce): onboarding that confirms, delivers and offers a next step

Keys on the Whop receipt the embed hands over. Handles the webhook arriving
after the buyer does, with a bounded 'confirming your payment' state instead
of an error. Masks the licence key on a page with no signature. Offers one
relevant next step — Pro to Lite, Team to Pro, an engagement to everyone —
only after the buyer has what they paid for.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task F4: Revoke repo access when a membership ends — log-only first

**Files:**
- Modify: `src/lib/commerce/githubInvite.ts`
- Test: `src/lib/commerce/__tests__/githubInvite.test.js`
- Modify: `src/app/(commerce)/webhooks/whop/route.ts`
- Test: `src/components/commerce/__tests__/whop-webhook.test.jsx`

**Interfaces:**
- Consumes: Whop `membership.deactivated`, whose `data` is a Membership: `{ id, status, plan_id, product_id, license_key, user_id }`. Status is one of `trialing | active | past_due | completed | canceled | expired | unresolved`.
- Produces: `removeFromRepo({ repo, username }): Promise<RemoveResult>`.

**The guard that matters.** Whop documents that **"`completed` one-time purchases keep access; `canceled`/`expired` do not."** Every WareKit is a one-time purchase. Revocation may only ever act on `canceled` or `expired`. Anything else is logged and ignored.

**Rollout.** Removing access is destructive and no `membership.deactivated` payload has been captured. The handler always logs exactly what it would do. It only calls GitHub when `WAREKIT_REVOKE_ON_DEACTIVATE=1`. The log lines become the capture: read a few real ones, then set the flag.

- [ ] **Step 1: Write the `removeFromRepo` tests**

Add `removeFromRepo` to the file's existing `import { inviteToRepo } from '../githubInvite'` line (ESLint wants imports first), then append to `src/lib/commerce/__tests__/githubInvite.test.js` — it already has a `reply()` fetch helper, a `REPO` constant and sets `GITHUB_TOKEN`:

```js
describe('removeFromRepo', () => {
  it('removes a collaborator and reports it', async () => {
    reply(204)
    const result = await removeFromRepo({ repo: REPO, username: 'octocat' })
    expect(result).toEqual({ ok: true, state: 'removed' })
    expect(global.fetch.mock.calls[0][0]).toMatch(/\/collaborators\/octocat$/)
    expect(global.fetch.mock.calls[0][1].method).toBe('DELETE')
  })

  it('cancels a pending invitation when the person never accepted', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ status: 404, headers: { get: () => null }, json: async () => null })
      .mockResolvedValueOnce({
        status: 200,
        headers: { get: () => null },
        json: async () => [{ id: 42, invitee: { login: 'OctoCat' } }],
      })
      .mockResolvedValueOnce({ status: 204, headers: { get: () => null }, json: async () => null })
    const result = await removeFromRepo({ repo: REPO, username: 'octocat' })
    expect(result).toEqual({ ok: true, state: 'invitation-cancelled' })
    expect(global.fetch.mock.calls[2][0]).toMatch(/\/invitations\/42$/)
  })

  it('reports nothing-to-remove when there is neither access nor an invitation', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ status: 404, headers: { get: () => null }, json: async () => null })
      .mockResolvedValueOnce({ status: 200, headers: { get: () => null }, json: async () => [] })
    expect(await removeFromRepo({ repo: REPO, username: 'octocat' })).toEqual({
      ok: true,
      state: 'nothing-to-remove',
    })
  })

  it('never throws when GitHub is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNRESET'))
    await expect(removeFromRepo({ repo: REPO, username: 'octocat' })).resolves.toEqual({
      ok: false,
      reason: 'unreachable',
    })
  })
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run --project engine src/lib/commerce/__tests__/githubInvite.test.js`
Expected: FAIL — `removeFromRepo is not a function`.

- [ ] **Step 3: Implement `removeFromRepo`**

Append to `src/lib/commerce/githubInvite.ts`:

```ts
/* The inverse of inviteToRepo, for a licence that has ended.
 *
 * Two cases, because an invitation is not access. Someone who accepted is
 * a collaborator and is removed directly. Someone who never accepted is
 * not a collaborator at all -- removing them answers 404 -- so their
 * pending invitation is found by login and cancelled instead, or it would
 * still be sitting there to accept.
 *
 * Like inviteToRepo, nothing here throws. It runs inside a webhook. */

export type RemoveResult =
  | { ok: true; state: 'removed' | 'invitation-cancelled' | 'nothing-to-remove' }
  | { ok: false; reason: InviteFailure; detail?: string }

export async function removeFromRepo(args: {
  repo?: string | null
  username?: string | null
}): Promise<RemoveResult> {
  const token = process.env.GITHUB_TOKEN
  if (!token) return { ok: false, reason: 'not-configured' }
  const repo = args.repo?.trim()
  if (!repo || !REPO.test(repo)) return { ok: false, reason: 'no-repo' }
  const username = args.username?.trim()
  if (!username) return { ok: false, reason: 'no-username' }

  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const call = (path: string, method = 'GET') =>
    fetch(`${API}${path}`, { method, headers, signal: AbortSignal.timeout(TIMEOUT_MS) })

  try {
    const removed = await call(
      `/repos/${repo}/collaborators/${encodeURIComponent(username)}`,
      'DELETE'
    )
    if (removed.status === 204) return { ok: true, state: 'removed' }
    if (removed.status !== 404) return failure(removed)

    const listed = await call(`/repos/${repo}/invitations?per_page=100`)
    if (listed.status !== 200) return failure(listed)
    const invitations = (await listed.json().catch(() => [])) as Array<{
      id: number
      invitee?: { login?: string } | null
    }>
    const pending = invitations.find(
      (i) => i.invitee?.login?.toLowerCase() === username.toLowerCase()
    )
    if (!pending) return { ok: true, state: 'nothing-to-remove' }

    const cancelled = await call(`/repos/${repo}/invitations/${pending.id}`, 'DELETE')
    if (cancelled.status === 204) return { ok: true, state: 'invitation-cancelled' }
    return failure(cancelled)
  } catch {
    return { ok: false, reason: 'unreachable' }
  }
}

function failure(res: Response): RemoveResult {
  if (res.status === 403) {
    return {
      ok: false,
      reason: res.headers.get('x-ratelimit-remaining') === '0' ? 'rate-limited' : 'forbidden',
    }
  }
  if (res.status === 429) return { ok: false, reason: 'rate-limited' }
  if (res.status === 404) return { ok: false, reason: 'not-found' }
  return { ok: false, reason: 'unreachable', detail: String(res.status) }
}
```

- [ ] **Step 4: Run the engine project**

Run: `npx vitest run --project engine`
Expected: PASS, including every pre-existing `inviteToRepo` test.

- [ ] **Step 5: Write the webhook tests**

Add to the `githubInvite` mock factory in `whop-webhook.test.jsx`: `removeFromRepo: vi.fn()`, and import it. Then:

```jsx
const deactivated = (status) => ({
  id: 'msg_2',
  type: 'membership.deactivated',
  data: { id: 'mem_1', status, plan_id: 'plan_pro' },
})

const soldKit = {
  id: 99,
  githubRepo: 'amwaredotdev/warekit-next-netsuite',
  seatMembers: [{ githubUsername: 'octocat' }, { githubUsername: 'hubot' }],
}

afterEach(() => {
  delete process.env.WAREKIT_REVOKE_ON_DEACTIVATE
})

it('ignores a completed one-time membership, which keeps access', async () => {
  verifyWhopWebhook.mockReturnValue(deactivated('completed'))
  find.mockResolvedValue({ docs: [soldKit] })
  const res = await POST(request())
  expect(res.status).toBe(200)
  expect(removeFromRepo).not.toHaveBeenCalled()
})

it('logs, but does not remove, when the flag is off', async () => {
  process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '0'
  verifyWhopWebhook.mockReturnValue(deactivated('canceled'))
  find.mockResolvedValue({ docs: [soldKit] })
  const log = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const res = await POST(request())
  expect(res.status).toBe(200)
  expect(removeFromRepo).not.toHaveBeenCalled()
  expect(log).toHaveBeenCalledWith(
    expect.stringMatching(/would revoke/i),
    expect.objectContaining({ membershipId: 'mem_1', usernames: ['octocat', 'hubot'] })
  )
})

it('removes every seat member when the flag is on and the membership was cancelled', async () => {
  process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
  verifyWhopWebhook.mockReturnValue(deactivated('canceled'))
  find.mockResolvedValue({ docs: [soldKit] })
  removeFromRepo.mockResolvedValue({ ok: true, state: 'removed' })
  const res = await POST(request())
  expect(res.status).toBe(200)
  expect(removeFromRepo).toHaveBeenCalledTimes(2)
  expect(removeFromRepo).toHaveBeenCalledWith({
    repo: 'amwaredotdev/warekit-next-netsuite',
    username: 'hubot',
  })
})

it('answers 200 for a membership it has no purchase for', async () => {
  process.env.WAREKIT_REVOKE_ON_DEACTIVATE = '1'
  verifyWhopWebhook.mockReturnValue(deactivated('expired'))
  find.mockResolvedValue({ docs: [] })
  const res = await POST(request())
  expect(res.status).toBe(200)
  expect(removeFromRepo).not.toHaveBeenCalled()
})
```

Import `afterEach` from vitest if the file does not already.

- [ ] **Step 6: Implement the handler**

In `route.ts`, import `removeFromRepo` beside `inviteToRepo`. Directly **before** `if (event.type !== 'payment.succeeded')`, add:

```ts
  if (event.type === 'membership.deactivated') {
    return handleDeactivated(event.data as { id?: string; status?: string })
  }
```

And add at the bottom of the file:

```ts
/* A membership that has ended takes its repository access with it.
 *
 * "Repo access is the licence" is the spec's enforcement model, and it is
 * only half true if a refunded or charged-back buyer keeps the repo.
 *
 * Two guards before anything is removed. Whop documents that `completed`
 * one-time purchases KEEP access -- and every kit is a one-time purchase --
 * so only `canceled` and `expired` ever act. And removal is destructive
 * against an event this codebase has never seen a real payload for, so it
 * is off until WAREKIT_REVOKE_ON_DEACTIVATE=1. Until then the handler logs
 * exactly what it would have done, and those log lines are the capture
 * that justifies turning it on.
 *
 * Every seat member is removed, not just the buyer: a Team licence that
 * ends ends for all five. Nothing here throws, and the answer is always
 * 200 -- a retry cannot un-refund anyone. */
const ENDS_ACCESS = new Set(['canceled', 'expired'])

async function handleDeactivated(membership: { id?: string; status?: string }) {
  const membershipId = membership?.id
  const status = membership?.status
  if (!membershipId || !status || !ENDS_ACCESS.has(status)) {
    return new Response('ignored (access retained)', { status: 200 })
  }

  try {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'purchases',
      where: { whopMembershipId: { equals: membershipId } },
      limit: 1,
      overrideAccess: true,
    })
    const sold = docs[0]
    if (!sold?.githubRepo) {
      return new Response('ignored (no kit for membership)', { status: 200 })
    }

    const usernames: string[] = (sold.seatMembers || [])
      .map((m: { githubUsername?: string }) => m.githubUsername)
      .filter((u: unknown): u is string => typeof u === 'string' && u.length > 0)

    if (process.env.WAREKIT_REVOKE_ON_DEACTIVATE !== '1') {
      console.warn('Would revoke repo access (flag off)', {
        membershipId,
        status,
        repo: sold.githubRepo,
        usernames,
      })
      return new Response('ok (logged only)', { status: 200 })
    }

    for (const username of usernames) {
      const result = await removeFromRepo({ repo: sold.githubRepo, username })
      if (!result.ok) {
        console.error('Revoke failed', { membershipId, username, reason: result.reason })
      }
    }
  } catch (err) {
    console.error('Deactivation handling failed', membershipId, err)
  }
  return new Response('ok', { status: 200 })
}
```

- [ ] **Step 7: Run everything and commit**

```bash
npx vitest run && npx tsc --noEmit
npx eslint src/lib/commerce/githubInvite.ts src/lib/commerce/__tests__/githubInvite.test.js "src/app/(commerce)/webhooks/whop/route.ts" src/components/commerce/__tests__/whop-webhook.test.jsx
npx prettier --write src/lib/commerce/githubInvite.ts src/lib/commerce/__tests__/githubInvite.test.js "src/app/(commerce)/webhooks/whop/route.ts" src/components/commerce/__tests__/whop-webhook.test.jsx
git add -A
git commit -m "✨ feat(commerce): revoke repo access when a membership ends, log-only first

Makes 'repo access is the licence' true in both directions. Acts only on
canceled or expired -- Whop documents that completed one-time purchases
keep access, and every kit is one. Removal is off until
WAREKIT_REVOKE_ON_DEACTIVATE=1; until then the handler logs what it would
have done, and those lines are the capture that justifies turning it on.
Removes every seat member, and cancels invitations nobody accepted.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## After you unblock — sequence

1. **Columns exist** → `pnpm build` passes in the worktree → run migration **Task 9 (corrected)** after rebasing onto your commerce branch. This is where every kit gets its buy button back.
2. **Migration Task 10 (corrected)** — drop the Creem columns, keep `accessTokenJti`.
3. **Migration Task 1 done** → **Task 11**, the plan-configuration preflight.
4. **F5: retry pending invites.** A Vercel cron hitting `/api/cron/retry-invites`, authorised by `CRON_SECRET`, re-attempting `pending_invite` rows under 7 days old. Daily works on every Vercel plan; hourly needs Pro.
5. **Community plan** (`2026-09-20-whop-community.md`). Needs two more columns, `whop_user_id` and `community_channel_id`.
6. **WK-10 guides, WK-20 rehearsal, WK-21 release** — the launch gate below.

## Launch gate (2026-09-11 gate, Whop edition)

- [ ] `GITHUB_TOKEN` in production; `pnpm sim` token preflight passes
- [ ] Six columns exist; `pnpm build` passes
- [ ] Every sellable kit has a Whop plan with a `GitHub username` field, both ids in Payload, and is published
- [ ] React Pro/Team are either backed by a real repo or off the price list
- [ ] Sandbox journeys pass end to end: Next Lite claim, React Lite claim, Next Pro purchase, Next Team purchase including a second seat added from the emailed link
- [ ] The payment → onboarding handoff lands on the right state in each case, including the webhook arriving late
- [ ] A sandbox refund produces a "would revoke" log line naming the right accounts
- [ ] `LICENSE.md` in each kit repo, lawyer-reviewed for Pro
- [ ] Deposit flow still records a sandbox payment
- [ ] No test-mode plan id reachable in production

Until the last production step has evidence, report "staging journey verified; production revenue capture unverified."
