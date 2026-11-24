/*
 * Taking repository access back from a license that no longer earns it.
 *
 * A plain module, never a server action. Two callers use it: the refund
 * webhook, and the daily job that cuts off a license whose updates have ended.
 * It acts on a license that holds no paid tier (a refund; the webhook passes
 * in a fresh read of the license after `recomputeTier` has run, so the tier
 * here is what the license holds now), or on a paid license whose updates
 * have ended at `now`. For any other license it does nothing.
 *
 * It follows the rule `removeSeat` follows, for the same reason. GitHub is
 * touched only for a seat row with a stored `inviteUrl`, because that is the
 * only proof this license created the access: a row with no link may be an
 * existing collaborator, perhaps another customer, that an owner typed in.
 * Without that rule a buyer could add anyone, ask for a refund, and have the
 * refund revoke them. A person another paid license still covers, one whose
 * updates are in force, keeps what that license gives, in either Creem
 * environment.
 *
 * Whatever it cannot or may not touch is counted, never named: the log never
 * carries a GitHub username. Those rows, and any removal GitHub refuses, set
 * `needsReview` so a person looks at the repository.
 *
 * Behind WAREKIT_REVOKE_ON_DEACTIVATE === '1', as on the Whop route. While
 * the flag is off nothing is removed from GitHub and the log says what would
 * have been. Nothing here throws: the webhook runs it where an exception
 * makes Creem redeliver an order that is already recorded.
 *
 * `planRevocation` only reads. `revokeLicenseAccess` plans, then acts, logs
 * and flags, and returns counts the daily job can record.
 *
 * Imports are relative so the engine test project can load it.
 */

import { removeFromRepo } from './githubInvite'
import { termState } from './licenseTerm'
import { coveredByAnotherLicense, licenseRepo, PAID_TIERS } from './repoAccess'

async function flagForReview(payload, license) {
  try {
    await payload.update({
      collection: 'licenses',
      id: license.id,
      overrideAccess: true,
      data: { needsReview: true },
    })
  } catch (err) {
    console.error('Could not flag a license for review', license.id, err)
  }
}

const emptyPlan = (state, repo = null, seats = 0) => ({
  state,
  repo,
  seats,
  toRemove: [],
  covered: 0,
  unproven: 0,
  checkFailed: 0,
})

/* Whether this license is one the module acts on at `now`. */
function actsOn(license, now) {
  if (!license?.id) return false
  if (!PAID_TIERS.includes(license.tier ?? '')) return true
  return termState(license, now).ended
}

/**
 * Work out whom a withdrawal would remove, without touching anything.
 *
 * Reads only: never writes, never calls GitHub, never throws. A repository
 * lookup that fails is reported as `'no-repo'`.
 */
export async function planRevocation(payload, license, now = new Date()) {
  if (!actsOn(license, now)) return emptyPlan('not-ended')

  /* One person, however many rows. GitHub names are not case-sensitive, and
     a row that carries an invitation link is the one that proves anything. */
  const byName = new Map()
  for (const row of license.seatMembers ?? []) {
    const name = String(row?.githubUsername ?? '').trim()
    if (!name) continue
    const held = byName.get(name.toLowerCase())
    if (!held || (!held.inviteUrl && row.inviteUrl)) {
      byName.set(name.toLowerCase(), { ...row, githubUsername: name })
    }
  }
  const seats = [...byName.values()]
  if (!seats.length) return emptyPlan('no-seats')

  let repo = null
  try {
    repo = await licenseRepo(payload, license)
  } catch (err) {
    console.error('Revocation could not read the repository', license.id, err)
  }
  if (!repo) return emptyPlan('no-repo', null, seats.length)

  /* `unproven` is every seat this license cannot show it created, plus any
     whose coverage could not be checked; `covered` is accounted for by
     another license. */
  const plan = emptyPlan('checked', repo, seats.length)
  for (const row of seats) {
    if (!row.inviteUrl) {
      plan.unproven += 1
      continue
    }
    try {
      if (
        await coveredByAnotherLicense(payload, license, row.githubUsername, now)
      ) {
        plan.covered += 1
        continue
      }
    } catch (err) {
      /* Cannot tell, so cannot take the access away. Only the error's code
         or name is logged: a database error's message carries the query
         parameters, and the cover query's is the username. */
      console.error(
        'Revocation coverage check failed',
        license.id,
        err?.code ?? err?.name
      )
      plan.unproven += 1
      plan.checkFailed += 1
      continue
    }
    plan.toRemove.push(row.githubUsername)
  }
  return plan
}

/**
 * Remove the repository access a license no longer earns.
 *
 * Does nothing (state `'not-ended'`) while the license holds a paid tier and
 * its updates have not ended, whoever calls it. Never throws.
 */
export async function revokeLicenseAccess(
  payload,
  license,
  { now = new Date() } = {}
) {
  const live = process.env.WAREKIT_REVOKE_ON_DEACTIVATE === '1'
  const report = (plan, counts = {}) => {
    const out = {
      state: plan.state,
      live,
      repo: plan.repo,
      seats: plan.seats,
      wouldRemove: plan.toRemove.length,
      removed: 0,
      covered: plan.covered,
      unproven: plan.unproven,
      failed: 0,
      checkFailed: plan.checkFailed,
      ...counts,
    }
    out.complete =
      live &&
      (out.state === 'no-seats' ||
        (out.state === 'checked' && out.failed === 0 && out.checkFailed === 0))
    return out
  }

  try {
    const plan = await planRevocation(payload, license, now)
    if (plan.state === 'not-ended' || plan.state === 'no-seats') {
      return report(plan)
    }
    if (plan.state === 'no-repo') {
      console.warn('Revocation skipped: no repository found for the license', {
        license: license.id,
        seats: plan.seats,
      })
      await flagForReview(payload, license)
      return report(plan)
    }

    let failed = 0
    let removed = 0
    if (live) {
      for (const username of plan.toRemove) {
        let result
        try {
          result = await removeFromRepo({ repo: plan.repo, username })
        } catch {
          result = { ok: false, reason: 'threw' }
        }
        if (result.ok) {
          removed += 1
          continue
        }
        failed += 1
        console.error('Revoke failed', {
          license: license.id,
          repo: plan.repo,
          reason: result.reason,
        })
      }
    }

    const summary = {
      license: license.id,
      repo: plan.repo,
      seats: plan.seats,
      removed,
      covered: plan.covered,
      unproven: plan.unproven,
      failed,
    }
    if (!live) {
      console.warn('Would revoke repo access (flag off)', {
        ...summary,
        wouldRemove: plan.toRemove.length,
      })
    } else if (plan.unproven || failed) {
      console.warn('Revocation left repo access in place', summary)
    } else {
      console.info('Revoked repo access', summary)
    }

    /* A person looks whenever someone still has the repository and nothing
       here accounts for them: a seat we could not vouch for, a removal that
       failed, or every removal while the flag is off. */
    if (plan.unproven || failed || (!live && plan.toRemove.length)) {
      await flagForReview(payload, license)
    }
    return report(plan, { removed, failed })
  } catch (err) {
    console.error('Revocation failed', license?.id, err?.code ?? err?.name)
    return report(emptyPlan('no-repo'))
  }
}
