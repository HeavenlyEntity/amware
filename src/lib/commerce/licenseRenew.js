'use server'

import crypto from 'crypto'
import { redirect } from 'next/navigation'
import { getPayloadClient } from '../getPayloadClient'
import { createCheckoutSession } from './creem'
import { verifyAccessToken } from './accessToken'
import { creemEnvironment, creemRenewalProductIdFor } from './creemEnv'
import { licenseFromClaims } from './licenseRecord'
import {
  TERM_TIERS,
  formatTermDate,
  isRenewalPrice,
  termState,
} from './licenseTerm'

/*
 * Paying for 12 more months of updates, from the license page.
 *
 * A public server action, so a hand-made POST reaches it as easily as the
 * button does. Only the signed token comes from the form. Which license, what
 * tier it holds, its end date, the kit row and the Creem product charged are
 * all read from the database on every call.
 *
 * Every refusal a buyer can meet is a returned sentence, never a thrown
 * error, and each says nothing was charged, because every one of them happens
 * before Creem has a checkout to charge. The faults that are ours to fix are
 * logged with the license id and the check that failed.
 *
 * The checkout names the kit row of the license's own stack and tier as the
 * item, and the license in metadata, with `renewal: '1'`. The webhook refuses
 * a renewal that does not line up with the license it names.
 *
 * 'use server': every export is a public endpoint, so this file exports the
 * action and nothing else. Imports are relative so the engine test project
 * can load it.
 */

const fail = (message) => ({ error: { message } })

// TODO(alec): confirm this wording.
const INVALID_LINK =
  'This link is no longer valid. Nothing was charged. Request a fresh one from the access page.'
// TODO(alec): confirm this wording.
const LOOKUP_FAILED =
  'I could not reach your license just now. Nothing was charged. Please try again in a moment.'
// TODO(alec): confirm this wording.
const UNAVAILABLE =
  'Renewal is not available for this license right now. Nothing was charged. Get in touch and I will sort it out.'
// TODO(alec): confirm this wording.
const NOT_CHARGED = 'Nothing was charged. Try again or get in touch.'

export async function startRenewal(_prevState, formData) {
  const token = String(formData.get('token') || '')

  const claims = verifyAccessToken(token)
  if (!claims) return fail(INVALID_LINK)

  let found
  try {
    const payload = await getPayloadClient()
    found = await licenseFromClaims(payload, claims)
  } catch (err) {
    console.error('Renewal license lookup failed', err)
    return fail(LOOKUP_FAILED)
  }
  if (!found) return fail(INVALID_LINK)
  const { license, product } = found

  const refuse = (check) => {
    console.error('Renewal refused', { license: license.id, check })
    return fail(UNAVAILABLE)
  }

  /* The webhook attaches a renewal only to a license in the Creem world it
     arrives from; the other one would take the payment and be refused. */
  const env = creemEnvironment()
  if ((license.creemEnvironment || 'production') !== env) {
    return refuse('creem environment')
  }

  if (!TERM_TIERS.includes(license.tier)) return refuse('tier')

  const term = termState(license, new Date())
  if (!term.until) return refuse('no end date')

  if (!term.renewOpen) {
    // TODO(alec): confirm this wording.
    return fail(
      `Renewal opens on ${formatTermDate(
        term.renewOpensOn
      )}, 60 days before your updates end. Nothing was charged.`
    )
  }

  /* The row for the license's stack and current tier. Its status is not
     checked: a holder can renew a kit later taken off sale. */
  const productId = creemRenewalProductIdFor(product, env)
  if (!product) return refuse('no kit row')
  if (!productId) return refuse('no renewal product')
  if (!isRenewalPrice(product.renewalPrice)) return refuse('no renewal price')

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  // Without this secret every webhook is rejected and the payment would go
  // unrecorded, so this refuses before Creem is called.
  if (!site || !process.env.CREEM_WEBHOOK_SECRET) {
    console.error('Renewal refused: checkout is not configured', {
      license: license.id,
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
      /* Back to the license page with the end date the checkout started
         from, so the page can tell "confirming" from "done". */
      successUrl: `${site}/access/seats/${token}?renewed=${encodeURIComponent(
        term.until
      )}`,
      metadata: {
        itemType: 'product',
        itemId: String(product.id),
        ...(product.slug ? { slug: product.slug } : {}),
        licenseId: String(license.id),
        renewal: '1',
      },
    }))
  } catch (err) {
    console.error('Renewal checkout failed', { license: license.id, err })
    return fail(NOT_CHARGED)
  }

  redirect(checkoutUrl) // external redirect to Creem's hosted page
}
