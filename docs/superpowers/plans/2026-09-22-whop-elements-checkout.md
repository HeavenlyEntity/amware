# Whop Elements Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `@whop/checkout` with Whop Elements (`@whop/elements` + `@whop/elements-react`, 1.0.0) for both the WareKit kit checkout and the engagement deposit checkout, then uninstall `@whop/checkout`.

**Architecture:** One shared client component, `WhopCheckout`, mounts `<WhopElements><Checkout><CheckoutElement/></Checkout></WhopElements>`. It mints a random `checkoutRef` once, passes it to Whop as order `metadata` and appends it to `returnUrl`. The webhook stores it on the purchase. Both return pages — kit onboarding and deposit — confirm payment by looking the purchase up by that reference, never by trusting a query parameter.

**Tech Stack:** Next.js 16 App Router, React 19, `@whop/elements@1.0.0`, `@whop/elements-react@1.0.0`, Payload 3, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-20-whop-consolidation-design.md`. Owner decision, 2026-09-22: move BOTH kits and deposits to Elements now and remove `@whop/checkout` entirely, accepting that this touches the live deposit path and overlaps their uncommitted Cal.com branch.

## Global Constraints

Everything in `2026-09-22-warekit-funnel-completion.md` § Global Constraints, with one change and three additions:

- **Changed:** the deposit *checkout component* and its tests may now change — the owner asked for it. The deposit **webhook** behaviour still must not change, and the pre-existing tests in `whop-webhook.test.jsx` stay unedited (appending is fine).
- **`DepositCheckout`'s props interface stays byte-identical:** `planId, serviceName, amount = 1500, bookingUrl, className, children`. The owner's uncommitted `pricing.jsx` renders it.
- **Elements options are fixed at creation.** Changing a `Checkout` prop after mount *fails* instead of updating. Mount the element only once every option — especially the absolute `returnUrl` — is final, and never re-render it with a changed option.
- **Never trust a return query parameter as proof of payment.** Confirm by looking up the purchase by `checkoutRef`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## What Elements changes, and why this design

| | `@whop/checkout` (old) | Whop Elements (new) |
|---|---|---|
| Completion | `onComplete(plan, receipt_id)` callback | **Full-tab redirect to `returnUrl`.** Whop: "Fulfill from webhooks rather than a browser callback." |
| Failed payment | Redirect with `?status=error` | **Reopens the same checkout in place**, reason shown |
| Return parameters | `?status=success\|error` | **Undocumented** |
| Sandbox | Works | `environment` prop exists, but "**not yet generally available**" |
| Custom fields (GitHub username) | Rendered | Rendered — `CheckoutElement` shows "their own questions" |
| Ad attribution | Pixel events | Also links element activity to the Whop pixel visitor id natively |
| Theme accent | Hex | Named palette only — `"teal"` for this site |

**The returned-page hazard this design removes.** `/checkout/deposit` today reads `status === 'success'`. Elements does not document appending it, so a successful buyer could land on "That payment did not go through." Looking the purchase up by our own reference makes the page's answer depend on the ledger, not on Whop's URL format.

**Testing.** Elements' sandbox is not generally available. Test end to end in production with a 100%-off promo code, which `Checkout` supports natively. Nothing is charged.

## Schema — one more column

Add to the DDL recorded in `.superpowers/sdd/2026-09-20-whop-consolidation/progress.md`:

```sql
ALTER TABLE purchases ADD COLUMN whop_checkout_ref varchar;
CREATE INDEX purchases_whop_checkout_ref_idx ON purchases (whop_checkout_ref);
```

Non-unique on purpose: a retried session must never turn a real payment into a 500.

---

### Task E1: The webhook records the checkout reference

**Files:**
- Modify: `src/collections/Purchases.ts`, `src/payload-types.ts`, `src/lib/commerce/whop.ts`, `src/app/(commerce)/webhooks/whop/route.ts`
- Test: `src/components/commerce/__tests__/whop-webhook.test.jsx` (append only), `src/lib/commerce/__tests__/whop.test.js`

**Interfaces:**
- Produces: `checkoutRefFrom(payment): string | null` in `whop.ts`; `whopCheckoutRef` on every purchase the webhook creates. Consumed by E3 and E4.

- [ ] **Step 1: Test `checkoutRefFrom`** — append to `src/lib/commerce/__tests__/whop.test.js`:

```js
describe('checkoutRefFrom', () => {
  const ref = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
  it('reads a UUID reference from the payment metadata', () => {
    expect(checkoutRefFrom({ metadata: { checkout_ref: ref } })).toBe(ref)
  })
  it('refuses anything that is not a UUID', () => {
    expect(checkoutRefFrom({ metadata: { checkout_ref: 'drop table' } })).toBeNull()
    expect(checkoutRefFrom({ metadata: { checkout_ref: 42 } })).toBeNull()
    expect(checkoutRefFrom({ metadata: null })).toBeNull()
    expect(checkoutRefFrom(null)).toBeNull()
  })
})
```

Add `checkoutRefFrom` to the file's existing `from '../whop'` import.

- [ ] **Step 2: Implement** — append to `src/lib/commerce/whop.ts`:

```ts
/* The reference our checkout component minted and handed to Whop as order
 * metadata. It is how a return page finds the purchase without trusting
 * anything Whop puts in the URL. Client-minted, so it proves nothing on
 * its own: it is a lookup handle, never an authorisation. Anything that is
 * not a UUID is dropped rather than stored. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function checkoutRefFrom(
  payment: { metadata?: Record<string, unknown> | null } | null | undefined
): string | null {
  const ref = payment?.metadata?.checkout_ref
  return typeof ref === 'string' && UUID.test(ref) ? ref.toLowerCase() : null
}
```

- [ ] **Step 3: Store it** — add a `whopCheckoutRef` text field (indexed, description: *"Our own reference for the checkout session, minted in the browser and carried through Whop as order metadata. Return pages find the purchase by it. A lookup handle, not proof of anything."*) beside `whopMembershipId` in `Purchases.ts`; hand-edit `payload-types.ts` (the `Purchase` interface with its JSDoc, and `PurchasesSelect`). In the webhook's `payload.create` data add `whopCheckoutRef: checkoutRefFrom(payment) || undefined,` for every purchase type.

- [ ] **Step 4: Webhook test** — append one test: a deposit payment carrying `metadata: { checkout_ref: '<uuid>' }` produces `create` data containing `whopCheckoutRef: '<uuid>'`, and one with junk metadata produces no `whopCheckoutRef`. Existing assertions use `objectContaining`, so they are unaffected — confirm, never edit them.

- [ ] **Step 5: Verify and commit** — `npx vitest run && npx tsc --noEmit`, ESLint and Prettier on changed files.

```bash
git commit -m "✨ feat(commerce): record our own checkout reference on every Whop sale

Return pages will confirm a payment by finding the purchase through this
reference, rather than trusting whatever Whop appends to the return URL —
which Elements does not document.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task E2: One Elements checkout component

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`
- Create: `src/components/commerce/WhopCheckout.jsx`
- Test: `src/components/commerce/__tests__/whop-checkout.test.jsx`

**Interfaces:**
- Consumes: `whopEnvironment()` from `@/lib/commerce/whopEnv`; `useMounted()` from `@/hooks/use-client-value`.
- Produces: `WhopCheckout({ planId, returnPath, returnParams, className })`. `returnPath` is a site path such as `/checkout/onboarding`; `returnParams` is an optional object of extra query parameters. Consumed by E3 and E4.

- [ ] **Step 1: Install**

```bash
pnpm add @whop/elements@1.0.0 @whop/elements-react@1.0.0
```

Pin exact versions: Elements' docs are versioned per release, and a silent minor bump could change element behaviour on a payment page.

- [ ] **Step 2: Test** — create `src/components/commerce/__tests__/whop-checkout.test.jsx`:

```jsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

let providerProps
let checkoutProps
vi.mock('@whop/elements-react', () => ({
  WhopElements: (props) => {
    providerProps = props
    return <div data-testid="provider">{props.children}</div>
  },
  Checkout: (props) => {
    checkoutProps = props
    return <div data-testid="checkout">{props.children}</div>
  },
  CheckoutElement: () => <div data-testid="element" />,
}))
vi.mock('@whop/elements', () => ({ loadWhop: vi.fn(() => ({ loaded: true })) }))

import { WhopCheckout } from '../WhopCheckout'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

beforeEach(() => {
  providerProps = undefined
  checkoutProps = undefined
  delete process.env.NEXT_PUBLIC_WHOP_ENV
})

describe('WhopCheckout', () => {
  it('mounts the plan with a UUID reference in both metadata and the return URL', () => {
    render(<WhopCheckout planId="plan_pro" returnPath="/checkout/onboarding" />)
    expect(checkoutProps.plan).toBe('plan_pro')
    const ref = checkoutProps.metadata.checkout_ref
    expect(ref).toMatch(UUID)
    const url = new URL(checkoutProps.returnUrl)
    expect(url.origin).toBe(window.location.origin)
    expect(url.pathname).toBe('/checkout/onboarding')
    expect(url.searchParams.get('ref')).toBe(ref)
  })

  it('carries extra return parameters alongside the reference', () => {
    render(
      <WhopCheckout
        planId="plan_dep"
        returnPath="/checkout/deposit"
        returnParams={{ service: 'Fractional CTO', booking: 'https://cal.com/amware/x' }}
      />
    )
    const url = new URL(checkoutProps.returnUrl)
    expect(url.searchParams.get('service')).toBe('Fractional CTO')
    expect(url.searchParams.get('booking')).toBe('https://cal.com/amware/x')
    expect(url.searchParams.get('ref')).toMatch(UUID)
  })

  it('keeps one reference across re-renders, because options cannot change after mount', () => {
    const { rerender } = render(<WhopCheckout planId="plan_pro" returnPath="/checkout/onboarding" />)
    const first = checkoutProps.metadata.checkout_ref
    rerender(<WhopCheckout planId="plan_pro" returnPath="/checkout/onboarding" />)
    expect(checkoutProps.metadata.checkout_ref).toBe(first)
  })

  it('targets the sandbox when the site is configured for it', () => {
    process.env.NEXT_PUBLIC_WHOP_ENV = 'sandbox'
    render(<WhopCheckout planId="plan_sand" returnPath="/checkout/onboarding" />)
    expect(providerProps.environment).toBe('sandbox')
  })

  it('defaults to production and the site accent', () => {
    render(<WhopCheckout planId="plan_pro" returnPath="/checkout/onboarding" />)
    expect(providerProps.environment).toBe('production')
    expect(providerProps.appearance.theme.accentColor).toBe('teal')
  })

  it('renders nothing without a plan', () => {
    render(<WhopCheckout planId={null} returnPath="/checkout/onboarding" />)
    expect(screen.queryByTestId('checkout')).toBeNull()
  })
})
```

- [ ] **Step 3: Implement** — create `src/components/commerce/WhopCheckout.jsx`:

```jsx
'use client'

import { useMemo, useState } from 'react'
import { WhopElements, Checkout, CheckoutElement } from '@whop/elements-react'
import { loadWhop } from '@whop/elements'
import { whopEnvironment } from '@/lib/commerce/whopEnv'
import { useMounted } from '@/hooks/use-client-value'

/* The one Whop checkout on this site, for kits and deposits alike.
 *
 * Whop Elements has no completion callback: a finished checkout redirects
 * the whole tab to returnUrl, and Whop says to fulfil from webhooks rather
 * than from the browser. So this component mints a random reference once,
 * hands it to Whop as order metadata, and puts it on the return URL. The
 * webhook stores it; the return page looks the purchase up by it. What Whop
 * itself appends to the URL is undocumented, and nothing here depends on it.
 *
 * Every Elements option is fixed at creation — changing one later fails
 * rather than updating — so the element mounts only once the absolute
 * origin is known, and the reference never changes for this mount.
 *
 * Elements run in their own frames and cannot see the page's theme, so the
 * mode is read from the root class when the element first mounts. */

