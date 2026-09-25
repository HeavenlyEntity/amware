# WareKit Community Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every buyer a tier-appropriate chat channel on `amware.dev`, so a free Lite claim becomes a member rather than an email address — the path from a $0 kit to a fractional-CTO engagement.

**Architecture:** Whop channels are "connected to products and memberships," so **membership is the access-control list** and we write no entitlement logic. Our server enrols each buyer as a Whop connected account, mints a scoped chat token, and the browser renders Whop's `ChatElement` against the channel their tier grants.

**Tech Stack:** Next.js 16 App Router, React 19, `@whop/sdk` (server), `@whop/embedded-components-react-js` + `@whop/embedded-components-vanilla-js` (client), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-20-whop-consolidation-design.md` (§ Community — the actual design)

**Prerequisite:** `docs/superpowers/plans/2026-09-20-whop-consolidation.md` must be complete. This plan reads `whopMembershipId` off `purchases`, which Task 6 of that plan introduces.

## Global Constraints

- **`WHOP_API_KEY` is server-only.** Never in browser, mobile or client-side code. The browser receives a short-lived scoped token from our own endpoint, never the key.
- **`motion` is imported from `motion/react`, never `framer-motion`**, and only in client components.
- **Lint with the ESLint CLI**, never `next lint`.
- **Never start a dev server.**
- **Two vitest projects.** `engine` runs `src/lib/**/__tests__/**/*.test.js` in node **with relative imports only**. `ui` runs `src/components/**/__tests__/**/*.test.jsx` and `src/app/**/__tests__/**/*.test.jsx` in jsdom with the `@/` alias.
- **Graceful error handling on public pages** — a `loadError` prop and a fallback UI with refresh. Staff pages throw.
- **Loading skeletons cover only the main content area**, not the nav sidebar.
- **Commit messages use gitmoji.dev** and end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Verification gate after every task:** `npx eslint <changed files>`, `npx prettier --write <changed files>`, `npx tsc --noEmit`.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `src/lib/commerce/whopAccount.ts` | Enrol a buyer as a Whop connected account; return the Whop user id | 2 |
| `src/lib/commerce/community.ts` | Map a purchase to the channel ids its tier grants | 3 |
| `src/app/api/chat/token/route.ts` | Mint a scoped chat token for the signed-in buyer | 4 |
| `src/components/community/CommunityChat.jsx` | Render `ChatElement` against a channel | 5 |
| `src/app/(site)/community/page.tsx` | The page: resolve the visitor, pick a channel, render or explain | 5 |
| `src/collections/Purchases.ts` | Add `whopUserId` | 2 |
| `src/collections/Products.ts` | Add `communityChannelId` | 3 |

---

### Task 1: Create the channels and record their ids

A **gate, not code.** Tasks 3 and 5 are written against real `chat_feed_…` ids.

**Files:**
- Create: `docs/whop-community.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the channel id per tier, consumed by Task 3.

- [ ] **Step 1: Create the channels in the Whop dashboard**

On the WareKit product, create chat channels and attach each to the plans whose buyers should reach it:

| Channel | Attached to |
|---|---|
| `#warekit` | every kit plan, including the $0 Lite plans |
| `#pro-support` | Pro and Team plans |
| `#team` | Team plans only |

- [ ] **Step 2: Record the ids**

Channel ids start with `chat_feed_`. Write `docs/whop-community.md`:

```markdown
# Community channels

Channel ids are per environment — the sandbox company has its own.

| Channel | Tier | Production | Sandbox |
|---|---|---|---|
| #warekit | Lite, Pro, Team | chat_feed_… | chat_feed_… |
| #pro-support | Pro, Team | chat_feed_… | chat_feed_… |
| #team | Team | chat_feed_… | chat_feed_… |

**Company id (`biz_…`):** … (production) / … (sandbox)

Access follows the membership: a channel is attached to plans in the Whop
dashboard, so nothing in this codebase decides who may read one. If someone
can see a channel they should not, fix the plan attachment in Whop — do not
add a check here.
```

