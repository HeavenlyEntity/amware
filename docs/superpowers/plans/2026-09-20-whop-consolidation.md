# Whop Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire Creem and run all commerce on Whop — kits, guide, courses and the existing engagement deposits — collecting the buyer's GitHub username at checkout so `githubInvite.ts` fulfils straight off the webhook.

**Architecture:** One webhook (`/webhooks/whop`) gains a boilerplate branch alongside its existing deposit branch. A plan id resolves to a product, course or service; a boilerplate purchase triggers `inviteToRepo`. The Creem modules, the signed `/access/*` links and the bespoke free-claim route are deleted. Purchases keeps its Whop columns and loses its Creem ones.

**Tech Stack:** Next.js 16 App Router, React 19, JavaScript/TypeScript, Payload 3 on Postgres, Whop (`@whop/sdk`, `@whop/checkout`), Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-20-whop-consolidation-design.md`

## Global Constraints

- **The deposit path must not change behaviour.** `whop.ts`, `whopEnv.ts`'s `depositPlanId`, `DepositCheckout.jsx`, `BookCallButton.jsx`, `calLink.ts` and the Services collection's plan ids are untouched. **Every existing test in `src/components/commerce/__tests__/whop-webhook.test.jsx` and `deposit-checkout.test.jsx` must keep passing without edits** — they are the regression alarm.
- **`motion` is imported from `motion/react`, never `framer-motion`**, and only in client components.
- **Lint with the ESLint CLI**, never `next lint`. Flat config is `eslint.config.mjs`.
- **Never start a dev server.** `pnpm build` while a dev server runs is safe since Next 16, but do not start one.
- **Two vitest projects.** `engine` runs `src/lib/**/__tests__/**/*.test.js` in node **with relative imports only — no `@/` alias**. `ui` runs `src/components/**/__tests__/**/*.test.jsx` and `src/app/**/__tests__/**/*.test.jsx` in jsdom with the `@/` alias.
- **Payload schema changes go through schema push**, not written migrations. There is no `src/migrations` directory.
- **Prices display with `.toFixed(2)`** (e.g. `$75.00`).
- **Guard empty arrays before `.in('id', [])`** — return an empty dataset rather than querying.
- **Commit messages use the gitmoji.dev convention** and end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Verification gate after every task:** `npx eslint <changed files>`, `npx prettier --write <changed files>`, `npx tsc --noEmit`.

## Ordering note — this plan corrects the spec

The spec sequences the schema change (Phase 1) *before* deleting the Creem code (Phase 3). **Done in that order the build breaks:** regenerating `payload-types.ts` without `creemOrderId` leaves `webhooks/creem/route.ts` referencing fields that no longer exist, and `tsc --noEmit` fails.

This plan therefore adds the new columns first (additive, safe), repoints the live code, deletes the Creem code, and drops the Creem columns **last** — Task 9 before Task 10. Every task leaves a site that builds and sells.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `docs/whop-custom-fields.md` | **Create.** The captured sandbox webhook payload proving where a custom-field answer lands | 1 |
| `src/collections/Products.ts` | **Modify.** Add `whopPlanId` / `whopSandboxPlanId`; later drop `creemProductField` | 2, 9 |
| `src/collections/Courses.ts` | **Modify.** Same | 2, 9 |
| `src/lib/commerce/whopEnv.ts` | **Modify.** Add generic `planId()`; `depositPlanId` stays as a thin alias | 3 |
| `src/lib/commerce/whop.ts` | **Modify.** Add `customFieldAnswer()` and the `WhopPayment` custom-field types | 4 |
| `src/app/(commerce)/webhooks/whop/route.ts` | **Modify.** Resolve a plan across collections; add the boilerplate branch | 5, 6 |
| `src/components/commerce/BuyButton.jsx` | **Modify.** Server-action redirect → Whop embedded checkout | 7 |
| `src/lib/commerce/checkout.ts` | **Delete.** The Creem session call has no successor | 7 |
| `src/app/(site)/checkout/onboarding/page.tsx` | **Modify.** Verify by Whop payment id; stop asking for a username | 8 |
| `src/collections/Purchases.ts` | **Modify.** Drop Creem columns and `provider`; add `whopPlanId`, `whopMembershipId` | 10 |

---

### Task 1: Prove Whop custom fields reach the webhook

This is a **gate, not code**. Tasks 4 and 6 are written against the payload shape this captures. If a custom-field answer never reaches the webhook, stop and re-plan Task 8 around the onboarding page instead.

**Files:**
- Create: `docs/whop-custom-fields.md`

**Interfaces:**
- Consumes: nothing.
- Produces: a documented JSON path to a custom-field answer on a `payment.succeeded` payload, consumed by `customFieldAnswer()` in Task 4.

- [ ] **Step 1: Create the sandbox plans**

In the Whop **sandbox** dashboard create one product with a one-time plan. On the plan, add a custom field: type `text`, name exactly `GitHub username`. Record the `plan_…` id.

- [ ] **Step 2: Point a webhook at a tunnel and capture a payment**

```bash
pnpm tunnel
```

Register `https://my-portfolio.ngrok.app/webhooks/whop` as the sandbox webhook endpoint, then buy the plan with a Whop test card, filling the GitHub username field with `octocat`.

- [ ] **Step 3: Record the payload verbatim**

Copy the raw `payment.succeeded` body out of the Whop dashboard's webhook delivery log into `docs/whop-custom-fields.md`, with the JSON path to the answer called out. Structure the file as:

```markdown
# Where a Whop custom-field answer lands

Captured from a sandbox `payment.succeeded` on 2026-09-20.

**Path:** `<the actual path, e.g. data.custom_field_responses[].{name,value}>`

## Raw payload

​```json
<paste the body verbatim>
​```

## Notes
- Field name as configured on the plan: `GitHub username`
- Whether the field appears when left blank: <yes/no>
- Whether `name` is echoed exactly or slugified: <observed>
```

