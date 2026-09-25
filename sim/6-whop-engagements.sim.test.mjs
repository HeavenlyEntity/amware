import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getPayload } from 'payload'
import config from '@payload-config'
import { whopRequest } from '@/lib/commerce/whop'
import { whopEnvironment } from '@/lib/commerce/whopEnv'

/* Whop, set up for the engagements. Live account, real objects, nothing
   charged: one hidden product, one one-time deposit plan per published
   retainer, one webhook. Every step looks before it creates, so running
   this twice changes nothing, and each plan id is written onto its service
   so the card can offer the deposit.
 *
 * The webhook secret is shown ONCE by Whop, on creation. This prints it in
 * a banner; store it as WHOP_WEBHOOK_SECRET in .env.local and in Vercel
 * production, or the route answers 401 to everything. */

const PRODUCT_TITLE = 'Anti-Slop Alec engagements'
const ENV = whopEnvironment()
/* Live Whop must reach production; the sandbox must reach the dev tunnel
   (`pnpm dev:tunnel`). Override with WHOP_WEBHOOK_URL. */
const WEBHOOK_URL =
  process.env.WHOP_WEBHOOK_URL ||
  (ENV === 'sandbox'
    ? 'https://my-portfolio.ngrok.app/webhooks/whop'
    : 'https://www.amware.dev/webhooks/whop')
/* The field the plan id is written to. Two ids per service, because the
   database is shared between the site's production and its local sandbox
   testing, and a sandbox plan must never reach a real customer. */
const PLAN_FIELD = ENV === 'sandbox' ? 'whopSandboxPlanId' : 'whopPlanId'
const DEFAULT_DEPOSIT = 1500
/* Every event the route acts on. membership.deactivated is what repository
   revocation listens for: a hook without it never delivers one, so the
   handler cannot fire at all -- not even in log-only mode. */
const WEBHOOK_EVENTS = [
  'payment.succeeded',
  'payment.failed',
  'membership.deactivated',
]

const list = async (path) => (await whopRequest(path)).data ?? []

describe('Whop engagements', () => {
  let payload
  let product
  let account

  it('talks to the account the key belongs to', async () => {
    account = await whopRequest('/accounts/me')
    console.log(`${ENV}: ${account.id} (${account.title})`)
    expect(account.id).toMatch(/^biz_/)
    if (ENV === 'production') expect(account.id).toBe('biz_PGSOCOwANQSket')
  })

  it('has the product', async () => {
    payload = await getPayload({ config })
    const products = await list(`/products?account_id=${account.id}`)
    product = products.find((p) => p.title === PRODUCT_TITLE)
    if (!product) {
      product = await whopRequest('/products', {
        method: 'POST',
        body: {
          account_id: account.id,
          title: PRODUCT_TITLE,
          description:
            'The deposit that starts a retainer with Alec Mingione. Credited in full against the first month.',
          visibility: 'hidden',
          metadata: { source: 'amware.dev', kind: 'engagement-deposit' },
        },
      })
      console.log(`created product ${product.id}`)
    } else {
      console.log(`product exists ${product.id}`)
    }
    expect(product.id).toMatch(/^prod_/)
  })

  it('has a deposit plan for every published retainer, written onto the service', async () => {
    const { docs } = await payload.find({
      collection: 'services',
      where: {
        and: [
          { status: { equals: 'published' } },
          { bookingUrl: { exists: true } },
        ],
      },
      limit: 20,
      overrideAccess: true,
    })
    expect(docs.length).toBeGreaterThan(0)

    const plans = await list(
      `/plans?account_id=${account.id}&product_id=${product.id}`
    )

    for (const service of docs) {
      const note = `deposit:${service.slug}`
      const deposit =
        typeof service.depositAmount === 'number'
          ? service.depositAmount
          : DEFAULT_DEPOSIT
      let plan = plans.find(
        (p) => p.internal_notes === note || p.metadata?.slug === service.slug
      )
      if (!plan) {
        plan = await whopRequest('/plans', {
          method: 'POST',
          body: {
            account_id: account.id,
            product_id: product.id,
            plan_type: 'one_time',
            initial_price: deposit,
            currency: 'usd',
            release_method: 'buy_now',
            visibility: 'quick_link',
            title: `${service.name} deposit`,
            description: `Reserves your start on the ${service.name} retainer. Credited in full against your first month.`,
            internal_notes: note,
            metadata: { slug: service.slug, kind: 'deposit' },
          },
        })
        console.log(`created plan ${plan.id} for ${service.slug} ($${deposit})`)
      } else {
        console.log(`plan exists ${plan.id} for ${service.slug}`)
      }
      expect(plan.id).toMatch(/^plan_/)

      if (
        service[PLAN_FIELD] !== plan.id ||
        service.depositAmount !== deposit
      ) {
        await payload.update({
          collection: 'services',
          id: service.id,
          overrideAccess: true,
          data: { [PLAN_FIELD]: plan.id, depositAmount: deposit },
        })
      }
    }
  })

  it('has the webhook', async () => {
    const hooks = await list(`/webhooks?account_id=${account.id}`)
    let hook = hooks.find((h) => h.url === WEBHOOK_URL)
    if (!hook) {
      hook = await whopRequest('/webhooks', {
        method: 'POST',
        body: {
          url: WEBHOOK_URL,
          events: WEBHOOK_EVENTS,
          /* New webhooks are always v1 envelopes; the dated pin fixes the
             payload shape (this date carries `account_id`, older ones
             `company_id`) so a Whop change cannot silently reshape events. */
          api_version_date: '2026-08-14',
          enabled: true,
          resource_id: account.id,
        },
      })
      /* Whop shows the secret exactly once, and vitest does not reliably
         print console output, so it goes to a file rather than the log.
         Store it as WHOP_WEBHOOK_SECRET in .env.local and in Vercel
         production, then delete the file. */
      const out =
        process.env.WHOP_WEBHOOK_SECRET_FILE ||
        path.join(process.cwd(), '.whop-webhook-secret')
      await fs.writeFile(out, `${hook.webhook_secret}\n`, { mode: 0o600 })
      console.log(`WHOP WEBHOOK CREATED ${hook.id}; secret written to ${out}`)
    } else {
      console.log(`webhook exists ${hook.id} -> ${hook.url}`)
      /* An existing hook keeps the events it was created with, and one made
         before revocation existed never sends membership.deactivated. The
         missing events are added and nothing is taken away: `events` on the
         update is the whole list, so the hook's current ones go with them. */
      const current = Array.isArray(hook.events) ? hook.events : []
      const missing = WEBHOOK_EVENTS.filter((e) => !current.includes(e))
      if (missing.length) {
        hook = await whopRequest(`/webhooks/${hook.id}`, {
          method: 'PATCH',
          body: { events: [...current, ...missing] },
        })
        console.log(`webhook ${hook.id} now also sends ${missing.join(', ')}`)
      }
    }
    expect(hook.id).toMatch(/^hook_|^wh_|^web_/)
    expect(hook.events).toEqual(expect.arrayContaining(WEBHOOK_EVENTS))
  })
})