- [ ] **Step 3: Commit**

```bash
git add docs/whop-community.md
git commit -m "📝 docs(community): record the channel ids per tier

Access follows the membership, so these ids are configuration rather than
policy. Nothing in the codebase decides who may read a channel.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Enrol a buyer as a Whop account

**Files:**
- Create: `src/lib/commerce/whopAccount.ts`
- Test: `src/lib/commerce/__tests__/whopAccount.test.js`
- Modify: `src/collections/Purchases.ts`, `src/app/(commerce)/webhooks/whop/route.ts`

**Interfaces:**
- Consumes: `WHOP_API_KEY`.
- Produces: `ensureWhopAccount({ email, name }): Promise<{ ok: true; userId: string } | { ok: false; reason: AccountFailure }>`, consumed by Task 4.

- [ ] **Step 1: Write the failing test**

Create `src/lib/commerce/__tests__/whopAccount.test.js`:

```js
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/* Relative import: the engine project defines no `@/` alias. */
import { ensureWhopAccount } from '../whopAccount'

const reply = (status, body = null) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  })
}

beforeEach(() => {
  process.env.WHOP_API_KEY = 'key_test'
})

afterEach(() => {
  delete process.env.WHOP_API_KEY
  vi.restoreAllMocks()
})

describe('ensureWhopAccount', () => {
  it('returns the Whop user id from a created account', async () => {
    reply(200, { owner_user: { id: 'user_123' } })
    const result = await ensureWhopAccount({ email: 'a@b.com', name: 'Grace' })
    expect(result).toEqual({ ok: true, userId: 'user_123' })
  })

  it('reports not-configured rather than calling out with no key', async () => {
    delete process.env.WHOP_API_KEY
    global.fetch = vi.fn()
    const result = await ensureWhopAccount({ email: 'a@b.com' })
    expect(result).toEqual({ ok: false, reason: 'not-configured' })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('never throws when Whop is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNRESET'))
    await expect(
      ensureWhopAccount({ email: 'a@b.com' })
    ).resolves.toEqual({ ok: false, reason: 'unreachable' })
  })

  it('reports a rejected response without inventing a user id', async () => {
    reply(422, { error: 'invalid email' })
    const result = await ensureWhopAccount({ email: 'nope' })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('rejected')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run --project engine src/lib/commerce/__tests__/whopAccount.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement it**

Create `src/lib/commerce/whopAccount.ts`:

```ts
/*
 * Enrols a buyer as a Whop connected account so they can be handed a chat
 * token later.
 *
 * `POST /api/v1/accounts` is the whole API. The response carries
 * `owner_user.id`, which is the id chat tokens are minted against, so that
 * is the one value worth keeping.
 *
 * Nothing here throws. This runs inside the payment webhook, where an
 * exception means Whop redelivers a payment we already banked, and where
 * Whop's account API being slow says nothing about whether the sale was
 * good. Every failure comes back as a value so the caller can record the
 * sale and leave the community seat to be claimed later.
 */

const API = 'https://api.whop.com/api/v1'
const TIMEOUT_MS = 8000

export type AccountFailure =
  | 'not-configured' // no WHOP_API_KEY
  | 'rejected' // Whop refused the payload
  | 'unreachable' // timeout, DNS, 5xx

export type AccountResult =
  | { ok: true; userId: string }
  | { ok: false; reason: AccountFailure; detail?: string }

export async function ensureWhopAccount(args: {
  email: string
  name?: string
  /** Our purchase id, so a Whop account can be traced back here. */
  internalId?: string
}): Promise<AccountResult> {
  const key = process.env.WHOP_API_KEY
  if (!key) return { ok: false, reason: 'not-configured' }

  let res: Response
  try {
    res = await fetch(`${API}/accounts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: args.email,
        title: args.name,
        metadata: args.internalId
          ? { internal_user_id: args.internalId }
          : undefined,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    return { ok: false, reason: 'unreachable' }
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    return {
      ok: false,
      reason: res.status >= 500 ? 'unreachable' : 'rejected',
      detail: detail.slice(0, 300),
    }
  }

  const body = await res.json().catch(() => null)
  const userId = body?.owner_user?.id
  /* A 200 with no id is a shape change on Whop's side, not a success.
     Reporting it as rejected keeps a null out of the database. */
  if (typeof userId !== 'string' || !userId) {
    return { ok: false, reason: 'rejected', detail: 'no owner_user.id' }
  }
  return { ok: true, userId }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run --project engine src/lib/commerce/__tests__/whopAccount.test.js`
Expected: PASS.

- [ ] **Step 5: Store the id and call it from the webhook**

Add to `src/collections/Purchases.ts`, beside `whopMembershipId`:

```ts
    {
      name: 'whopUserId',
      type: 'text',
      index: true,
      admin: {
        description:
          'The buyer as a Whop account. Chat tokens are minted against ' +
          'this id. Empty means the community seat was never claimed.',
      },
    },
```

In `src/app/(commerce)/webhooks/whop/route.ts`, after the purchase is created and before the branch returns, best-effort:

```ts
  /* Community enrolment. Best effort by design: a buyer who cannot be
     enrolled right now still bought the thing, and the seat can be claimed
     on their first visit to /community. Failing the webhook here would
     make Whop redeliver a captured payment over a chat room. */
  const account = await ensureWhopAccount({
    email,
    name: payment.user?.name || undefined,
    internalId: String(purchase.id),
  })
  if (account.ok) {
    await payload
      .update({
        collection: 'purchases',
        id: purchase.id,
        overrideAccess: true,
        data: { whopUserId: account.userId },
      })
      .catch(() => console.error('Whop user id not stored', paymentId))
  } else {
    console.error('Whop account enrolment failed', paymentId, account.reason)
  }
```

Then `pnpm generate:types && npx tsc --noEmit`.

- [ ] **Step 6: Commit**

```bash
npx eslint src/lib/commerce/whopAccount.ts src/lib/commerce/__tests__/whopAccount.test.js src/collections/Purchases.ts "src/app/(commerce)/webhooks/whop/route.ts"
npx prettier --write src/lib/commerce/whopAccount.ts src/lib/commerce/__tests__/whopAccount.test.js src/collections/Purchases.ts "src/app/(commerce)/webhooks/whop/route.ts"
git add -A
git commit -m "✨ feat(community): enrol buyers as Whop accounts

Best effort inside the webhook. A buyer who cannot be enrolled right now
still bought the thing, and the seat can be claimed on their first visit.
Failing a captured payment over a chat room would be the wrong trade.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Map a purchase to its channel

**Files:**
- Create: `src/lib/commerce/community.ts`
- Test: `src/lib/commerce/__tests__/community.test.js`
- Modify: `src/collections/Products.ts`

**Interfaces:**
- Consumes: the channel ids from Task 1.
- Produces: `channelsFor(purchases): string[]` — every channel the visitor may open, most specific first. Consumed by Task 5.

- [ ] **Step 1: Add the field**

In `src/collections/Products.ts`, after `whopSandboxPlanId`:

```ts
    {
      name: 'communityChannelId',
      type: 'text',
      admin: {
        description:
          'The chat_feed_… channel this product grants. Whop enforces who ' +
          'may read it via the plan attachment; this is only how the site ' +
          'knows which one to open by default.',
      },
    },
```

Then `pnpm generate:types`.

- [ ] **Step 2: Write the failing test**

Create `src/lib/commerce/__tests__/community.test.js`:

```js
import { describe, expect, it } from 'vitest'

import { channelsFor } from '../community'

const purchase = (channel, seats = 1) => ({
  status: 'paid',
  item: { value: { communityChannelId: channel, seats } },
})

describe('channelsFor', () => {
  it('returns each purchase channel once, highest seat count first', () => {
    expect(
      channelsFor([purchase('chat_feed_general'), purchase('chat_feed_team', 5)])
    ).toEqual(['chat_feed_team', 'chat_feed_general'])
  })

  it('drops duplicates so two kits on one channel open one room', () => {
    expect(
      channelsFor([purchase('chat_feed_general'), purchase('chat_feed_general')])
    ).toEqual(['chat_feed_general'])
  })

  it('ignores refunded purchases and items with no channel', () => {
    expect(
      channelsFor([
        { status: 'refunded', item: { value: { communityChannelId: 'chat_feed_x' } } },
        { status: 'paid', item: { value: {} } },
        { status: 'paid' },
      ])
    ).toEqual([])
  })

  it('is empty for no purchases at all', () => {
    expect(channelsFor([])).toEqual([])
    expect(channelsFor(null)).toEqual([])
  })
})
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run --project engine src/lib/commerce/__tests__/community.test.js`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement it**

Create `src/lib/commerce/community.ts`:

```ts
/*
 * Which chat channels a visitor's purchases open.
 *
 * This decides which room the page shows FIRST. It does not decide who is
 * allowed in one -- a Whop channel is attached to plans in the dashboard,
 * so the membership is the access-control list and Whop enforces it. If
 * this function is ever wrong, a visitor sees the wrong tab, not someone
 * else's conversation.
 *
 * That distinction is worth keeping: the moment this file starts being
 * treated as the gate, the gate is in the wrong place.
 *
 * Ordering is by seat count descending, so a Team buyer lands in the room
 * they paid most for rather than in #general.
 */

type PurchaseLike = {
  status?: string | null
  item?: { value?: { communityChannelId?: string | null; seats?: number | null } | null } | null
}

export function channelsFor(
  purchases: PurchaseLike[] | null | undefined
): string[] {
  if (!Array.isArray(purchases)) return []

  const ranked = purchases
    .filter((p) => p?.status === 'paid')
    .map((p) => ({
      channel: p.item?.value?.communityChannelId,
      seats: p.item?.value?.seats ?? 1,
    }))
    .filter(
      (r): r is { channel: string; seats: number } =>
        typeof r.channel === 'string' && r.channel.length > 0
    )
    .sort((a, b) => b.seats - a.seats)

  return [...new Set(ranked.map((r) => r.channel))]
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npx vitest run --project engine src/lib/commerce/__tests__/community.test.js`
Expected: PASS.

- [ ] **Step 6: Fill the channel ids in the admin, then commit**

Paste each product's `chat_feed_…` id from Task 1 into the admin.

```bash
npx eslint src/lib/commerce/community.ts src/lib/commerce/__tests__/community.test.js src/collections/Products.ts
npx prettier --write src/lib/commerce/community.ts src/lib/commerce/__tests__/community.test.js src/collections/Products.ts
git add -A
git commit -m "✨ feat(community): map a purchase to the channels it opens

Decides which room opens first, never who may enter one -- the plan
attachment in Whop is the access-control list. If this is ever wrong a
visitor sees the wrong tab, not someone else's conversation.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Mint a scoped chat token

**Files:**
- Create: `src/app/api/chat/token/route.ts`
- Test: `src/app/api/chat/__tests__/token.test.jsx`

**Interfaces:**
- Consumes: `whopUserId` on `purchases` (Task 2), `WHOP_API_KEY`, `WHOP_COMPANY_ID`.
- Produces: `POST /api/chat/token` → `{ token }` or a 4xx. Consumed by Task 5.

The browser posts an email; the server proves that email owns a paid purchase and mints a token for **that** purchase's Whop user id. It never trusts a user id from the client.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/chat/__tests__/token.test.jsx`:

```jsx
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/getPayloadClient', () => ({ getPayloadClient: vi.fn() }))

import { getPayloadClient } from '@/lib/getPayloadClient'
import { POST } from '@/app/api/chat/token/route'

const request = (body) =>
  new Request('https://www.amware.dev/api/chat/token', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })

let find

beforeEach(() => {
  vi.clearAllMocks()
  process.env.WHOP_API_KEY = 'key_test'
  process.env.WHOP_COMPANY_ID = 'biz_test'
  find = vi.fn()
  getPayloadClient.mockResolvedValue({ find })
})

describe('POST /api/chat/token', () => {
  it('mints a token for the Whop user the purchase names', async () => {
    find.mockResolvedValue({ docs: [{ id: 1, whopUserId: 'user_123' }] })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token: 'tok_abc' }),
    })

    const res = await POST(request({ email: 'a@b.com' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ token: 'tok_abc' })
    const sent = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(sent.user_id).toBe('user_123')
    expect(sent.company_id).toBe('biz_test')
  })

  it('refuses an email with no paid purchase', async () => {
    find.mockResolvedValue({ docs: [] })
    global.fetch = vi.fn()
    const res = await POST(request({ email: 'stranger@example.com' }))
    expect(res.status).toBe(403)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('ignores a user id supplied by the caller', async () => {
    find.mockResolvedValue({ docs: [{ id: 1, whopUserId: 'user_123' }] })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token: 'tok_abc' }),
    })

    await POST(request({ email: 'a@b.com', user_id: 'user_someone_else' }))

    const sent = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(sent.user_id).toBe('user_123')
  })

  it('answers 400 for a body with no email', async () => {
    const res = await POST(request({}))
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run --project ui src/app/api/chat/__tests__/token.test.jsx`
Expected: FAIL — route not found.

- [ ] **Step 3: Implement the route**

Create `src/app/api/chat/token/route.ts`:

```ts
import { getPayloadClient } from '@/lib/getPayloadClient'

export const dynamic = 'force-dynamic'

/* A short-lived, scoped chat token for one buyer.
 *
 * The API key never leaves this server. What the browser gets is a token
 * scoped to one company, one user and a fixed list of actions -- so a
 * leaked token buys someone a chat session, not our account.
 *
 * The caller supplies an email and nothing else that matters. Any user id
 * in the body is ignored: the server looks the email up in our own
 * purchases table and mints for the id THAT row names. Trusting a
 * client-supplied user id would let anyone request a token as anyone.
 *
 * An email with no paid purchase gets 403 with no detail. Saying which
 * emails have bought would turn this into a customer-list oracle.
 */

const SCOPES = [
  'chat:message:create',
  'chat:read',
  'dms:read',
  'dms:message:manage',
  'dms:channel:manage',
  'support_chat:read',
  'support_chat:message:create',
]

export async function POST(req: Request) {
  const key = process.env.WHOP_API_KEY
  const companyId = process.env.WHOP_COMPANY_ID
  if (!key || !companyId) {
    console.error('Chat token requested with WHOP_API_KEY/COMPANY_ID unset')
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }

  let email: unknown
  try {
    email = (await req.json())?.email
  } catch {
    return Response.json({ error: 'bad request' }, { status: 400 })
  }
  if (typeof email !== 'string' || !email.includes('@')) {
    return Response.json({ error: 'bad request' }, { status: 400 })
  }

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'purchases',
    where: {
      and: [
        { email: { equals: email } },
        { status: { equals: 'paid' } },
        { whopUserId: { exists: true } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })

  const userId = docs[0]?.whopUserId
  if (!userId) {
    return Response.json({ error: 'no access' }, { status: 403 })
  }

  let res: Response
  try {
    res = await fetch('https://api.whop.com/api/v1/access_tokens', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        company_id: companyId,
        user_id: userId,
        scoped_actions: SCOPES,
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }

  if (!res.ok) {
    console.error('Whop refused a chat token', res.status)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }

  const body = await res.json().catch(() => null)
  if (typeof body?.token !== 'string') {
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
  return Response.json({ token: body.token })
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run --project ui src/app/api/chat/__tests__/token.test.jsx`
Expected: PASS.

- [ ] **Step 5: Add the env var**

Append to `.env.example`:

```bash
# The Whop company the community lives in (biz_…), used to mint chat tokens.
# Unset, /community explains itself and renders no chat rather than erroring.
WHOP_COMPANY_ID=
```

- [ ] **Step 6: Commit**

```bash
npx eslint "src/app/api/chat/token/route.ts" "src/app/api/chat/__tests__/token.test.jsx"
npx prettier --write "src/app/api/chat/token/route.ts" "src/app/api/chat/__tests__/token.test.jsx"
git add -A
git commit -m "✨ feat(community): mint scoped chat tokens server-side

The API key never leaves the server, and a user id in the request body is
ignored -- the server mints for the id our own purchases row names.
Trusting a client-supplied id would let anyone request a token as anyone.
An email with no purchase gets a bare 403, so this cannot be used as a
customer-list oracle.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The community page

**Files:**
- Create: `src/components/community/CommunityChat.jsx`
- Create: `src/app/(site)/community/page.tsx`
- Test: `src/components/community/__tests__/community-chat.test.jsx`

**Interfaces:**
- Consumes: `channelsFor` (Task 3), `POST /api/chat/token` (Task 4).
- Produces: the page.

- [ ] **Step 1: Install the element packages**

```bash
pnpm add @whop/embedded-components-react-js @whop/embedded-components-vanilla-js
```

- [ ] **Step 2: Write the failing test**

Create `src/components/community/__tests__/community-chat.test.jsx`:

```jsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@whop/embedded-components-react-js', () => ({
  Elements: ({ children }) => <div data-testid="elements">{children}</div>,
  ChatSession: ({ children }) => <div data-testid="session">{children}</div>,
  ChatElement: ({ options }) => (
    <div data-testid="chat" data-channel={options.channelId} />
  ),
}))
vi.mock('@whop/embedded-components-vanilla-js', () => ({
  loadWhopElements: () => ({}),
}))

