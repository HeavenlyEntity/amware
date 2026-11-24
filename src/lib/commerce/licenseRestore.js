/*
 * Giving a license's developers repository access again after a renewal.
 *
 * A plain module, never a server action. Two callers use it: the webhook that
 * records a renewal, and the daily job that finds a license still marked as
 * withdrawn. It is the other half of `revokeLicenseAccess`: when updates end,
 * that module removes the people this license invited and marks the license
 * (`accessWithdrawnAt`, `accessWithdrawnFor`); when the owner renews, this one
 * invites them again and clears the marks. A license with no mark is left
 * alone.
 *
 * It invites only the developers on the license now. A developer the owner
 * removed while updates had ended is gone from `seatMembers`, so they are not
 * invited again. Each person is invited once, however many rows name them
 * (GitHub names are not case-sensitive). It does not change `inviteUrl` on any
 * seat row.
 *
 * GitHub being unreachable, rate-limited or not configured, or no repository
 * being found, says nothing about the renewal. The marks stay and the daily
 * job tries again. Any other refusal needs a person: the license is flagged
 * `needsReview`, and the marks are still cleared so one refusal does not keep
 * everyone else waiting.
 *
 * The log carries the license id and counts, never a GitHub username. Nothing
 * here throws: it runs inside a webhook, where an exception makes Creem
 * redeliver an order that is already recorded.
 *
 * Imports are relative so the engine test project can load it.
 */

import { inviteToRepo } from './githubInvite'
import { licenseRepo } from './repoAccess'

/* Reasons that mean "GitHub could not be asked", not "GitHub said no". */
const RETRY_REASONS = ['unreachable', 'rate-limited', 'not-configured']

async function flagForReview(payload, license) {
  try {
    await payload.update({
      collection: 'licenses',
      id: license.id,
      overrideAccess: true,
      data: { needsReview: true },
    })
    return true
  } catch (err) {
    console.error('Could not flag a license for review', license.id, err?.code)
    return false
  }
}

/**
 * Invite the developers on a license again and clear its withdrawn marks.
 *
 * Returns `{ state, invited, already, failed }`. State is `'restored'` (marks
 * cleared), `'retry'` (marks left, try again later) or `'skipped'` (the license
 * was not withdrawn). Never throws.
 */
export async function restoreLicenseAccess(payload, license) {
  const counts = { invited: 0, already: 0, failed: 0 }
  const done = (state) => ({ state, ...counts })

  try {
    if (!license?.id || !license.accessWithdrawnAt) return done('skipped')

    const names = new Map()
    for (const row of license.seatMembers ?? []) {
      const name = String(row?.githubUsername ?? '').trim()
      if (name && !names.has(name.toLowerCase())) {
        names.set(name.toLowerCase(), name)
      }
    }

    let repo = null
    if (names.size) {
      try {
        repo = await licenseRepo(payload, license)
      } catch {
        console.error('Restore could not read the repository', license.id)
      }
      if (!repo) {
        console.warn('Restore waiting: no repository found for the license', {
          license: license.id,
          seats: names.size,
        })
        return done('retry')
      }
    }

    let retry = false
    let needsReview = false
    for (const username of names.values()) {
      let result
      try {
        result = await inviteToRepo({ repo, username })
      } catch {
        result = { ok: false, reason: 'unreachable' }
      }
      if (result.ok) {
        if (result.state === 'already-a-collaborator') counts.already += 1
        else counts.invited += 1
        continue
      }
      counts.failed += 1
      console.error('Restore invitation failed', {
        license: license.id,
        repo,
        reason: result.reason,
      })
      if (RETRY_REASONS.includes(result.reason)) {
        retry = true
        /* These two hold for every seat, so asking again would only repeat
           the failure. `unreachable` may be one seat's odd answer, so the
           other seats still get their turn. */
        if (result.reason !== 'unreachable') break
        continue
      }
      needsReview = true
    }

    /* A refusal nobody was told about must not end the daily job's interest:
       if the flag did not land, keep the marks so the next run asks again. */
    if (needsReview && !(await flagForReview(payload, license))) {
      return done('retry')
    }
    if (retry) {
      console.warn('Restore waiting: GitHub could not be reached', {
        license: license.id,
        ...counts,
      })
      return done('retry')
    }

    try {
      await payload.update({
        collection: 'licenses',
        id: license.id,
        overrideAccess: true,
        data: { accessWithdrawnAt: null, accessWithdrawnFor: null },
      })
    } catch (err) {
      /* The invitations went out but the marks stayed: the next run invites
         again, which is safe (an existing collaborator answers 204). */
      console.error(
        'Could not clear the withdrawn marks',
        license.id,
        err?.code
      )
      return done('retry')
    }

    console.info('Restored repo access', { license: license.id, ...counts })
    return done('restored')
  } catch (err) {
    console.error('Restore failed', license?.id, err?.code ?? err?.name)
    return done('retry')
  }
}
