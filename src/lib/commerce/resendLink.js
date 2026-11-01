'use server'

import { getPayloadClient } from '../getPayloadClient'
import { tryCreateAccessToken } from './accessToken'
import { sendAccessLinkEmail, sendLicenseLinkEmail } from './fulfillment'
import {
  claimLinkWindow,
  linkWindowOpen,
  releaseLinkWindow,
} from './licenseRecord'

/*
 * "Resend my link", for /access/resend.
 *
 * A public server action: anyone can type any email into it, so it must say
 * the same thing whether or not that email ever bought. Every address that
 * reaches the lookup gets `{ done: true, error: null }`, whatever was found,
 * sent, skipped or failed to send. There is no early return with a different
 * message once the lookup has run, because a different message is the leak.
 * The only different answers are the ones that cannot depend on the address:
 * no address given, and a database that could not be read.
 *
 * What it sends depends on what the address bought:
 *  - A kit buyer is sent the license page. The row to mint from is the newest
 *    paid purchase with a license. An upgrade row is `not_required` (it
 *    delivers nothing of its own) but is on the license, so a plain
 *    "newest deliverable purchase" query would pass over a buyer whose latest
 *    payment was an upgrade. The license id goes in the token, so the page
 *    opens the license whichever row it was minted from.
 *  - Anything else keeps the old `/access/<token>` mail.
 *
 * A license is mailed at most once in ten minutes, the window the expired-link
 * button on the license page shares (`lastLinkSentAt`, in licenseRecord.js).
 * Inside it nothing is sent and the answer is the same, so anyone who knows
 * an owner's address cannot use this page to flood their inbox.
 *
 * The license link goes to the license's stored owner, and only when the
 * address typed is that owner. Someone else who paid on a license, such as a
 * person who bought an upgrade with their own card, is not given control of
 * it by typing their address here. The mail goes to `ownerEmail`, never to
 * whatever the form held.
 *
 * 'use server': every export is a public endpoint, so this exports the action
 * and nothing else. Imports are relative so the engine test project can load
 * it.
 */

const done = () => ({ done: true, error: null })

const relationId = (value) =>
  value && typeof value === 'object' ? value.id : value

const itemIdOf = (purchase) =>
  typeof purchase.item === 'object' && purchase.item
    ? purchase.item.value
    : purchase.item

/* Payload throws with status 404 for a document that is not there; any other
   failure says nothing about whether the row exists. */
const isNotFound = (err) => err?.status === 404

async function newestPurchase(payload, email, extra) {
  const { docs } = await payload.find({
    collection: 'purchases',
    where: {
      and: [
        { email: { equals: email } },
        { status: { equals: 'paid' } },
        ...extra,
      ],
    },
    sort: '-createdAt',
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  return docs[0] ?? null
}

/* The newest paid purchase on a license, and that license, when the address
   typed is its owner. `null` for every other case, including a license that
   has gone: nothing to send, and nothing to say about it. */
async function ownedKitPurchase(payload, email) {
  const purchase = await newestPurchase(payload, email, [
    { license: { exists: true } },
  ])
  if (!purchase) return null
  let license = null
  try {
    license = await payload.findByID({
      collection: 'licenses',
      id: relationId(purchase.license),
      depth: 0,
      overrideAccess: true,
    })
  } catch (err) {
    if (!isNotFound(err)) throw err
  }
  const owner = String(license?.ownerEmail ?? '')
    .trim()
    .toLowerCase()
  if (!owner || owner !== email.toLowerCase()) return null
  return { purchase, license }
}

export async function resendLink(_prevState, formData) {
  const email = String(formData.get('email') || '').trim()
  if (!email) return { done: false, error: 'Enter the email you bought with.' }
  const reason = formData.get('intent') === 'upgrade' ? 'upgrade' : 'link'

  let payload
  let kit
  let download = null
  try {
    payload = await getPayloadClient()
    kit = await ownedKitPurchase(payload, email)
    /* Rows on a license are never offered the old link. A licensed purchase
       that was not mailed above (its owner is someone else) must not leak
       through here as a download link. */
    if (!kit) {
      download = await newestPurchase(payload, email, [
        { license: { exists: false } },
        { fulfillmentStatus: { not_equals: 'pending_invite' } },
        // Nothing to link to: Creem delivers digital products itself, and a
        // retainer has no access page.
        { fulfillmentStatus: { not_equals: 'not_required' } },
      ])
    }
  } catch (err) {
    console.error('Resend: lookup failed', err)
    return {
      done: false,
      error: 'I could not look that up just now. Please try again in a moment.',
    }
  }

  /* Best effort from here on, and the answer below does not depend on any of
     it. A failure is logged and swallowed: this is the page a buyer visits
     when delivery has already gone wrong, and it must not break harder. */
  try {
    if (kit) {
      const signed = tryCreateAccessToken({
        purchaseId: kit.purchase.id,
        licenseId: kit.license.id,
        itemType: kit.purchase.itemType || 'product',
        itemId: itemIdOf(kit.purchase),
      })
      const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
      if (!signed.ok) {
        console.error('Resend: could not sign a license link —', signed.reason)
      } else if (!site) {
        console.error('Resend: NEXT_PUBLIC_SITE_URL is not set')
      } else if (!linkWindowOpen(kit.license)) {
        /* A link went to this license in the last ten minutes, from here or
           from the expired-link button. Skipped without a word: the answer
           below is the same, so the window cannot be used to tell which
           addresses are real. */
      } else {
        // Recorded before the mail goes, as the expired-link button does.
        const previous = await claimLinkWindow(payload, kit.license)
        try {
          await sendLicenseLinkEmail({
            to: kit.license.ownerEmail,
            itemName: 'WareKit',
            url: `${site}/access/seats/${signed.token}`,
            reason,
          })
        } catch (err) {
          // Nothing went out, so the ten minutes are not spent.
          await releaseLinkWindow(payload, kit.license, previous)
          throw err
        }
      }
    } else if (download) {
      const signed = tryCreateAccessToken({
        purchaseId: download.id,
        itemType: download.itemType,
        itemId: itemIdOf(download),
      })
      if (signed.ok) {
        await sendAccessLinkEmail({
          to: email,
          itemName: 'your purchase',
          token: signed.token,
        })
      } else {
        console.error('Resend: could not sign an access link —', signed.reason)
      }
    }
  } catch (err) {
    console.error('Resend: link email failed', err)
  }

  return done()
}