import { CommunityChat } from '../CommunityChat'

describe('CommunityChat', () => {
  it('opens the first channel it is given', () => {
    render(<CommunityChat channels={['chat_feed_team', 'chat_feed_general']} email="a@b.com" />)
    expect(screen.getByTestId('chat')).toHaveAttribute(
      'data-channel',
      'chat_feed_team'
    )
  })

  it('explains itself rather than rendering an empty frame when there is no channel', () => {
    render(<CommunityChat channels={[]} email="a@b.com" />)
    expect(screen.queryByTestId('chat')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent(/kit/i)
  })

  it('shows a refresh affordance when the token could not be fetched', () => {
    render(<CommunityChat channels={['chat_feed_general']} email="a@b.com" loadError />)
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run --project ui src/components/community/__tests__/community-chat.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the component**

Create `src/components/community/CommunityChat.jsx`:

```jsx
'use client'

import { useState } from 'react'
import {
  ChatElement,
  ChatSession,
  Elements,
} from '@whop/embedded-components-react-js'
import { loadWhopElements } from '@whop/embedded-components-vanilla-js'

const elements = loadWhopElements()

/* Whop's chat, on our domain.
 *
 * The SDK asks for a token via the callback and refreshes it itself, so
 * this holds no credential and no expiry logic. `channels` is already
 * ordered by the server -- most specific first -- so index 0 is the room
 * this visitor most paid for.
 *
 * Empty `channels` is the ordinary state for someone who has not claimed a
 * kit, not an error. It gets a sentence and a way in, because a blank
 * frame on a page called "community" reads as broken software. */

export function CommunityChat({ channels, email, loadError = false }) {
  const [channel, setChannel] = useState(channels[0] ?? null)

  if (loadError) {
    return (
      <div role="alert" className="rounded-lg border p-6 text-sm">
        <p>The community could not be loaded just now.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="amw-cta mt-4"
        >
          Refresh
        </button>
      </div>
    )
  }

  if (!channel) {
    return (
      <p role="status" className="rounded-lg border p-6 text-sm">
        The community opens with your first kit. Claim WareKit Lite — it is
        free — and you will land in <strong>#warekit</strong> straight away.
      </p>
    )
  }

  const getToken = async () => {
    const res = await fetch('/api/chat/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!res.ok) throw new Error(`token ${res.status}`)
    return (await res.json()).token
  }

  return (
    <div>
      {channels.length > 1 && (
        <div className="mb-4 flex gap-2" role="tablist">
          {channels.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={id === channel}
              onClick={() => setChannel(id)}
              className="amw-chip"
            >
              {id === channels[0] ? 'Your tier' : 'General'}
            </button>
          ))}
        </div>
      )}
      <Elements elements={elements}>
        <ChatSession token={getToken}>
          <ChatElement
            options={{ channelId: channel }}
            style={{ height: '70dvh', width: '100%' }}
          />
        </ChatSession>
      </Elements>
    </div>
  )
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npx vitest run --project ui src/components/community/__tests__/community-chat.test.jsx`
Expected: PASS.

- [ ] **Step 6: Add the page**

Create `src/app/(site)/community/page.tsx` — a server component that reads the visitor's email (from the `?email=` a confirmation email links with, or whatever session exists), loads their paid purchases with `depth: 1`, calls `channelsFor`, and renders `<CommunityChat channels={…} email={…} />`. Wrap the Payload query in `try/catch` and pass `loadError` on failure — this is a public page, so it degrades rather than throwing.

- [ ] **Step 7: Full gate and commit**

```bash
npx vitest run && npx tsc --noEmit && pnpm build
npx eslint src/components/community "src/app/(site)/community"
npx prettier --write "src/components/community/**/*.jsx" "src/app/(site)/community/page.tsx"
git add -A
git commit -m "✨ feat(community): embed Whop chat at /community

The SDK holds the token and refreshes it, so the component carries no
credential. An empty channel list is the ordinary state for someone who
has not claimed a kit, so it gets a sentence and a way in rather than a
blank frame on a page called community.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage** (§ Community): membership-gated channels → Tasks 1, 3 (enforcement stays in Whop); the tier ladder → Task 1's table and `channelsFor`'s ordering; Chat Element embedded on `amware.dev` → Task 5; free Lite landing a claimer in `#warekit` → Task 1 attaches the channel to the $0 plans, Task 2 enrols them, Task 5 opens it.

**Deliberately not in this plan:** forums, DMs, the 1:1 engagement support chat, push notifications, affiliates, reviews, courses and the marketplace listing. The spec's scope boundary names all of these as unblocked by this work rather than required by it. Chat first: it is the one that turns a claim into a member, and the rest are cheaper to judge once there are people in a room.

**Known gap — how the page identifies a visitor.** This site has no customer accounts; that is a locked decision from the original commerce spec. Task 5 Step 6 therefore leans on `?email=` from the confirmation email, which identifies a visitor **but does not authenticate one**. The token route is written so that this is not a security hole — it only ever mints for the Whop user our own purchase row names, so a guessed email yields someone else's chat room, not our API key. That is still weaker than a login, and it is the first thing to revisit if the community carries anything private. Flag it to the user before Task 5 rather than shipping it silently.

**Type consistency.** `ensureWhopAccount` returns `{ ok: true; userId }` in Task 2 and is read as `account.userId` there. `channelsFor(purchases): string[]` is defined in Task 3 and consumed as the `channels` prop in Task 5. `POST /api/chat/token` returns `{ token }` in Task 4 and is read as `(await res.json()).token` in Task 5.