- [ ] **Step 4: Confirm the live plans and the GitHub org**

In the **production** dashboard, create the 8 product plans (6 WareKit variants, `warekit`, the guide) with the same `GitHub username` custom field on each kit plan. Lite plans are $0. Record every `plan_…` id — Task 2 writes them into Payload. Confirm `amwaredotdev` is on GitHub Free.

- [ ] **Step 5: Commit**

```bash
git add docs/whop-custom-fields.md
git commit -m "📝 docs(commerce): capture where Whop custom fields land on the webhook

Task 4's customFieldAnswer() and Task 6's boilerplate branch are written
against this payload. Captured from the sandbox rather than assumed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Give products and courses Whop plan ids

**Files:**
- Modify: `src/collections/Products.ts`
- Modify: `src/collections/Courses.ts`

**Interfaces:**
- Consumes: the plan ids recorded in Task 1.
- Produces: `whopPlanId?: string | null` and `whopSandboxPlanId?: string | null` on `Product` and `Course` in `payload-types.ts`, consumed by Tasks 3, 5 and 7.

Additive only. `creemProductField` stays until Task 9 so the Creem route keeps compiling.

- [ ] **Step 1: Add the fields to Products**

In `src/collections/Products.ts`, immediately after the `creemProductField({…})` entry:

```ts
    {
      name: 'whopPlanId',
      type: 'text',
      admin: {
        description:
          'The Whop plan a buyer checks out against in production. The plan ' +
          'is the product: the embed mounts from this id alone, and the id ' +
          'on the payment is how a sale finds its way back here.',
      },
    },
    {
      name: 'whopSandboxPlanId',
      type: 'text',
      admin: {
        description:
          "The same product's plan in Whop's sandbox, which is a separate " +
          'account with its own ids. Chosen when WHOP_ENV=sandbox.',
      },
    },
```

- [ ] **Step 2: Add the same two fields to Courses**

In `src/collections/Courses.ts`, immediately after `creemProductField(),`, paste the identical two field objects from Step 1.

- [ ] **Step 3: Regenerate types and typecheck**

```bash
pnpm generate:types && npx tsc --noEmit
```

Expected: clean. `Product` and `Course` now carry both fields.

- [ ] **Step 4: Fill the ids in the admin**

For each of the 8 products and any courses, paste the production and sandbox plan ids recorded in Task 1.

- [ ] **Step 5: Commit**

```bash
git add src/collections/Products.ts src/collections/Courses.ts src/payload-types.ts
git commit -m "✨ feat(commerce): add Whop plan ids to products and courses

Additive. Mirrors the dual-id pattern services already use, so whopEnv
resolves the right id per environment. The Creem field stays until the
Creem route is deleted, or typecheck breaks.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Generalise plan-id resolution

**Files:**
- Modify: `src/lib/commerce/whopEnv.ts`
- Test: `src/lib/commerce/__tests__/whopEnv.test.js`

**Interfaces:**
- Consumes: the fields from Task 2.
- Produces: `planId(item, env?): string | null`, consumed by Tasks 5 and 7. `depositPlanId` keeps its exact current signature and behaviour.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/commerce/__tests__/whopEnv.test.js`:

```js
describe('planId', () => {
  const product = { whopPlanId: 'plan_live', whopSandboxPlanId: 'plan_sand' }

  it('picks the live plan by default and the sandbox plan when asked', () => {
    expect(planId(product)).toBe('plan_live')
    expect(planId(product, 'sandbox')).toBe('plan_sand')
  })

  it('is null for nothing, and for an item whose id for this environment is empty', () => {
    expect(planId(null)).toBeNull()
    expect(planId(undefined)).toBeNull()
    expect(planId({ whopPlanId: '' })).toBeNull()
    expect(planId({ whopPlanId: 'plan_live' }, 'sandbox')).toBeNull()
  })

  it('reads the same shape depositPlanId does, so services keep working', () => {
    expect(planId(product)).toBe(depositPlanId(product))
  })
})
```

Add `planId` to the import at the top of the file:

```js
import {
  depositPlanId,
  isWhopSandbox,
  planId,
  whopEnvironment,
} from '../whopEnv'
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run --project engine src/lib/commerce/__tests__/whopEnv.test.js`
Expected: FAIL — `planId is not a function`.

- [ ] **Step 3: Implement `planId` and make `depositPlanId` delegate**

In `src/lib/commerce/whopEnv.ts`, replace the `depositPlanId` export with:

```ts
/** The plan an item is bought through in this environment. */
export function planId(
  item:
    | {
        whopPlanId?: string | null
        whopSandboxPlanId?: string | null
      }
    | null
    | undefined,
  env: WhopEnvironment = whopEnvironment()
): string | null {
  if (!item) return null
  const id = env === 'sandbox' ? item.whopSandboxPlanId : item.whopPlanId
  return id || null
}

/* Kept as its own name rather than folded into planId at the call sites.
   The deposit flow is the one part of commerce already carrying real
   traffic, and renaming its helper would put a diff through code this
   migration is supposed to leave alone. */
export const depositPlanId = planId
```

- [ ] **Step 4: Run the whole engine project**

Run: `npx vitest run --project engine`
Expected: PASS, including every pre-existing `depositPlanId` assertion.

- [ ] **Step 5: Commit**

```bash
npx eslint src/lib/commerce/whopEnv.ts src/lib/commerce/__tests__/whopEnv.test.js
npx prettier --write src/lib/commerce/whopEnv.ts src/lib/commerce/__tests__/whopEnv.test.js
git add src/lib/commerce/whopEnv.ts src/lib/commerce/__tests__/whopEnv.test.js
git commit -m "✨ feat(commerce): resolve a Whop plan id for any item, not just services

depositPlanId becomes an alias rather than a rename, so the deposit flow
takes no diff from this migration.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Read a custom-field answer off a payment

**Files:**
- Modify: `src/lib/commerce/whop.ts`
- Test: `src/lib/commerce/__tests__/whop.test.js`