let whopLoad
const load = () => (whopLoad ??= loadWhop())

export function WhopCheckout({ planId, returnPath, returnParams, className }) {
  const mounted = useMounted()
  const [ref] = useState(() => crypto.randomUUID())

  const returnUrl = useMemo(() => {
    if (!mounted) return null
    const url = new URL(returnPath, window.location.origin)
    for (const [key, value] of Object.entries(returnParams || {})) {
      if (value) url.searchParams.set(key, String(value))
    }
    url.searchParams.set('ref', ref)
    return url.toString()
    // returnParams is read once: options cannot change after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, returnPath, ref])

  const dark = useMemo(
    () => mounted && document.documentElement.classList.contains('dark'),
    [mounted]
  )

  if (!planId || !returnUrl) return null

  return (
    <div className={className}>
      <WhopElements
        elements={load()}
        environment={whopEnvironment()}
        appearance={{ theme: { appearance: dark ? 'dark' : 'light', accentColor: 'teal' } }}
      >
        <Checkout plan={planId} returnUrl={returnUrl} metadata={{ checkout_ref: ref }}>
          <CheckoutElement />
        </Checkout>
      </WhopElements>
    </div>
  )
}
```

If `react-hooks/set-state-in-effect` or another project lint rule objects, satisfy it without moving option computation into a post-mount state update — options must be final at first mount.

- [ ] **Step 4: Verify and commit** — `npx vitest run --project ui && npx tsc --noEmit`, ESLint and Prettier.

```bash
git commit -m "✨ feat(commerce): one Whop Elements checkout for the whole site

Mints a checkout reference once, passes it to Whop as order metadata and on
the return URL, and mounts only when every option is final — Elements fails
rather than updating when an option changes after mount.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task E3: Kits buy through Elements; onboarding finds the order by reference

**Files:**
- Modify: `src/components/commerce/BuyButton.jsx`, `src/app/(site)/checkout/onboarding/page.tsx`
- Test: `src/components/commerce/__tests__/buy-button.test.jsx`, `src/components/commerce/__tests__/onboarding.test.jsx` (or the page's own test, wherever F3 put the lookup tests)

**Interfaces:**
- Consumes: `WhopCheckout` (E2); `whopCheckoutRef` (E1).

- [ ] **Step 1:** `BuyButton` renders `<WhopCheckout planId={planId} returnPath="/checkout/onboarding" />` in place of `WhopCheckoutEmbed`. Delete the `router.push`/`onComplete` handling, the `skipRedirect`/theme props and the `useMounted` gating — `WhopCheckout` owns them now. Keep the "not on sale yet" status message and the `begin_checkout` event exactly as they are.

- [ ] **Step 2:** Rewrite `buy-button.test.jsx` to mock `../WhopCheckout` and assert: it receives `planId` and `returnPath="/checkout/onboarding"`; `begin_checkout` still fires with the same per-field payload and omits `value` when price is not a number; `planId={null}` shows the status message and no checkout.

- [ ] **Step 3:** Onboarding looks up the purchase by `ref` first, then `payment_id` (the setup link in the receipt email still uses `payment_id`). Validate `ref` against the UUID pattern and lower-case it before querying; an invalid `ref` is treated as absent. Everything F3 built — the three states, bounded refresh, masking, `status !== 'paid'` hiding, no email/amount/full key in props — stays unchanged. A `ref` with no row yet is the ordinary "confirming your payment" state.

- [ ] **Step 4:** Tests for: lookup by `ref`; fall back to `payment_id`; an invalid `ref` is not queried.

- [ ] **Step 5: Verify and commit** — full `npx vitest run`, `npx tsc --noEmit`, ESLint, Prettier.

```bash
git commit -m "✨ feat(commerce): buy kits through Whop Elements

Onboarding finds the order by the reference the checkout minted, falling
back to the payment id the receipt email links with.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task E4: Deposits through Elements, a return page that checks the ledger, and `@whop/checkout` removed

**Files:**
- Modify: `src/components/commerce/DepositCheckout.jsx`, `src/app/(site)/checkout/deposit/page.jsx`, `package.json`, `pnpm-lock.yaml`
- Test: `src/components/commerce/__tests__/deposit-checkout.test.jsx`, `src/components/landing/__tests__/pricing-tabs.test.jsx`, a new test for the deposit page

**Interfaces:**
- Consumes: `WhopCheckout` (E2); `whopCheckoutRef` (E1); `PendingRefresh` (F3).

- [ ] **Step 1: `DepositCheckout`.** Props stay byte-identical. The sheet, its trigger, the sandbox badge and `begin_checkout` on open stay. Inside the sheet, render `<WhopCheckout planId={planId} returnPath="/checkout/deposit" returnParams={{ service: serviceName, booking: bookingUrl }} />` instead of `WhopCheckoutEmbed`. Remove the in-sheet `received` state and the `Received` component's `onComplete` wiring — Elements redirects the tab, so that state is unreachable. The "deposit received → book your call" moment now lives on `/checkout/deposit`. Delete `Received` if nothing else uses it.

- [ ] **Step 2: `/checkout/deposit` checks the ledger.** Make the page `dynamic = 'force-dynamic'`, and resolve a state in this order:

| Condition | Shown |
|---|---|
| `status=error` | the existing "That payment did not go through. Nothing was charged…" copy |
| valid `ref` and a `paid` purchase with that `whopCheckoutRef` | the existing success copy and booking button ("Your start is reserved…") |
| valid `ref`, no row yet | "Confirming your deposit — you do not need to pay again", with `PendingRefresh` (6 attempts) |
| valid `ref`, row not `paid` | the neutral "check your email" copy |
| no `ref` | the neutral "check your email or get in touch" copy — **never** the failure message, since arrival alone proves nothing either way |

Keep `service` and `booking` handling as they are — `booking` is untrusted, and `calLinkFromUrl` stays the gate. The lookup reads only `status` and the existence of the row; the page must never render the purchase's email or amount. Wrap the query in `try/catch` and render the neutral state on error — public page.

- [ ] **Step 3: Tests.** Rewrite `deposit-checkout.test.jsx` for the new internals: mock `../WhopCheckout` and assert it receives `planId`, `returnPath="/checkout/deposit"` and `returnParams` with `service` and `booking`; the sandbox badge; `begin_checkout` on open with the existing payload. In `pricing-tabs.test.jsx`, replace the `@whop/checkout/react` mock with a mock of `@/components/commerce/WhopCheckout` (or `@whop/elements-react`), changing nothing else. Add a deposit-page test for every row of the table above.

- [ ] **Step 4: Uninstall.**

```bash
pnpm remove @whop/checkout
grep -rn "@whop/checkout" src package.json
```

Expected: no output.

- [ ] **Step 5: Verify and commit** — full `npx vitest run`, `npx tsc --noEmit`, ESLint, Prettier.

```bash
git commit -m "✨ feat(commerce): take deposits through Whop Elements and drop @whop/checkout

The return page now confirms a deposit by finding the purchase through the
checkout reference, instead of trusting ?status=success — which Elements
does not document and which, missing, would have told a paying client the
payment failed.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## For the owner at merge

- `pricing-tabs.test.jsx` is one of your uncommitted files. E4 swaps its checkout mock in the worktree, and your copy still mocks `@whop/checkout/react` — take E4's mock line when you merge.
- Seven columns now, not six: add `whop_checkout_ref` with the DDL above.
- Test the Elements checkout in production with a 100%-off promo code. Elements' sandbox is not generally available.
