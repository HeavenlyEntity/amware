'use server'

import crypto from 'crypto'
import { redirect } from 'next/navigation'
import { getPayloadClient } from '../getPayloadClient'
import { createCheckoutSession } from './creem'
import { verifyAccessToken } from './accessToken'
import { creemEnvironment, creemUpgradeProductIdFor } from './creemEnv'
import { tierRank } from './license'
import {
  licenseFromClaims,
  quoteProductIdFor,
  teamProductFor,
} from './licenseRecord'

/*
 * Paying to move up a tier, from the license page.
 *
 * A public server action, so a hand-made POST reaches it as easily as the
 * button does. Only the signed token and the target tier come from the form.
 * Which license, what tier it holds, which kit row is the item and which
 * Creem product is charged are all read from the database on every call, and
 * the tier is checked here as well as hidden on the page: a stale tab, a
 * second tab or a replayed form must not start a second charge for a tier
 * the license already has.
 *
 * Two upgrades share this action:
 *  - Pro to Team, charged at the upgrade product on the Team row.
 *  - Enterprise, charged at the quote product on the license.
 * Both name the Team row of the license's own stack as the item and the
 * license in metadata, because the webhook refuses an upgrade that does not
 * line up with the license it names: same stack, same Creem environment, and
 * the product that upgrade expects.
 *
 * Every failure a buyer can meet comes back as a message instead of a throw.
 * This runs on the page the buyer is about to pay from, and a thrown error
 * would send them to the error boundary with no way back and no word on
 * whether they were charged. Each message says nothing was charged, because
 * every one of these happens before Creem has a checkout to charge. The
 * faults that are ours to fix are logged.
 *
 * 'use server': every export is a public endpoint, so this file exports the
 * action and nothing else. Imports are relative so the engine test project
 * can load it.
 */

const TARGETS = ['team', 'enterprise']

const fail = (message) => ({ error: { message } })

const INVALID_LINK =
  'This link is no longer valid. Nothing was charged. Request a fresh one from the access page.'
const UNAVAILABLE =
  'This upgrade is not available right now. Nothing was charged. Get in touch and I will sort it out.'
const NOT_CHARGED = 'Nothing was charged. Try again or get in touch.'

export async function startUpgrade(_prevState, formData) {
  const token = String(formData.get('token') || '')
  const target = String(formData.get('target') || '')

  if (!TARGETS.includes(target)) return fail(UNAVAILABLE)

  const claims = verifyAccessToken(token)
  if (!claims) return fail(INVALID_LINK)

  let found
  let teamRow
  try {
    const payload = await getPayloadClient()
    found = await licenseFromClaims(payload, claims)
    if (found) teamRow = await teamProductFor(payload, found.license.stack)
  } catch (err) {
    console.error('Upgrade license lookup failed', err)
    return fail(
      'I could not reach your license just now. Nothing was charged. Please try again in a moment.'
    )
  }
  if (!found) return fail(INVALID_LINK)
  const { license } = found

  /* The webhook attaches an upgrade only to a license in the Creem world it
     arrives from. A license from the other one would take the payment and
     then be refused, so it never gets as far as a checkout. */
  const env = creemEnvironment()
  if ((license.creemEnvironment || 'production') !== env) {
    console.error('Upgrade refused: license is in another Creem environment', {
      license: license.id,
      env,
    })
    return fail(UNAVAILABLE)
  }

  let productId
  if (target === 'team') {
    if (tierRank(license.tier) >= tierRank('team')) {
      return fail("You're already on Team.")
    }
    /* Only Pro pays the difference. Lite has no access to the paid repo, so
       the difference is not their price, and a refunded license holds
       nothing to upgrade from. Both buy Team in full instead. */
    if (license.tier !== 'pro') return fail(UNAVAILABLE)
    productId = creemUpgradeProductIdFor(teamRow, env)
  } else {
    if (license.tier === 'enterprise')
      return fail("You're already on Enterprise.")
    // A new Enterprise license has no tier yet, which is not a refund.
    productId = quoteProductIdFor(license, env)
  }

  // The Team row is the item either way, found from the license's stack.
  if (!teamRow || !productId) {
    console.error('Upgrade refused: nothing to charge', {
      license: license.id,
      target,
      hasTeamRow: Boolean(teamRow),
    })
    return fail(UNAVAILABLE)
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  // Without this secret every webhook is rejected and the payment would go
  // unrecorded, so this refuses before Creem is called.
  if (!site || !process.env.CREEM_WEBHOOK_SECRET) {
    console.error('Upgrade refused: checkout is not configured', {
      hasSiteUrl: Boolean(site),
      hasWebhookSecret: Boolean(process.env.CREEM_WEBHOOK_SECRET),
    })
    return fail(UNAVAILABLE)
  }

  let checkoutUrl
  try {
    ;({ checkoutUrl } = await createCheckoutSession({
      productId,
      requestId: crypto.randomUUID(),
      /* Back to the license page, never onboarding: an upgrade row needs no
         invitation, so onboarding would say "being prepared" forever. */
      successUrl: `${site}/access/seats/${token}?upgraded=${target}`,
      metadata: {
        itemType: 'product',
        itemId: String(teamRow.id),
        ...(teamRow.slug ? { slug: teamRow.slug } : {}),
        licenseId: String(license.id),
        upgrade: target,
      },
    }))
  } catch (err) {
    console.error('Upgrade checkout failed', {
      license: license.id,
      target,
      err,
    })
    return fail(NOT_CHARGED)
  }

  redirect(checkoutUrl) // external redirect to Creem's hosted page
}
