/*
 * The daily renewal job: reminds owners whose updates are about to end, takes
 * repository access back on the day they end, tells the owner, and gives
 * access back to a license that is in force again.
 *
 * A plain module, never a server action. It acts only on licenses of its own
 * Creem environment, so a sandbox deployment never touches a live license.
 * It sends at most one reminder of each kind, one withdrawal and one notice
 * per end date, and a second run the same day changes nothing. Every date
 * decision comes from `dueAction` in licenseTerm.js: nothing here does date
 * arithmetic, and nothing reads the license's virtual `updatesUntil` field.
 *
 * With WAREKIT_REVOKE_ON_DEACTIVATE anything but `1` it is a dry run. It
 * sends no email, removes nobody, writes to no collection and calls GitHub
 * never; it only counts what it would have done. In a dry run it plans a
 * withdrawal with `planRevocation` (read-only) and never calls
 * `revokeLicenseAccess`, which writes `needsReview` even with the flag off.
 *
 * It never names anyone in a log: license ids, counts and an error's code or
 * name only. It never throws past one license: that license counts as
 * `failed` and the run goes on. Only a failure to read the licenses at all
 * escapes, so the route can answer 500.
 *
 * `handleRenewalJob` is the route's body. It answers only a caller that
 * sends `Authorization: Bearer <CRON_SECRET>`, which is what Vercel sends a
 * schedule's path target when CRON_SECRET is set.
 *
 * Imports are relative so the engine test project can load it.
 */

import crypto from 'crypto'

import { tryCreateAccessToken } from './accessToken'
import { creemEnvironment } from './creemEnv'
import { sendRenewalReminderEmail, sendUpdatesEndedEmail } from './fulfillment'
import { kitName } from './license'
import { recomputeTier } from './licenseRecord'
import { jsonResponse } from './licenseReport'
import { restoreLicenseAccess } from './licenseRestore'
import { planRevocation, revokeLicenseAccess } from './licenseRevoke'
import { dueAction, termState } from './licenseTerm'
import { PAID_TIERS } from './repoAccess'

const errorCode = (err) => err?.code ?? err?.name

/** The answer for any method but GET. */
export function getOnly() {
  return jsonResponse(
    { error: 'method_not_allowed', message: 'Use GET.' },
    405,
    { Allow: 'GET' }
  )
}

