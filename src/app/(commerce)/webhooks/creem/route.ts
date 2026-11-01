import type { Purchase } from '@/payload-types'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { verifyCreemSignature } from '@/lib/commerce/creem'
import { tryCreateAccessToken } from '@/lib/commerce/accessToken'
import { creemEnvironment } from '@/lib/commerce/creemEnv'
import { licenseLimits, tierRank } from '@/lib/commerce/license'
import {
  attachPurchase,
  expectedProductIds,
  licenseIdFrom,
  quoteProductIdFor,
  recomputeTier,
  relationId,
} from '@/lib/commerce/licenseRecord'
import { revokeLicenseAccess } from '@/lib/commerce/licenseRevoke'
import { listSeats } from '@/lib/commerce/seats'
import { onboardingPath } from '@/lib/commerce/onboardingLink'
import { inviteToRepo } from '@/lib/commerce/githubInvite'
import {
  sendAccessLinkEmail,
  sendBoilerplateConfirmationEmail,
} from '@/lib/commerce/fulfillment'

export const dynamic = 'force-dynamic'

const COLLECTION = {
  product: 'products',
  course: 'courses',
  service: 'services',
}

/* Subscription lifecycle. Creem sends these for retainers; a one-time sale
   only ever produces checkout.completed. Paths per Creem's webhook reference:
   object.id is the subscription, object.status its state,
   object.customer.email the buyer, object.product.id the product, and
   object.last_transaction_id the individual payment inside the subscription. */
const SUBSCRIPTION_STATES = new Set([
  'subscription.active',
  'subscription.trialing',
  'subscription.past_due',
  'subscription.scheduled_cancel',
  'subscription.canceled',
  'subscription.expired',
])

/* A retainer is a standing engagement. There is nothing to download and no
   access link to sign, so its fulfillment is complete the moment it is
   recorded -- sending an access-token email for one would be wrong. */
const isEngagement = (itemType: string, item: any) =>
  itemType === 'service' || item?.type === 'service-package'

/* The paid file is attached to the product in Creem's dashboard, and Creem
   sends it through its purchase email and customer portal. Recording the sale
   is the whole job here; an access link would only point at an empty page. */
const isCreemDelivered = (itemType: string, item: any) =>
  itemType === 'product' && item?.type === 'digital'

export async function POST(req) {
  const raw = await req.text()
  if (raw.length > 65536) {
    return new Response('Payload too large', { status: 413 })
  }
  if (!verifyCreemSignature(raw, req.headers.get('creem-signature'))) {
    return new Response('Invalid signature', { status: 401 })
  }

  let event
  try {
    event = JSON.parse(raw)
  } catch {
    return new Response('Bad JSON', { status: 400 })
  }

  const type = event?.eventType
  if (type === 'checkout.completed') return handleCheckout(event)
  if (type === 'subscription.paid') return handleSubscriptionPaid(event)
  if (type === 'refund.created') return handleRefund(event)
  if (type === 'dispute.created') return handleDispute(event)
  if (SUBSCRIPTION_STATES.has(type)) return handleSubscriptionState(event)
  return new Response('ignored', { status: 200 })
}

/* ------------------------------------------------------------------------
 * Refunds and disputes.
 *
 * A refund moves a license back down. The purchase becomes `refunded`, the
 * tier is recomputed from what is still paid, and when nothing paid is left
 * the repository access this license created is taken back (see
 * `revokeLicenseAccess`, which is flagged off by default). Creem does not
 * touch the license key on a refund; the report route treats a license with
 * no tier as invalid, so the key needs no action here.
 * ---------------------------------------------------------------------- */

/* An id from a value that is either the id itself or an object carrying it.
   Creem sends `order` as an object on a refund and as a bare id on a
   transaction, and nothing here may throw on a shape it did not expect. */
const idFrom = (value: any): string | null => {
  if (typeof value === 'string' && value) return value
  if (typeof value?.id === 'string' && value.id) return value.id
  return null
}

const amountFrom = (value: any): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