**Interfaces:**
- Consumes: the payload path documented in Task 1.
- Produces: `customFieldAnswer(payment, name): string | null`, consumed by Task 6.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/commerce/__tests__/whop.test.js`:

```js
describe('customFieldAnswer', () => {
  it('finds an answer by field name, ignoring case and surrounding space', () => {
    const payment = {
      custom_field_responses: [
        { name: 'Discord username', value: 'grace#1' },
        { name: 'GitHub username', value: '  octocat  ' },
      ],
    }
    expect(customFieldAnswer(payment, 'GitHub username')).toBe('octocat')
    expect(customFieldAnswer(payment, 'github USERNAME')).toBe('octocat')
  })

  it('is null when the field is absent, blank, or the payment has no fields', () => {
    expect(customFieldAnswer({}, 'GitHub username')).toBeNull()
    expect(customFieldAnswer(null, 'GitHub username')).toBeNull()
    expect(
      customFieldAnswer(
        { custom_field_responses: [{ name: 'GitHub username', value: '   ' }] },
        'GitHub username'
      )
    ).toBeNull()
  })

  it('reads the alternative shapes Whop has been observed to send', () => {
    const asAnswer = { custom_fields: [{ name: 'GitHub username', answer: 'octocat' }] }
    const asMetadata = {
      metadata: { custom_fields: [{ name: 'GitHub username', response: 'octocat' }] },
    }
    expect(customFieldAnswer(asAnswer, 'GitHub username')).toBe('octocat')
    expect(customFieldAnswer(asMetadata, 'GitHub username')).toBe('octocat')
  })
})
```

Add the import at the top of the file:

```js
import { customFieldAnswer } from '../whop'
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run --project engine src/lib/commerce/__tests__/whop.test.js`
Expected: FAIL — `customFieldAnswer is not a function`.

- [ ] **Step 3: Implement it**

Append to `src/lib/commerce/whop.ts`:

```ts
/* One custom-field answer off a payment.
 *
 * Whop's own example names the field "Discord username", so a plain text
 * field holding a handle is the documented use, not a trick. What is not
 * documented is the exact path the answers arrive on, which is why
 * docs/whop-custom-fields.md holds a captured payload.
 *
 * This reads every shape that capture could plausibly take rather than
 * betting the kit's whole delivery path on one of them. The cost of
 * looking in four places is nothing; the cost of guessing wrong is a
 * buyer who paid and got no repository.
 *
 * Matching is case-insensitive and trimmed because the field name is
 * typed into a dashboard by a human, and "Github username" on the plan
 * must not silently mean no invitation.
 */
export function customFieldAnswer(
  payment: Record<string, any> | null | undefined,
  name: string
): string | null {
  if (!payment) return null
  const wanted = name.trim().toLowerCase()
  const pools = [
    payment.custom_field_responses,
    payment.custom_fields,
    payment.metadata?.custom_fields,
    payment.checkout_configuration?.custom_field_responses,
  ]
  for (const pool of pools) {
    if (!Array.isArray(pool)) continue
    const hit = pool.find(
      (f) => typeof f?.name === 'string' && f.name.trim().toLowerCase() === wanted
    )
    const value = hit?.value ?? hit?.answer ?? hit?.response
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run --project engine src/lib/commerce/__tests__/whop.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npx eslint src/lib/commerce/whop.ts src/lib/commerce/__tests__/whop.test.js
npx prettier --write src/lib/commerce/whop.ts src/lib/commerce/__tests__/whop.test.js
git add src/lib/commerce/whop.ts src/lib/commerce/__tests__/whop.test.js
git commit -m "✨ feat(commerce): read a Whop custom-field answer off a payment

Reads every shape the captured payload could take rather than betting the
kit's delivery path on one. Looking in four places costs nothing; guessing
wrong costs a buyer who paid and got no repository.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Resolve a plan to a product, course or service

**Files:**
- Modify: `src/app/(commerce)/webhooks/whop/route.ts`
- Test: `src/components/commerce/__tests__/whop-webhook.test.jsx`

**Interfaces:**
- Consumes: `planId` (Task 3), the fields from Task 2.
- Produces: an internal `findByPlan(payload, planId)` returning `{ collection, item }`, consumed by Task 6.

**Services are searched first on purpose.** It preserves the existing deposit query exactly, which is what lets the current tests pass untouched, and deposits are the only path carrying real traffic.

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe('Whop webhook', …)` block in `src/components/commerce/__tests__/whop-webhook.test.jsx`:

```jsx
  it('records a kit purchase against the product its plan belongs to', async () => {
    verifyWhopWebhook.mockReturnValue(
      event(payment({ plan: { id: 'plan_pro' }, total: 499 }))
    )
    find.mockImplementation(async ({ collection }) => {
      if (collection === 'purchases') return { docs: [] }
      if (collection === 'services') return { docs: [] }
      if (collection === 'products') return { docs: [product] }
      return { docs: [] }
    })
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'purchases',
        data: expect.objectContaining({
          item: { relationTo: 'products', value: 7 },
          itemType: 'product',
          amount: 49900,
        }),
      })
    )
  })