/* The Pro and Team kit rows, read once. A published row wins over a draft. */
async function readKitRows(payload) {
  const found = await payload.find({
    collection: 'products',
    where: { tier: { in: ['pro', 'team'] } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return [...(found.docs ?? [])].sort(
    (a, b) =>
      Number(b.status === 'published') - Number(a.status === 'published')
  )
}

/* One license's step. Holds the run's payload, counters and kit rows. */
function licenseStep({ payload, now, live, counts, kits }) {
  const exactKit = (license) =>
    kits.find((k) => k.stack === license.stack && k.tier === license.tier) ??
    null
  const linkKit = (license) =>
    exactKit(license) ??
    kits.find((k) => k.stack === license.stack && k.tier === 'team') ??
    null

  const kitFacts = (license) => {
    const kit = exactKit(license)
    return {
      kitName: kit?.name || kitName(license.stack) || 'WareKit',
      price: typeof kit?.renewalPrice === 'number' ? kit.renewalPrice : null,
    }
  }

  /* A fresh link to the license page. Throws when it cannot be made. */
  const licenseLink = (license) => {
    const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
    const kit = linkKit(license)
    if (!site || !kit) throw new Error('no license link')
    const signed = tryCreateAccessToken({
      purchaseId: null,
      licenseId: license.id,
      itemType: 'product',
      itemId: kit.id,
    })
    if (!signed.ok) throw new Error('no license link')
    return `${site}/access/seats/${signed.token}`
  }

  const write = (license, data) =>
    payload.update({
      collection: 'licenses',
      id: license.id,
      overrideAccess: true,
      data,
    })

  /* Best effort, never throws: a mark that cannot be given back only means
     the next run decides again from what is stored. */
  const giveBack = async (license, field, previous) => {
    try {
      await write(license, { [field]: previous ?? null })
    } catch (err) {
      console.error(
        'Could not give a renewal mark back',
        license.id,
        errorCode(err)
      )
    }
  }

  const failed = (license, what, err) => {
    counts.failed += 1
    console.error(`Renewal job: ${what}`, license.id, errorCode(err))
  }

  /* Claim the mark, send, and give the mark back when the send fails. */
  async function claimAndSend(license, field, until, send) {
    if (!license.ownerEmail) {
      failed(license, 'no owner email', null)
      return false
    }
    const previous = license[field] ?? null
    await write(license, { [field]: until })
    try {
      await send(licenseLink(license), kitFacts(license))
    } catch (err) {
      await giveBack(license, field, previous)
      failed(license, `could not send for ${field}`, err)
      return false
    }
    return true
  }

  async function remind(license, until, which) {
    const field =
      which === 'first' ? 'firstReminderSentFor' : 'lastReminderSentFor'
    if (!live) {
      counts[which === 'first' ? 'firstReminders' : 'lastReminders'] += 1
      return
    }
    const sent = await claimAndSend(license, field, until, (url, facts) =>
      sendRenewalReminderEmail({
        to: license.ownerEmail,
        kitName: facts.kitName,
        until,
        price: facts.price,
        url,
        which,
      })
    )
    if (sent)
      counts[which === 'first' ? 'firstReminders' : 'lastReminders'] += 1
  }

  async function notifyEnded(license, until) {
    if (!live) {
      counts.notices += 1
      return
    }
    const sent = await claimAndSend(
      license,
      'endedNoticeSentFor',
      until,
      (url, facts) =>
        sendUpdatesEndedEmail({
          to: license.ownerEmail,
          kitName: facts.kitName,
          endedOn: until,
          price: facts.price,
          url,
        })
    )
    if (sent) counts.notices += 1
  }

  async function withdraw(license, until) {
    if (!live) {
      const plan = await planRevocation(payload, license, now)
      counts.wouldRemove += plan.toRemove.length
      const wouldComplete =
        plan.state === 'no-seats' ||
        (plan.state === 'checked' && plan.checkFailed === 0)
      if (!wouldComplete) {
        counts.failed += 1
        return
      }
      counts.withdrawn += 1
      await notifyEnded(license, until)
      return
    }
    const result = await revokeLicenseAccess(payload, license, { now })
    if (!result.complete) {
      counts.failed += 1
      console.warn('Renewal job: withdrawal incomplete', {
        license: license.id,
        state: result.state,
        failed: result.failed,
      })
      return
    }
    await write(license, {
      accessWithdrawnAt: now.toISOString(),
      accessWithdrawnFor: until,
    })
    counts.withdrawn += 1
    await notifyEnded(license, until)
  }

  async function restore(license) {
    if (!live) {
      counts.restored += 1
      return
    }
    /* A fresh read: the restore acts on what is stored now. */
    const fresh = await payload.findByID({
      collection: 'licenses',
      id: license.id,
      depth: 0,
      overrideAccess: true,
    })
    const result = await restoreLicenseAccess(payload, fresh)
    if (result.state === 'restored') {
      counts.restored += 1
      return
    }
    if (result.state === 'retry') {
      counts.failed += 1
      /* A paid license that cannot get its access back is for a person to
         see. Flagged once, not every night. */
      if (!fresh.needsReview) await write(fresh, { needsReview: true })
    }
  }

  return async function step(row) {
    let license = row
    if (live) {
      /* Also how a license with no date yet gets its first one. */
      await recomputeTier(payload, row.id)
      license = await payload.findByID({
        collection: 'licenses',
        id: row.id,
        depth: 0,
        overrideAccess: true,
      })
    }
    const action = dueAction(license, now)
    if (!action) return
    const { until } = termState(license, now)
    if (action === 'first-reminder') return remind(license, until, 'first')
    if (action === 'last-reminder') return remind(license, until, 'last')
    if (action === 'withdraw') return withdraw(license, until)
    if (action === 'notify-ended') return notifyEnded(license, until)
    if (action === 'restore') return restore(license)
  }
}

/**
 * Run the job once. Returns the counts it also logs.
 * `live` defaults to WAREKIT_REVOKE_ON_DEACTIVATE === '1'; off, it is a dry
 * run that sends, removes and records nothing.
 */
export async function runRenewalJob(
  payload,
  {
    now = new Date(),
    live = process.env.WAREKIT_REVOKE_ON_DEACTIVATE === '1',
  } = {}
) {
  const counts = {
    live,
    checked: 0,
    firstReminders: 0,
    lastReminders: 0,
    withdrawn: 0,
    notices: 0,
    restored: 0,
    wouldRemove: 0,
    failed: 0,
  }

  const found = await payload.find({
    collection: 'licenses',
    where: { tier: { in: PAID_TIERS } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const env = creemEnvironment()
  const licenses = (found.docs ?? []).filter(
    (row) => (row.creemEnvironment || 'production') === env
  )
  const step = licenseStep({
    payload,
    now,
    live,
    counts,
    kits: await readKitRows(payload),
  })

  for (const row of licenses) {
    counts.checked += 1
    try {
      await step(row)
    } catch (err) {
      counts.failed += 1
      console.error('Renewal job: a license failed', row.id, errorCode(err))
    }
  }

  console.info(live ? 'Renewal job' : 'Renewal job dry run', counts)
  return counts
}

/* Constant-time: both sides are hashed first so lengths always match. */
function carriesSecret(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const given = request.headers.get('authorization') ?? ''
  const digest = (value) => crypto.createHash('sha256').update(value).digest()
  return crypto.timingSafeEqual(digest(given), digest(`Bearer ${secret}`))
}

/** The route's body: GET only, and only for a caller that sends the secret. */
export async function handleRenewalJob(request, getPayload, { now } = {}) {
  if (request.method !== 'GET') return getOnly()
  if (!carriesSecret(request)) {
    return jsonResponse({ status: 'unauthorized' }, 401)
  }
  try {
    const payload = await getPayload()
    return jsonResponse(await runRenewalJob(payload, now ? { now } : {}))
  } catch (err) {
    console.error('Renewal job failed to run', errorCode(err))
    return jsonResponse({ status: 'error' }, 500)
  }
}