async function purchaseForOrder(payload, orderId: string) {
  const found = await payload.find({
    collection: 'purchases',
    where: { creemOrderId: { equals: orderId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return found.docs?.[0] ?? null
}

async function flagForReview(payload, licenseId) {
  await payload.update({
    collection: 'licenses',
    id: licenseId,
    overrideAccess: true,
    data: { needsReview: true },
  })
}

/* `refund.created`, from Creem's test mode (see the Creem proof). The order
   to match against `creemOrderId` is `object.order.id`.
 *
   The status fields inside the payload are stale: on a full refund
   `order.status` and `transaction.status` still read `paid` and
   `transaction.refunded_amount` is null. None of them is read. A refund is
   full when `refund_amount` reaches `transaction.amount_paid`.
 *
   Several partial refunds on one order arrive as separate events. They are
   NOT summed: each one sets `needsReview` and changes nothing else, so a
   person decides. That also means partials that together refund the whole
   order never mark the row refunded; the same review is where that is
   caught. */
async function handleRefund(event) {
  const obj = event.object || {}
  const orderId = idFrom(obj.order) ?? idFrom(obj.transaction?.order)
  if (!orderId) {
    console.warn('Refund event without a readable order id')
    return new Response('ignored (missing fields)', { status: 200 })
  }

  const refunded = amountFrom(obj.refund_amount)
  const paid =
    amountFrom(obj.transaction?.amount_paid) ??
    amountFrom(obj.order?.amount_paid)
  /* If either amount cannot be read the refund is treated as partial, which
     changes no tier and asks a person to look. Guessing "full" would take a
     customer's access away on a malformed event. */
  const full =
    refunded != null && paid != null && refunded > 0 && refunded >= paid

  const payload = await getPayloadClient()

  let purchase
  try {
    purchase = await purchaseForOrder(payload, orderId)
  } catch (err) {
    console.error('Refund lookup failed for order', orderId, err)
    return new Response('error', { status: 500 })
  }
  if (!purchase) {
    return new Response('ignored (unknown order)', { status: 200 })
  }

  const licenseId = relationId(purchase.license) ?? null

  if (!full) {
    console.warn('Partial refund, tier unchanged', {
      orderId,
      purchase: purchase.id,
      license: licenseId,
    })
    if (licenseId != null) {
      try {
        await flagForReview(payload, licenseId)
      } catch (err) {
        console.error('Partial refund flag failed for order', orderId, err)
        return new Response('error', { status: 500 })
      }
    }
    return new Response('ok (partial refund flagged)', { status: 200 })
  }

  // A redelivery does nothing at all: no recompute, no revoke, no writes.
  if (purchase.status === 'refunded') {
    return new Response('ok (duplicate)', { status: 200 })
  }

  /* Read before the purchase changes. The Purchases hook recomputes the tier
     the moment the status is saved, so a read after would already show the
     new tier and the comparison below would see no change. */
  const before =
    licenseId != null
      ? await payload
          .findByID({
            collection: 'licenses',
            id: licenseId,
            depth: 0,
            overrideAccess: true,
          })
          .catch(() => null)
      : null

  try {
    await payload.update({
      collection: 'purchases',
      id: purchase.id,
      overrideAccess: true,
      data: { status: 'refunded' },
    })
  } catch (err) {
    // Nothing changed, so let Creem redeliver.
    console.error('Refund update failed for order', orderId, err)
    return new Response('error', { status: 500 })
  }

  // A digital product or a retainer has no license to move.
  if (licenseId == null) return new Response('ok', { status: 200 })

  /* The refund is recorded and a redelivery stops at the check above, so a
     failure past this point must not 500: Creem's retry would do nothing.
     It is logged and the license is flagged for a person instead. */
  try {
    await moveLicenseDown(payload, licenseId, before)
  } catch (err) {
    console.error('Refund license update failed for order', orderId, err)
    await flagForReview(payload, licenseId).catch(() => {})
  }
  return new Response('ok', { status: 200 })
}

async function moveLicenseDown(payload, licenseId, before) {
  const { tier } = await recomputeTier(payload, licenseId)
  const license = await payload.findByID({
    collection: 'licenses',
    id: licenseId,
    depth: 0,
    overrideAccess: true,
  })

  // Nothing paid is left: take back what this license gave, if allowed.
  if (tierRank(tier) < tierRank('pro')) {
    await revokeLicenseAccess(payload, { ...license, tier })
    return
  }

  /* A paid tier is left. If the tier fell, an upgrade was refunded and the
     seats stay as they are, so a person looks only when they are over the
     new limit. If it did not fall, the refunded row was not the one setting
     the tier -- the original Pro, with the upgrade still paid. Alec refunds
     both or neither, so this is rare, and it is flagged rather than linked. */
  const fell = before != null && tierRank(tier) < tierRank(before.tier)
  if (!fell) {
    await flagForReview(payload, licenseId)
    return
  }

  let product = null
  if (tier !== 'enterprise') {
    const found = await payload.find({
      collection: 'products',
      where: {
        and: [{ stack: { equals: license.stack } }, { tier: { equals: tier } }],
      },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })
    product = found.docs?.[0] ?? null
  }
  /* A tier with no kit row has no limit to read. Over-flagging is the safe
     side, so that case is treated as over the limit. */
  const unknownLimit = !product && tier !== 'enterprise'
  const used = listSeats(license.seatMembers).length
  if (
    unknownLimit ||
    used > licenseLimits({ ...license, tier }, product).seats
  ) {
    await flagForReview(payload, licenseId)
  }
}

/* `dispute.created`. This was NOT proven in Creem's test mode, so its payload
   is unconfirmed. The order id is read from every path it is likely to be on,
   and if none holds one the event is logged and answered 200 so Creem stops
   retrying.
 *
   TODO(alec): at the first real dispute, confirm which field carries the
   order id and trim the list below to it.
 *
   A dispute changes no tier. It only asks a person to look. */
async function handleDispute(event) {
  const obj = event.object || {}
  const orderId =
    idFrom(obj.order) ??
    idFrom(obj.transaction?.order) ??
    idFrom(obj.checkout?.order)
  if (!orderId) {
    console.warn('Dispute event without a readable order id', {
      dispute: typeof obj.id === 'string' ? obj.id : undefined,
    })
    return new Response('ignored (no order on dispute)', { status: 200 })
  }

  const payload = await getPayloadClient()
  let purchase
  try {
    purchase = await purchaseForOrder(payload, orderId)
  } catch (err) {
    console.error('Dispute lookup failed for order', orderId, err)
    return new Response('error', { status: 500 })
  }
  if (!purchase) {
    return new Response('ignored (unknown order)', { status: 200 })
  }

  const licenseId = relationId(purchase.license) ?? null
  console.warn('Dispute opened, tier unchanged', {
    orderId,
    purchase: purchase.id,
    license: licenseId,
  })
  if (licenseId != null) {
    try {
      await flagForReview(payload, licenseId)
    } catch (err) {
      console.error('Dispute flag failed for order', orderId, err)
      return new Response('error', { status: 500 })
    }
  }
  return new Response('ok (dispute flagged)', { status: 200 })
}

/* A payment inside a subscription. The first one arrives twice -- once as
   checkout.completed carrying an order id, once here carrying a transaction
   id -- so this reconciles onto the checkout row when that row has no
   transaction yet, and only creates a new row for genuine renewals. Without
   that, month one would be banked as two sales. */
async function handleSubscriptionPaid(event) {
  const obj = event.object || {}
  const subscriptionId = obj.id
  const transactionId = obj.last_transaction_id
  const email = obj.customer?.email
  const meta = obj.metadata || {}

  if (!subscriptionId || !transactionId || !email) {
    return new Response('ignored (missing fields)', { status: 200 })
  }

  const payload = await getPayloadClient()

  const seen = await payload.find({
    collection: 'purchases',
    where: { creemTransactionId: { equals: transactionId } },
    limit: 1,
    overrideAccess: true,
  })
  if (seen.docs.length) {
    return new Response('ok (duplicate)', { status: 200 })
  }

  const anchor = await payload.find({
    collection: 'purchases',
    where: {
      and: [
        { creemSubscriptionId: { equals: subscriptionId } },
        { creemTransactionId: { exists: false } },
      ],
    },
    limit: 1,
    sort: 'createdAt',
    overrideAccess: true,
  })

  if (anchor.docs.length) {
    await payload.update({
      collection: 'purchases',
      id: anchor.docs[0].id,
      overrideAccess: true,
      data: { creemTransactionId: transactionId, subscriptionStatus: 'paid' },
    })
    return new Response('ok (first payment reconciled)', { status: 200 })
  }

  const itemType = meta.itemType
  const itemId = meta.itemId
  const collection =
    itemType && Object.prototype.hasOwnProperty.call(COLLECTION, itemType)
      ? COLLECTION[itemType]
      : null
  const item = collection
    ? await payload
        .findByID({ collection, id: itemId, depth: 0, overrideAccess: true })
        .catch(() => null)
    : null

  try {
    await payload.create({
      collection: 'purchases',
      overrideAccess: true,
      data: {
        email,
        item: item ? { relationTo: collection, value: item.id } : undefined,
        itemType: itemType || undefined,
        creemProductId: obj.product?.id,
        creemEnvironment: creemEnvironment(),
        // Renewals have no order of their own; the transaction is the order.
        creemOrderId: transactionId,
        creemSubscriptionId: subscriptionId,
        creemTransactionId: transactionId,
        amount: obj.last_transaction?.amount ?? obj.product?.price,
        currency: obj.product?.currency,
        status: 'paid',
        subscriptionStatus: 'paid',
        fulfillmentStatus: 'not_required',
      },
    })
  } catch (err) {
    const recheck = await payload.find({
      collection: 'purchases',
      where: { creemTransactionId: { equals: transactionId } },
      limit: 1,
      overrideAccess: true,
    })
    if (recheck.docs.length) {
      return new Response('ok (duplicate)', { status: 200 })
    }
    console.error('Renewal create failed for subscription', subscriptionId, err)
    return new Response('error', { status: 500 })
  }

  return new Response('ok', { status: 200 })
}

/* State only: active, trialing, past_due, scheduled_cancel, canceled,
   expired. These are not payments and must never create a purchase row. */
async function handleSubscriptionState(event) {
  const obj = event.object || {}
  const subscriptionId = obj.id
  if (!subscriptionId) {
    return new Response('ignored (missing fields)', { status: 200 })
  }

  // POST has already checked the closed SUBSCRIPTION_STATES set.
  const state = String(event.eventType).slice(
    'subscription.'.length
  ) as Purchase['subscriptionStatus']
  const payload = await getPayloadClient()

  const rows = await payload.find({
    collection: 'purchases',
    where: { creemSubscriptionId: { equals: subscriptionId } },
    limit: 100,
    overrideAccess: true,
  })
  if (!rows.docs.length) {
    // The checkout may not have reached us yet. Creem retries; do not 500.
    return new Response('ignored (unknown subscription)', { status: 200 })
  }

  await Promise.all(
    rows.docs.map((row) =>
      payload
        .update({
          collection: 'purchases',
          id: row.id,
          overrideAccess: true,
          data: { subscriptionStatus: state },
        })
        .catch(() =>
          console.error('Subscription state update failed', subscriptionId)
        )
    )
  )

  return new Response('ok', { status: 200 })
}

async function handleCheckout(event) {
  const obj = event.object || {}
  const orderId = obj.order?.id || obj.id
  const email = obj.customer?.email
  const amount = obj.order?.amount
  const currency = obj.order?.currency
  const creemProductId = obj.product?.id
  const meta = obj.metadata || {}
  const itemType = meta.itemType
  const itemId = meta.itemId
  /* No longer sent at checkout: the buyer gives it on the onboarding page
     they land on after paying. Still read, because a purchase made before
     this change carries one and must still be fulfilled from it. */
  const githubUsername = meta.githubUsername
  const requestId = obj.request_id
  /* Present only when the product has license keys enabled in Creem. An
     absent array means the order issued none, not that one went missing. */
  const licenseKey = Array.isArray(obj.license_keys)
    ? obj.license_keys[0]?.key
    : undefined
  // Present when the purchase started a retainer; absent on one-time sales.
  const subscriptionId = obj.subscription?.id || obj.subscription

  if (!orderId || !email || !itemType || !itemId) {
    return new Response('ignored (missing fields)', { status: 200 })
  }

  const payload = await getPayloadClient()

  // Idempotency: skip if we already recorded this order.
  const existing = await payload.find({
    collection: 'purchases',
    where: { creemOrderId: { equals: orderId } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs.length) {
    return new Response('ok (duplicate)', { status: 200 })
  }

  const collection = Object.prototype.hasOwnProperty.call(COLLECTION, itemType)
    ? COLLECTION[itemType]
    : null

  let item: any = null
  if (collection) {
    item = await payload
      .findByID({ collection, id: itemId, depth: 1, overrideAccess: true })
      .catch(() => null)
  }

  const isBoilerplate = itemType === 'product' && item?.type === 'boilerplate'
  const engagement = isEngagement(itemType, item)
  const creemDelivered = isCreemDelivered(itemType, item)
  const itemName = item?.name || item?.title || 'your purchase'

  /* Checkout metadata is strings, written by our own server. A license id
     that is not a positive integer is treated as absent, never guessed at. */
  const env = creemEnvironment()
  const metaLicenseId = licenseIdFrom(meta.licenseId)
  const upgradeTarget =
    isBoilerplate && tierRank(meta.upgrade) >= tierRank('pro')
      ? (meta.upgrade as string)
      : null
  const license: any =
    isBoilerplate && metaLicenseId
      ? await payload
          .findByID({
            collection: 'licenses',
            id: metaLicenseId,
            depth: 0,
            overrideAccess: true,
          })
          .catch(() => null)
      : null

  /* An Enterprise quote is a private Creem product that belongs to one
     license, told apart by its product id. A quote bought on a license that
     already holds a paid tier is an upgrade of the same repo, so it is sent
     no second invitation. */
  const isQuote =
    upgradeTarget === 'enterprise' ||
    Boolean(
      isBoilerplate &&
        creemProductId &&
        creemProductId === quoteProductIdFor(license, env)
    )
  const grantsTier: string | null = isBoilerplate
    ? isQuote
      ? 'enterprise'
      : upgradeTarget || item?.tier || null
    : null
  const holdsPaidTier = tierRank(license?.tier) >= tierRank('pro')
  const isUpgrade =
    isBoilerplate &&
    (Boolean(upgradeTarget && upgradeTarget !== 'enterprise') ||
      (isQuote && holdsPaidTier))

  /* The ids come from the active Creem environment, so a sandbox sale is not
     wrongly flagged and a sandbox id cannot pass in production. An upgrade is
     held to its own product; with none to match, it is a mismatch. */
  const expected = expectedProductIds({
    item,
    license,
    upgrade: upgradeTarget,
    env,
  })
  const productMismatch =
    item &&
    creemProductId &&
    (upgradeTarget || expected.length > 0) &&
    !expected.includes(creemProductId)

  /* A license named in metadata is usable only if it is on the stack being
     sold and in the Creem world we are in. Otherwise a sandbox payment could
     raise a production license, or a kit of one stack a license of the
     other. The buyer's email is deliberately not compared: someone else's
     card can legitimately pay for a named upgrade. */
  const namedLicenseUnusable =
    isBoilerplate &&
    metaLicenseId != null &&
    !(
      license &&
      license.stack === item?.stack &&
      (license.creemEnvironment || 'production') === env
    )
  // An upgrade only means something on the license it names.
  const upgradeWithoutLicense = namedLicenseUnusable || (isUpgrade && !license)

  // Create the Purchase first (need its id to sign the access token).
  let purchase
  try {
    purchase = await payload.create({
      collection: 'purchases',
      overrideAccess: true,
      data: {
        email,
        item: item ? { relationTo: collection, value: item.id } : undefined,
        itemType,
        creemProductId,
        creemEnvironment: env,
        creemOrderId: orderId,
        creemRequestId: requestId || undefined,
        licenseKey: licenseKey || undefined,
        amount,
        currency,
        githubUsername: githubUsername || undefined,
        creemSubscriptionId:
          typeof subscriptionId === 'string' ? subscriptionId : undefined,
        status: 'paid',
        subscriptionStatus: subscriptionId ? 'active' : undefined,
        fulfillmentStatus: isUpgrade
          ? 'not_required'
          : isBoilerplate
          ? 'pending_invite'
          : engagement || creemDelivered
          ? 'not_required'
          : 'pending',
      },
    })
  } catch (err) {
    // Likely a unique-constraint race on creemOrderId — re-check; treat as duplicate.
    const recheck = await payload.find({
      collection: 'purchases',
      where: { creemOrderId: { equals: orderId } },
      limit: 1,
      overrideAccess: true,
    })
    if (recheck.docs.length) {
      return new Response('ok (duplicate)', { status: 200 })
    }
    console.error('Purchase create failed for order', orderId, err)
    return new Response('error', { status: 500 }) // genuine error — let Creem retry
  }

  if (productMismatch) {
    console.warn('Webhook: paid product does not match item', {
      orderId,
      creemProductId,
      expected,
    })
    await payload
      .update({
        collection: 'purchases',
        id: purchase.id,
        overrideAccess: true,
        data: { fulfillmentStatus: 'failed' },
      })
      .catch(() => {})
  } else if (engagement || creemDelivered) {
    // Neither needs delivery from here. A retainer is scheduled with the
    // client out of band, and Creem sends a digital product's file itself.
  } else if (upgradeWithoutLicense) {
    /* The money is in, but the license it names cannot be found, or belongs
       to another stack or Creem environment. Granting a tier here would raise
       the wrong license, or start a fresh one for the price of a difference,
       so it is left for a person. */
    console.error('Purchase names no usable license for order', orderId, {
      licenseId: meta.licenseId,
    })
    await payload
      .update({
        collection: 'purchases',
        id: purchase.id,
        overrideAccess: true,
        data: { fulfillmentStatus: 'failed' },
      })
      .catch(() => {})
  } else if (isUpgrade) {
    /* The same repo, so nothing to invite and nothing to deliver: the seats
       simply open up. Attaching is what grants the tier, and it must never
       lose a sale that is already recorded. */
    try {
      await attachPurchase(payload, {
        purchase,
        email,
        stack: license.stack,
        grantsTier,
        licenseId: license.id,
        environment: env,
      })
    } catch (err) {
      console.error('License attach failed for order', orderId, err)
      /* The row was created 'not_required', which reads as nothing owed, and
         a redelivery stops at the duplicate check. Say so on the row. */
      await payload
        .update({
          collection: 'purchases',
          id: purchase.id,
          overrideAccess: true,
          data: { fulfillmentStatus: 'failed' },
        })
        .catch(() => {})
    }
  } else if (isBoilerplate) {
    const repo = typeof item?.githubRepo === 'string' ? item.githubRepo : null

    /* Attach before anything else can fail. A kit with no tier or stack, as on
       the legacy `warekit` row, has no license to join. Never allowed to
       throw: the sale is already recorded, and a license a person can attach
       later is better than a 500 that makes Creem redeliver it. */
    let attached: any = null
    if (!grantsTier || !(license?.stack || item?.stack)) {
      console.warn('Webhook: kit has no tier or stack, no license attached', {
        orderId,
        itemId,
      })
    } else {
      try {
        attached = await attachPurchase(payload, {
          purchase,
          email,
          stack: license?.stack || item.stack,
          grantsTier,
          licenseId: metaLicenseId ?? undefined,
          environment: env,
        })
      } catch (err) {
        console.error('License attach failed for order', orderId, err)
      }
    }

    /* No username on a new order: it is collected on the onboarding page the
       buyer is being redirected to right now. So there is nothing to invite
       yet, and attempting it would log a failure for the expected path.
     *
       Orders placed before the username moved still carry one, and are still
       fulfilled from here. When that happens the invitation is attempted and
       never allowed to throw -- the order is already captured by the time
       this runs, so GitHub being unreachable must leave a recorded sale a
       human can finish, not a 500 that makes Creem redeliver it. */
    const invite = githubUsername
      ? await inviteToRepo({ repo, username: githubUsername })
      : null

    if (invite && !invite.ok) {
      console.error('Repo invite failed for order', orderId, {
        repo,
        reason: invite.reason,
      })
    }

    /* Every paid kit gets the license page link, not only a multi-developer
       one: a Pro buyer upgrades from there. */
    const signed = tryCreateAccessToken({
      purchaseId: purchase.id,
      ...(attached ? { licenseId: attached.id } : {}),
      itemType,
      itemId: item.id,
    })
    if (!signed.ok) {
      console.error(
        'License link could not be signed for order',
        orderId,
        signed.reason === 'not-configured'
          ? '— ACCESS_LINK_SECRET is not set in this environment'
          : '— signing failed'
      )
    }

    await payload
      .update({
        collection: 'purchases',
        id: purchase.id,
        overrideAccess: true,
        data: {
          githubRepo: repo || undefined,
          githubInviteUrl: (invite?.ok && invite.url) || undefined,
          ...(signed.ok ? { accessTokenJti: signed.jti } : {}),
          /* 'sent' only when access genuinely exists. Anything else stays
             'pending_invite', which is both the admin's queue of orders still
             owed a repository AND, now, the normal state of an order whose
             buyer has not finished onboarding yet. */
          fulfillmentStatus: invite?.ok ? 'sent' : 'pending_invite',
        },
      })
      .catch(() =>
        console.error('Purchase invite update failed for order', orderId)
      )

    /* The buyer is seat one. Recording it on the license is what keeps the
       limit honest -- otherwise a five-developer buyer could add five more
       people and get six. Only orders from before the username moved reach
       this; a new order records its seat during onboarding. */
    if (attached && githubUsername) {
      await payload
        .findByID({
          collection: 'licenses',
          id: attached.id,
          depth: 0,
          overrideAccess: true,
        })
        .then((current) => {
          const members = current?.seatMembers ?? []
          const taken = members.some(
            (m) =>
              m.githubUsername?.toLowerCase() === githubUsername.toLowerCase()
          )
          if (taken) return null
          return payload.update({
            collection: 'licenses',
            id: attached.id,
            overrideAccess: true,
            data: {
              seatMembers: [
                ...members,
                {
                  githubUsername,
                  inviteUrl: (invite?.ok && invite.url) || undefined,
                  addedAt: new Date().toISOString(),
                },
              ],
            },
          })
        })
        .catch(() =>
          console.error('License seat update failed for order', orderId)
        )
    }

    const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
    // Best-effort: the buyer has access either way, and a bounced email must
    // not undo a granted invitation.
    try {
      await sendBoilerplateConfirmationEmail({
        to: email,
        itemName,
        githubUsername,
        repo: repo || undefined,
        inviteUrl: invite?.ok ? invite.url : null,
        alreadyHadAccess:
          invite?.ok && invite.state === 'already-a-collaborator',
        seatsUrl:
          signed.ok && site ? `${site}/access/seats/${signed.token}` : null,
        /* The way back to onboarding if the tab was closed. Without this the
           buyer's only route to the setup page is browser history. */
        onboardingUrl:
          !githubUsername && requestId && site
            ? (() => {
                const path = onboardingPath(requestId)
                return path ? `${site}${path}` : null
              })()
            : null,
      })
    } catch {
      console.error('Boilerplate confirmation email failed for order', orderId)
    }
  } else if (item) {
    /* Signing must not throw here. It used to: a missing ACCESS_LINK_SECRET
       threw out of this handler, the POST 500'd after the purchase row was
       already written, Creem retried into the idempotency check and stopped
       -- leaving a paid order stuck at 'pending' with no link sent and no
       failure recorded. Now the misconfiguration marks the order 'failed',
       which is a queue someone can work, and says so in the log. */
    const signed = tryCreateAccessToken({
      purchaseId: purchase.id,
      itemType,
      itemId: item.id,
    })

    if (!signed.ok) {
      console.error(
        'Access link could not be signed for order',
        orderId,
        signed.reason === 'not-configured'
          ? '— ACCESS_LINK_SECRET is not set in this environment'
          : '— signing failed'
      )
    }

    let emailed = false
    if (signed.ok) {
      try {
        await sendAccessLinkEmail({ to: email, itemName, token: signed.token })
        emailed = true
      } catch {
        console.error('Access link email failed for order', orderId)
      }
    }

    await payload
      .update({
        collection: 'purchases',
        id: purchase.id,
        overrideAccess: true,
        data: {
          ...(signed.ok ? { accessTokenJti: signed.jti } : {}),
          fulfillmentStatus: emailed ? 'sent' : 'failed',
        },
      })
      .catch(() =>
        console.error('Purchase status update failed for order', orderId)
      )
  } else {
    console.warn('Webhook: item not found', {
      itemType,
      itemId,
      creemProductId,
    })
    await payload
      .update({
        collection: 'purchases',
        id: purchase.id,
        overrideAccess: true,
        data: { fulfillmentStatus: 'failed' },
      })
      .catch(() => {})
  }

  // Always 200 once recorded so Creem doesn't retry a captured order.
  return new Response('ok', { status: 200 })
}