```

And add this fixture beside the existing `service` fixture near the top of the file:

```jsx
const product = {
  id: 7,
  slug: 'warekit-next-netsuite-pro',
  name: 'WareKit Next NetSuite (Pro)',
  type: 'boilerplate',
  whopPlanId: 'plan_pro',
  githubRepo: 'amwaredotdev/warekit-next-netsuite',
  seats: 1,
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run --project ui src/components/commerce/__tests__/whop-webhook.test.jsx`
Expected: FAIL — the route only looks at `services`, so `item` is undefined and `itemType` is `'service'`.

- [ ] **Step 3: Implement the resolver**

In `src/app/(commerce)/webhooks/whop/route.ts`, add above `export async function POST`:

```ts
/* Which collection a plan belongs to.
 *
 * Services first, and deliberately. A deposit is the only Whop purchase
 * carrying real traffic today, so it keeps the exact query it has always
 * had -- one find on services, same arguments, same position. Products
 * and courses are asked only when that misses, which is what lets the
 * deposit tests stand unedited as the regression alarm for this migration.
 *
 * A plan id is unique across Whop, so the order is a matter of cost and
 * blast radius rather than correctness. */
const PLAN_COLLECTIONS = ['services', 'products', 'courses'] as const

const ITEM_TYPE = {
  services: 'service',
  products: 'product',
  courses: 'course',
} as const

async function findByPlan(payload: any, plan: string | null) {
  if (!plan) return { collection: null, item: null }
  const field =
    whopEnvironment() === 'sandbox' ? 'whopSandboxPlanId' : 'whopPlanId'
  for (const collection of PLAN_COLLECTIONS) {
    const { docs } = await payload.find({
      collection,
      where: { [field]: { equals: plan } },
      limit: 1,
      overrideAccess: true,
    })
    if (docs[0]) return { collection, item: docs[0] }
  }
  return { collection: null, item: null }
}
```

Then replace the existing service lookup block (the `const service = planId ? (…).docs[0] ?? null : null` expression) with:

```ts
  const { collection, item } = await findByPlan(payload, planId)
  const itemType = collection ? ITEM_TYPE[collection] : undefined
  const service = collection === 'services' ? item : null
```

and change the `payload.create` data so `item` and `itemType` come from the resolver:

```ts
        item: item ? { relationTo: collection, value: item.id } : undefined,
        itemType,
```

Leave `fulfillmentStatus: service ? 'not_required' : 'failed'` alone for now — Task 6 replaces it.

- [ ] **Step 4: Run the whole ui project**

Run: `npx vitest run --project ui`
Expected: PASS, **including every pre-existing deposit test with no edits**. If a deposit test needed changing, the resolver is wrong — fix the resolver, not the test.

- [ ] **Step 5: Commit**

```bash
npx eslint "src/app/(commerce)/webhooks/whop/route.ts" src/components/commerce/__tests__/whop-webhook.test.jsx
npx prettier --write "src/app/(commerce)/webhooks/whop/route.ts" src/components/commerce/__tests__/whop-webhook.test.jsx
git add "src/app/(commerce)/webhooks/whop/route.ts" src/components/commerce/__tests__/whop-webhook.test.jsx
git commit -m "✨ feat(commerce): resolve a Whop plan to a product, course or service

Services are searched first so the deposit query keeps its exact shape and
its tests stand unedited as the regression alarm for this migration.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Fulfil a boilerplate purchase from the webhook

**Files:**
- Modify: `src/app/(commerce)/webhooks/whop/route.ts`
- Test: `src/components/commerce/__tests__/whop-webhook.test.jsx`

**Interfaces:**
- Consumes: `findByPlan` (Task 5), `customFieldAnswer` (Task 4), `inviteToRepo` from `@/lib/commerce/githubInvite`, `seatLimit` from `@/lib/commerce/seats`, `sendBoilerplateConfirmationEmail` from `@/lib/commerce/fulfillment`.
- Produces: nothing later tasks consume.

- [ ] **Step 1: Write the failing tests**

Extend the mock block at the top of `whop-webhook.test.jsx` — add these two `vi.mock` calls beside the existing ones, and add `sendBoilerplateConfirmationEmail` to the existing fulfillment mock:

```jsx
vi.mock('@/lib/commerce/githubInvite', () => ({ inviteToRepo: vi.fn() }))
vi.mock('@/lib/commerce/fulfillment', () => ({
  sendDepositReceivedEmail: vi.fn().mockResolvedValue(undefined),
  notifyDepositReceived: vi.fn().mockResolvedValue(undefined),
  sendBoilerplateConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}))
```

and the matching imports:

```jsx
import { inviteToRepo } from '@/lib/commerce/githubInvite'
import { sendBoilerplateConfirmationEmail } from '@/lib/commerce/fulfillment'
```

Then add a helper beside `db()` and three tests:

```jsx
const kitDb = () =>
  find.mockImplementation(async ({ collection }) => {
    if (collection === 'purchases') return { docs: [] }
    if (collection === 'products') return { docs: [product] }
    return { docs: [] }
  })

const kitPayment = (over = {}) =>
  payment({
    plan: { id: 'plan_pro' },
    total: 499,
    custom_field_responses: [{ name: 'GitHub username', value: 'octocat' }],
    ...over,
  })

it('invites the buyer and marks the order sent', async () => {
  verifyWhopWebhook.mockReturnValue(event(kitPayment()))
  kitDb()
  const update = vi.fn().mockResolvedValue({})
  getPayloadClient.mockResolvedValue({ find, create, update })
  inviteToRepo.mockResolvedValue({
    ok: true,
    state: 'invited',
    url: 'https://github.com/invite/1',
    id: 1,
  })

  const res = await POST(request())

  expect(res.status).toBe(200)
  expect(inviteToRepo).toHaveBeenCalledWith({
    repo: 'amwaredotdev/warekit-next-netsuite',
    username: 'octocat',
  })
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({
      collection: 'purchases',
      data: expect.objectContaining({
        githubRepo: 'amwaredotdev/warekit-next-netsuite',
        githubInviteUrl: 'https://github.com/invite/1',
        fulfillmentStatus: 'sent',
      }),
    })
  )
  expect(sendBoilerplateConfirmationEmail).toHaveBeenCalledWith(
    expect.objectContaining({ to: 'client@example.com', githubUsername: 'octocat' })
  )
})

it('records the sale and queues a manual invite when GitHub refuses', async () => {
  verifyWhopWebhook.mockReturnValue(event(kitPayment()))
  kitDb()
  const update = vi.fn().mockResolvedValue({})
  getPayloadClient.mockResolvedValue({ find, create, update })
  inviteToRepo.mockResolvedValue({ ok: false, reason: 'rate-limited' })

  const res = await POST(request())

  expect(res.status).toBe(200) // the sale is good; GitHub is not our buyer's problem
  expect(create).toHaveBeenCalled()
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ fulfillmentStatus: 'pending_invite' }),
    })
  )
  expect(sendBoilerplateConfirmationEmail).toHaveBeenCalledWith(
    expect.objectContaining({ inviteUrl: null })
  )
})

it('does not attempt an invite when the buyer gave no username', async () => {
  verifyWhopWebhook.mockReturnValue(
    event(kitPayment({ custom_field_responses: [] }))
  )
  kitDb()
  const update = vi.fn().mockResolvedValue({})
  getPayloadClient.mockResolvedValue({ find, create, update })

  const res = await POST(request())

  expect(res.status).toBe(200)
  expect(inviteToRepo).not.toHaveBeenCalled()
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ fulfillmentStatus: 'pending_invite' }),
    })
  )
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run --project ui src/components/commerce/__tests__/whop-webhook.test.jsx`
Expected: FAIL — `inviteToRepo` is never called; there is no boilerplate branch yet.

- [ ] **Step 3: Implement the branch**

Add to the imports at the top of `src/app/(commerce)/webhooks/whop/route.ts`:

```ts
import { customFieldAnswer } from '@/lib/commerce/whop'
import { inviteToRepo } from '@/lib/commerce/githubInvite'
import { seatLimit } from '@/lib/commerce/seats'
import { sendBoilerplateConfirmationEmail } from '@/lib/commerce/fulfillment'
```

Add the constant near the top:

```ts
/* Must match the custom field's name on every kit plan in the Whop
   dashboard. Matching is case-insensitive and trimmed (see
   customFieldAnswer), so "Github username" on a plan still works. */
const GITHUB_FIELD = 'GitHub username'
```

Read the username where the payment is destructured:

```ts
  const githubUsername = customFieldAnswer(payment, GITHUB_FIELD)
```

Set the created purchase's `fulfillmentStatus` from the item rather than from `service`, and carry the username and licence key:

```ts
  const isBoilerplate = itemType === 'product' && item?.type === 'boilerplate'

        githubUsername: githubUsername || undefined,
        licenseKey: payment.membership?.license_key || undefined,
        whopMembershipId: payment.membership?.id || undefined,
        whopPlanId: planId || undefined,
        fulfillmentStatus: isBoilerplate
          ? 'pending_invite'
          : item
          ? 'not_required'
          : 'failed',
```

Then, after the create succeeds and before the existing deposit mail block, add:

```ts
  /* A kit is delivered by a repository invitation.
   *
   * Lifted from the Creem route, minus the part that no longer applies:
   * there is no "the buyer has not named an account yet" case, because
   * Whop asked for the username on the checkout form before taking the
   * card. An order with no username here is a buyer who left an optional
   * field blank, not a buyer mid-flow.
   *
   * Nothing in this block is allowed to throw. The sale is already
   * captured by the time it runs, so GitHub being unreachable must leave
   * a recorded order a human can finish -- never a 500 that makes Whop
   * redeliver a payment we already banked. */
  if (isBoilerplate) {
    const repo = typeof item?.githubRepo === 'string' ? item.githubRepo : null
    const invite = githubUsername
      ? await inviteToRepo({ repo, username: githubUsername })
      : null

    if (invite && !invite.ok) {
      console.error('Repo invite failed for payment', paymentId, {
        repo,
        reason: invite.reason,
      })
    }
    if (!githubUsername) {
      console.error('Kit purchase with no GitHub username', { paymentId, planId })
    }

    await payload
      .update({
        collection: 'purchases',
        id: purchase.id,
        overrideAccess: true,
        data: {
          githubRepo: repo || undefined,
          githubInviteUrl: (invite?.ok && invite.url) || undefined,
          /* The buyer is seat one. Recording it is what keeps a team
             licence honest -- otherwise a five-seat buyer invites five
             more people and gets six. */
          ...(githubUsername
            ? {
                seatMembers: [
                  {
                    githubUsername,
                    inviteUrl: (invite?.ok && invite.url) || undefined,
                    addedAt: new Date().toISOString(),
                  },
                ],
              }
            : {}),
          fulfillmentStatus: invite?.ok ? 'sent' : 'pending_invite',
        },
      })
      .catch(() =>
        console.error('Purchase invite update failed for payment', paymentId)
      )

    await sendBoilerplateConfirmationEmail({
      to: email,
      itemName: item?.name || 'your kit',
      githubUsername: githubUsername || undefined,
      repo: repo || undefined,
      inviteUrl: invite?.ok ? invite.url : null,
      alreadyHadAccess: invite?.ok && invite.state === 'already-a-collaborator',
      seats: seatLimit(item),
      seatsUrl: null,
      onboardingUrl: null,
    }).catch((err) =>
      console.error('Kit confirmation email failed', paymentId, err)
    )

    return new Response('ok', { status: 200 })
  }
```

The `payload.create` call must capture its result — change `await payload.create({…})` to `purchase = await payload.create({…})` with `let purchase` declared above the `try`.

- [ ] **Step 4: Run them and watch them pass**

Run: `npx vitest run --project ui`
Expected: PASS, deposit tests still unedited.

- [ ] **Step 5: Add `whopPlanId` and `whopMembershipId` to Purchases**

In `src/collections/Purchases.ts`, beside `whopPaymentId`:

```ts
    {
      name: 'whopPlanId',
      type: 'text',
      index: true,
      admin: { description: 'The plan this sale was made against.' },
    },
    {
      name: 'whopMembershipId',
      type: 'text',
      index: true,
      admin: {
        description:
          'The membership the sale created. Carries the licence key and is ' +
          'what community access follows from.',
      },
    },
```

Then `pnpm generate:types && npx tsc --noEmit`.

- [ ] **Step 6: Commit**

```bash
npx eslint "src/app/(commerce)/webhooks/whop/route.ts" src/collections/Purchases.ts src/components/commerce/__tests__/whop-webhook.test.jsx
npx prettier --write "src/app/(commerce)/webhooks/whop/route.ts" src/collections/Purchases.ts src/components/commerce/__tests__/whop-webhook.test.jsx
git add "src/app/(commerce)/webhooks/whop/route.ts" src/collections/Purchases.ts src/payload-types.ts src/components/commerce/__tests__/whop-webhook.test.jsx
git commit -m "✨ feat(commerce): deliver kits from the Whop webhook

Lifted from the Creem route, minus the case that no longer exists: Whop
asks for the GitHub username on the checkout form before taking the card,
so there is no buyer mid-onboarding. Nothing in the branch throws -- the
sale is already banked, so GitHub being down leaves an order a human can
finish rather than a 500 Whop redelivers.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Buy through the Whop embed

**Files:**
- Modify: `src/components/commerce/BuyButton.jsx`
- Test: `src/components/commerce/__tests__/buy-button.test.jsx`
- Delete: `src/lib/commerce/checkout.ts`

**Interfaces:**
- Consumes: `planId` (Task 3).
- Produces: `BuyButton` now takes a `planId` prop instead of driving a server action.

- [ ] **Step 1: Rewrite the test**

Replace `src/components/commerce/__tests__/buy-button.test.jsx` with:

```jsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/analytics/whop', () => ({
  WHOP_EVENT: { beginCheckout: 'begin_checkout' },
  whopTrack: vi.fn(),
}))

