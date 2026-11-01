'use server'

import { getPayloadClient } from '../getPayloadClient'
import { tryCreateAccessToken } from './accessToken'
import { sendAccessLinkEmail, sendLicenseLinkEmail } from './fulfillment'
import { tierRank } from './license'
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
 * What it sends depends on what the address owns:
 *  - An owner of licenses is sent each license page that still holds a tier.
 *    Licenses are found by `ownerEmail`, stored lowercase, so the case typed
 *    does not matter and an owner of two kits reaches both. With
 *    `intent=upgrade`, Lite is left out when a paid license exists, since
 *    that is the one to pay on. Each token is minted from the newest paid
 *    purchase on its license, whoever paid it, with the license id in it, so
 *    the page opens that license whichever row it was minted from. An upgrade
 *    row is `not_required` (it delivers nothing of its own) but counts here.
 *  - A purchase with no license keeps the old `/access/<token>` mail, whether
 *    or not the address also owns a license.
 *
 * A license is mailed at most once in ten minutes, the window the expired-link
 * button on the license page shares (`lastLinkSentAt`, in licenseRecord.js).
 * Each license has its own. Inside it nothing is sent and the answer is the
 * same, so anyone who knows an owner's address cannot use this page to flood
 * their inbox.
 *
 * Only the owner is mailed. Someone else who paid on a license, such as a
 * person who bought an upgrade with their own card, is not given control of
 * it by typing their address here. The mail goes to `ownerEmail`, never to
 * whatever the form held.
 *
 * 'use server': every export is a public endpoint, so this exports the action
 * and nothing else. Imports are relative so the engine test project can load
 * it.
 */

const done = () => ({ done: true, error: null })

const itemIdOf = (purchase) =>
  typeof purchase.item === 'object' && purchase.item
    ? purchase.item.value
    : purchase.item

async function newestPurchase(payload, clauses) {
  const { docs } = await payload.find({
    collection: 'purchases',
    where: { and: [...clauses, { status: { equals: 'paid' } }] },
    sort: '-createdAt',
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  return docs[0] ?? null
}

/* The licenses this address owns that still hold a tier. A refunded license
   has nothing to send. */
async function ownedLicenses(payload, email) {
  const { docs } = await payload.find({
    collection: 'licenses',
    where: { ownerEmail: { equals: email.toLowerCase() } },
    depth: 0,
    limit: 50,
    sort: 'createdAt',
    overrideAccess: true,
  })
  return docs.filter((license) => license.tier)
}

/* One license's mail. A link sent in the last ten minutes, from here or from
   the expired-link button, skips it without a word: the answer is the same,
   so the window cannot be used to tell which addresses are real. */
async function mailLicense(payload, license, reason) {
  if (!linkWindowOpen(license)) return

  const purchase = await newestPurchase(payload, [
    { license: { equals: license.id } },
  ])
  if (!purchase) return

  const signed = tryCreateAccessToken({
    purchaseId: purchase.id,
    licenseId: license.id,
    itemType: purchase.itemType || 'product',
    itemId: itemIdOf(purchase),
  })
  if (!signed.ok) {
    console.error('Resend: could not sign a license link —', signed.reason)
    return
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (!site) {
    console.error('Resend: NEXT_PUBLIC_SITE_URL is not set')
    return
  }

  // Recorded before the mail goes, as the expired-link button does.
  const previous = await claimLinkWindow(payload, license)
  try {
    await sendLicenseLinkEmail({
      to: license.ownerEmail,
      itemName: 'WareKit',
      url: `${site}/access/seats/${signed.token}`,
      reason,
    })
  } catch (err) {
    // Nothing went out, so the ten minutes are not spent.
    await releaseLinkWindow(payload, license, previous)
    throw err
  }
}

export async function resendLink(_prevState, formData) {
  const email = String(formData.get('email') || '').trim()
  if (!email) return { done: false, error: 'Enter the email you bought with.' }
  const reason = formData.get('intent') === 'upgrade' ? 'upgrade' : 'link'

  let payload
  let licenses = []
  let download = null
  try {
    payload = await getPayloadClient()
    licenses = await ownedLicenses(payload, email)
    /* Rows on a license are never offered the old link: a licensed purchase
       whose owner is someone else must not leak through here as a download
       link. Owning a license does not stop a course's link going out. */
    download = await newestPurchase(payload, [
      { email: { equals: email } },
      { license: { exists: false } },
      { fulfillmentStatus: { not_equals: 'pending_invite' } },
      // Nothing to link to: Creem delivers digital products itself, and a
      // retainer has no access page.
      { fulfillmentStatus: { not_equals: 'not_required' } },
    ])
  } catch (err) {
    console.error('Resend: lookup failed', err)
    return {
      done: false,
      error: 'I could not look that up just now. Please try again in a moment.',
    }
  }

  /* Best effort from here on, and the answer below does not depend on any of
     it. A failure is logged and swallowed: this is the page a buyer visits
     when delivery has already gone wrong, and it must not break harder. One
     license's failure does not cost the others their mail. */
  const paid = licenses.filter(
    (license) => tierRank(license.tier) >= tierRank('pro')
  )
  const targets = reason === 'upgrade' && paid.length ? paid : licenses
  for (const license of targets) {
    try {
      await mailLicense(payload, license, reason)
    } catch (err) {
      console.error('Resend: link email failed', err)
    }
  }

  if (download) {
    try {
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
    } catch (err) {
      console.error('Resend: link email failed', err)
    }
  }

  return done()
}
