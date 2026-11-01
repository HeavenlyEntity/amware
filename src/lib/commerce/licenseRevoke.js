/*
 * Taking repository access back from a license that has no paid tier left.
 *
 * A plain module, never a server action. The refund webhook passes in the
 * Payload client and a fresh read of the license, after `recomputeTier` has
 * run, so the tier here is what the license holds now.
 *
 * It follows the rule `removeSeat` follows, for the same reason. GitHub is
 * touched only for a seat row with a stored `inviteUrl`, because that is the
 * only proof this license created the access: a row with no link may be an
 * existing collaborator, perhaps another customer, that an owner typed in.
 * Without that rule a buyer could add anyone, ask for a refund, and have the
 * refund revoke them. A person another paid license still covers keeps what
 * that license gives, in either Creem environment.
 *
 * Whatever it cannot or may not touch is counted, never named: the log never
 * carries a GitHub username. Those rows, and any removal GitHub refuses, set
 * `needsReview` so a person looks at the repository.
 *
 * Behind WAREKIT_REVOKE_ON_DEACTIVATE === '1', as on the Whop route. While
 * the flag is off nothing is removed from GitHub and the log says what would
 * have been. Nothing here throws: it runs inside a webhook, where an
 * exception makes Creem redeliver an order that is already recorded.
 *
 * Imports are relative so the engine test project can load it.
 */

import { removeFromRepo } from './githubInvite'
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

/**
 * Remove the repository access a refunded license created.
 *
 * Does nothing while the license still holds a paid tier, whoever calls it.
 */
export async function revokeLicenseAccess(payload, license) {
  if (!license?.id || PAID_TIERS.includes(license.tier ?? '')) return

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
  if (!seats.length) return

  const live = process.env.WAREKIT_REVOKE_ON_DEACTIVATE === '1'

  let repo = null
  try {
    repo = await licenseRepo(payload, license)
  } catch (err) {
    console.error('Revocation could not read the repository', license.id, err)
  }
  if (!repo) {
    console.warn('Revocation skipped: no repository found for the license', {
      license: license.id,
      seats: seats.length,
    })
    await flagForReview(payload, license)
    return
  }

  /* Pass one decides, pass two acts, so the log can say what would happen
     even with the flag off. `unproven` is every seat this license cannot
     show it created; `covered` is accounted for by another license. */
  const toRemove = []
  let covered = 0
  let unproven = 0
  for (const row of seats) {
    if (!row.inviteUrl) {
      unproven += 1
      continue
    }
    try {
      if (await coveredByAnotherLicense(payload, license, row.githubUsername)) {
        covered += 1
        continue
      }
    } catch (err) {
      // Cannot tell, so cannot take the access away.
      console.error('Revocation coverage check failed', license.id, err)
      unproven += 1
      continue
    }
    toRemove.push(row.githubUsername)
  }

  let failed = 0
  let removed = 0
  if (live) {
    for (const username of toRemove) {
      const result = await removeFromRepo({ repo, username })
      if (result.ok) {
        removed += 1
        continue
      }
      failed += 1
      console.error('Revoke failed', {
        license: license.id,
        repo,
        reason: result.reason,
      })
    }
  }

  const summary = {
    license: license.id,
    repo,
    seats: seats.length,
    removed,
    covered,
    unproven,
    failed,
  }
  if (!live) {
    console.warn('Would revoke repo access (flag off)', {
      ...summary,
      wouldRemove: toRemove.length,
    })
  } else if (unproven || failed) {
    console.warn('Revocation left repo access in place', summary)
  } else {
    console.info('Revoked repo access', summary)
  }

  /* A person looks whenever someone still has the repository and nothing
     here accounts for them: a seat we could not vouch for, a removal that
     failed, or every removal while the flag is off. */
  if (unproven || failed || (!live && toRemove.length)) {
    await flagForReview(payload, license)
  }
}