import { BuyButton } from '../BuyButton'

describe('BuyButton', () => {
  it('mounts the Whop embed for the plan', () => {
    const { container } = render(
      <BuyButton planId="plan_pro" itemType="product" slug="pro" name="Pro" price={499} />
    )
    const mount = container.querySelector('[data-whop-checkout-plan-id]')
    expect(mount).not.toBeNull()
    expect(mount.getAttribute('data-whop-checkout-plan-id')).toBe('plan_pro')
  })

  it('says the item is not on sale rather than rendering a dead button', () => {
    render(<BuyButton planId={null} itemType="product" slug="pro" name="Pro" />)
    expect(screen.getByRole('status')).toHaveTextContent(/not on sale yet/i)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run --project ui src/components/commerce/__tests__/buy-button.test.jsx`
Expected: FAIL — `BuyButton` still renders a form.

- [ ] **Step 3: Rewrite the component**

Replace `src/components/commerce/BuyButton.jsx` with:

```jsx
'use client'

import Script from 'next/script'
import { WHOP_EVENT, whopTrack } from '@/lib/analytics/whop'

/* Checkout is Whop's embed now, mounted from a plan id alone.
 *
 * There is no server action any more: Creem needed one to mint a session
 * before the buyer could be sent anywhere, and Whop does not -- the plan
 * IS the product. That deletes a round trip, a signed return URL and the
 * whole "this item is not on sale yet, nothing has been charged" recovery
 * path, because a missing plan id is now visible before the press rather
 * than after it.
 *
 * The GitHub username is a custom field on the plan, so it is asked
 * inside this embed, before the card. Nothing on our side collects it. */

export function BuyButton({ planId, itemType, slug, name, price }) {
  if (!planId) {
    return (
      <p role="status" className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">
        This item is not on sale yet. Nothing has been charged. Check back
        shortly or get in touch.
      </p>
    )
  }

  /* Fired as the embed opens rather than on a redirect: there is no longer
     a navigation for the event to outlive. No event id -- each open is an
     attempt, and Whop should see how many attempts a sale takes. */
  const reportCheckout = () =>
    whopTrack(WHOP_EVENT.beginCheckout, {
      value: typeof price === 'number' ? price : undefined,
      currency: 'USD',
      content_type: itemType,
      content_id: slug,
      content_name: name,
    })

  return (
    <div className="mt-8">
      <Script
        src="https://js.whop.com/static/checkout/loader.js"
        strategy="lazyOnload"
        onReady={reportCheckout}
      />
      <div data-whop-checkout-plan-id={planId} />
    </div>
  )
}
```

- [ ] **Step 4: Repoint every caller and delete the server action**

```bash
grep -rn "BuyButton\|createCheckout" src --include="*.jsx" --include="*.tsx" | grep -v __tests__
```

At each `<BuyButton …>` call site, pass `planId={planId(item)}` — importing `planId` from `@/lib/commerce/whopEnv` in the server component that renders it — and drop any `itemType`/`slug` props the new component no longer needs beyond analytics. Then:

```bash
git rm src/lib/commerce/checkout.ts
```

- [ ] **Step 5: Run everything and typecheck**

Run: `npx vitest run && npx tsc --noEmit && pnpm build`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
npx eslint src/components/commerce/BuyButton.jsx
npx prettier --write src/components/commerce/BuyButton.jsx
git add -A
git commit -m "✨ feat(commerce): buy kits through the Whop embed

The plan is the product, so there is no session to mint and no server
action. That deletes a round trip, a signed return URL, and the 'not on
sale yet' recovery path -- a missing plan id is now visible before the
press instead of after it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Simplify the post-purchase page

**Files:**
- Modify: `src/app/(site)/checkout/onboarding/page.tsx`
- Test: `src/components/commerce/__tests__/onboarding.test.jsx`

**Interfaces:**
- Consumes: `whopPaymentId` on `purchases` (existing).
- Produces: nothing later tasks consume.

The page stops being a gate that collects a username and becomes a thank-you that shows the licence key, the Discord link and the CLI command. It is found by `?payment_id=`, looked up on our own `purchases` table — no signature, because the page grants nothing.

- [ ] **Step 1: Write the failing test**

Replace the body of `src/components/commerce/__tests__/onboarding.test.jsx` with a test of `OnboardingSteps` in its no-username form:

```jsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OnboardingSteps } from '../OnboardingSteps'

describe('OnboardingSteps', () => {
  it('shows the licence key and never asks for a GitHub account', () => {
    render(
      <OnboardingSteps
        licenseKey="WAREKIT_ABC"
        repo="amwaredotdev/warekit-next-netsuite"
        discordUrl="https://discord.gg/x"
        cliCommand="npx warekit init"
      />
    )
    expect(screen.getByText('WAREKIT_ABC')).toBeInTheDocument()
    expect(screen.queryByLabelText(/github/i)).toBeNull()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run --project ui src/components/commerce/__tests__/onboarding.test.jsx`
Expected: FAIL — the component still renders the GitHub field.

- [ ] **Step 3: Strip the username step**

In `src/components/commerce/OnboardingSteps.jsx`, remove the `GithubAccountField` import, its render, and any props feeding it. Keep the licence key block, the repo line, the Discord step and the CLI block.

In `src/app/(site)/checkout/onboarding/page.tsx`, replace the signed-token lookup with:

```tsx
  const paymentId = (await searchParams).payment_id
  const purchase = paymentId
    ? (
        await payload.find({
          collection: 'purchases',
          where: { whopPaymentId: { equals: String(paymentId) } },
          limit: 1,
          depth: 1,
          overrideAccess: true,
        })
      ).docs[0]
    : null
```

Delete the `onboardingPath` / `ACCESS_LINK_SECRET` imports and the redirect-on-bad-signature branch. The page shows a generic thank-you when `purchase` is null rather than 404ing — it grants nothing, so a stale link is harmless.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run --project ui && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npx eslint "src/app/(site)/checkout/onboarding/page.tsx" src/components/commerce/OnboardingSteps.jsx
npx prettier --write "src/app/(site)/checkout/onboarding/page.tsx" src/components/commerce/OnboardingSteps.jsx
git add -A
git commit -m "♻️ refactor(commerce): make onboarding a thank-you, not a gate

The username is collected at checkout now, so this page grants nothing and
needs no signature. A stale link shows a generic thank-you rather than a
404, because there is nothing behind it to protect.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Delete Creem

**Files:**
- Delete: `src/lib/commerce/creem.ts`, `creemPriceEndpoint.ts`, `accessToken.ts`, `onboardingLink.ts`, `claim.ts`, `src/app/(commerce)/webhooks/creem/route.ts`, `src/app/(site)/access/`, `src/components/commerce/ClaimFreeKit.jsx`, `src/components/analytics/TrackPurchase.jsx`, `src/fields/creem/`, and their tests
- Modify: `src/collections/Products.ts`, `src/collections/Courses.ts`, `src/collections/Services.ts`, `.env.example`, `docs/whop-events.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Delete the modules and their tests**

```bash
git rm -r "src/app/(commerce)/webhooks/creem" "src/app/(site)/access" src/fields/creem
git rm src/lib/commerce/creem.ts src/lib/commerce/creemPriceEndpoint.ts \
       src/lib/commerce/accessToken.ts src/lib/commerce/onboardingLink.ts \
       src/lib/commerce/claim.ts \
       src/components/commerce/ClaimFreeKit.jsx \
       src/components/analytics/TrackPurchase.jsx
git rm src/lib/commerce/__tests__/accessToken.test.js \
       src/lib/commerce/__tests__/onboardingLink.test.js \
       src/components/commerce/__tests__/claim-free-kit.test.jsx
```

- [ ] **Step 2: Drop the Creem fields from the collections**

Remove the `creemProductField` import and its call from `src/collections/Products.ts` and `src/collections/Courses.ts`. Remove the `creemProductId` field object from `src/collections/Services.ts`.

- [ ] **Step 3: Fix every remaining reference**

```bash
grep -rln "creem\|ClaimFreeKit\|TrackPurchase\|access/" src --include="*.ts" --include="*.tsx" --include="*.jsx" | grep -v node_modules
```

Work the list until it is empty. Expect hits in `catalog-cards.jsx`, `pricing.jsx`, `faq.jsx`, `storefront.legacy.jsx`, `PurchaseLedger.tsx`, `AmountCell.tsx`, `src/app/(site)/pricing/page.tsx`, `products/[slug]/page.tsx`, `courses/[slug]/page.tsx` and `src/lib/ai/__tests__/catalog.test.js`. Free Lite now renders a `BuyButton` pointed at its $0 plan, not `ClaimFreeKit`.

- [ ] **Step 4: Clean the env and the pixel doc**

Delete `CREEM_API_URL`, `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET` and `ACCESS_LINK_SECRET` from `.env.example`.

In `docs/whop-events.md`, delete the `purchase` row from the table and replace the first rule with:

```markdown
- **We fire no `purchase` event at all.** Every sale is a Whop checkout
  now, and Whop records its own sales and rejects the duplicate. This is
  the same rule that always applied to deposits — consolidation just made
  it apply to everything. `begin_checkout` still fires, because Whop
  cannot see an embed that was opened and abandoned.
```

Delete the `WHOP_EVENT.purchase` entry from `src/lib/analytics/whop.ts` and its assertions in `src/lib/analytics/__tests__/whop.test.js`.

- [ ] **Step 5: Verify nothing is left**

```bash
grep -ri creem src/ ; echo "exit=$?"
```

Expected: no output, `exit=1`. **Do not grep for `whop`** — every hit is supposed to be there.

- [ ] **Step 6: Full gate**

```bash
npx vitest run && npx tsc --noEmit && pnpm build
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
npx eslint src && npx prettier --write "src/**/*.{ts,tsx,js,jsx}"
git add -A
git commit -m "🔥 chore(commerce): delete Creem

Also retires the signed /access links and the bespoke free-claim route:
no product ever had a download file, and Lite is a \$0 Whop plan now, so
a free claim becomes a real membership instead of a side door.

We fire no purchase pixel event any more. Every sale is a Whop checkout,
and Whop rejects the duplicate -- the rule that always governed deposits
now governs everything.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Drop the Creem columns

**Files:**
- Modify: `src/collections/Purchases.ts`
- Modify: `src/components/admin/PurchaseLedger.tsx`, `src/components/admin/AmountCell.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: the final `purchases` shape.

Last on purpose — nothing references these fields now, so `tsc` stays green.

- [ ] **Step 1: Delete the test rows**

```sql
DELETE FROM purchases;
```

Run it against the project database. All four rows are test data (two `@resend.dev`, two sandbox Whop with `fulfillmentStatus: failed`); the spec records this.

- [ ] **Step 2: Remove the fields**

From `src/collections/Purchases.ts` delete the field objects for `provider`, `creemProductId`, `creemOrderId`, `creemSubscriptionId`, `creemTransactionId`, `creemRequestId` and `accessTokenJti`.

Update the admin metadata:

```ts
    listSearchableFields: ['email', 'githubUsername', 'whopPaymentId'],
```

and change `whopPaymentId`'s description to `'Idempotency key for a sale. Every purchase is a Whop payment.'`

Update `licenseKey`'s description to `'Issued by Whop with the membership. Empty means the plan issues none.'`

- [ ] **Step 3: Remove `provider: 'whop'` from the webhook and its test**

`provider` no longer exists, so delete the line from the `payload.create` data in `src/app/(commerce)/webhooks/whop/route.ts` **and** the `provider: 'whop'` assertion in the deposit test in `whop-webhook.test.jsx`.

> This is the one edit to a deposit test the migration permits. The global constraint protects deposit *behaviour*; asserting a column that no longer exists is not behaviour. Change only that line.

- [ ] **Step 4: Fix the admin components**

In `PurchaseLedger.tsx` and `AmountCell.tsx`, remove any read of `provider`, `creemOrderId` or the Creem/Whop split in the revenue figures. Sandbox rows are still excluded via `whopEnvironment`.

- [ ] **Step 5: Push the schema and run the gate**

```bash
pnpm generate:types && npx tsc --noEmit && npx vitest run && pnpm build
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
npx eslint src/collections/Purchases.ts src/components/admin/PurchaseLedger.tsx src/components/admin/AmountCell.tsx
npx prettier --write src/collections/Purchases.ts src/components/admin/PurchaseLedger.tsx src/components/admin/AmountCell.tsx
git add -A
git commit -m "🗃️ chore(db): drop the Creem columns and the provider select

Dropped last, after the code that referenced them, or regenerating
payload-types leaves the Creem route pointing at fields that no longer
exist and tsc fails. The spec sequenced this earlier; that ordering does
not build.

provider goes with them: with one processor, a column that can only hold
one value is a lie that costs a reader time.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Repoint the simulation suite

**Files:**
- Modify: `sim/3-checkout.sim.test.mjs`, `sim/5-free-claim.sim.test.mjs`, `sim/1-seed.sim.test.mjs`, `sim/2-seed-services.sim.test.mjs`
- Delete: `sim/6-whop-engagements.sim.test.mjs` if it duplicates the new coverage

**Interfaces:**
- Consumes: everything above.
- Produces: the preflight that catches a misconfigured catalogue before a customer does.

`sim/0-github-token.sim.test.mjs` stays exactly as it is — we own the invite again, so it is the right preflight.

- [ ] **Step 1: Rewrite the checkout sim as a plan-configuration preflight**

Replace the Creem assertions in `sim/3-checkout.sim.test.mjs` with, for every published product and course: `planId(item)` resolves to a non-empty id, and `GET https://api.whop.com/api/v1/plans/{id}` with `WHOP_API_KEY` answers 200. For every product of `type: 'boilerplate'`, additionally assert the plan carries a custom field whose name trims and lowercases to `github username`.

This is the check that catches the failure the whole design rests on — a kit plan missing its username field takes money and delivers nothing.

- [ ] **Step 2: Retire the free-claim sim**

`sim/5-free-claim.sim.test.mjs` tested a route that no longer exists. Rewrite it to assert Lite's plan resolves and is priced at 0, or `git rm` it if Step 1 already covers that.

- [ ] **Step 3: Run the suite**

```bash
pnpm sim
```

Expected: PASS, or a clear report naming any product whose plan is missing or misconfigured. Remember sim runs through vitest, not `tsx` — `payload.config` cannot load under `tsx` in this project.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "✅ test(sim): preflight Whop plans and the kit username field

The check that matters: a kit plan missing its GitHub username custom
field takes money and delivers nothing, and nothing else in the system
would notice until a customer was already waiting.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage.** Locked decisions map to tasks: platform → 5–7, 9; GitHub delivery kept → 6; username at checkout → 1, 4, 6; collaborator Read → unchanged in `githubInvite.ts`; free Lite as $0 plan → 9 step 3, 11; Team seats → `seats.ts` untouched, seat one recorded in 6; embedded checkout → 7; deposits unchanged → global constraint, enforced in 5; downloads deferred → 9; licence key → 6; no activation cap → nothing to build, correctly absent; `purchase` pixel stops → 9; idempotency → unchanged; schema push → 2, 6, 10.

**Deliberately not in this plan:** the community (its own plan, `2026-09-20-whop-community.md`), the kit-repo Turborepo restructure and `LICENSE.md` (both live in the kit repos), and refund-driven access revocation (spec open item 7 — worth doing, but it is a new behaviour rather than a migration step, and folding it in here would blur the regression boundary that protects deposits).

**Ordering correction.** The spec's Phase 1-before-Phase-3 does not build; this plan inverts it and Task 10 explains why in its commit message.

**Type consistency.** `planId(item, env?)` is defined in Task 3 and used in 5 and 7. `customFieldAnswer(payment, name)` is defined in Task 4 and used in 6. `findByPlan(payload, plan)` returns `{ collection, item }` in Task 5 and is consumed in 6. `inviteToRepo({ repo, username })` and its `InviteResult` shape are pre-existing and used unchanged in 6.
