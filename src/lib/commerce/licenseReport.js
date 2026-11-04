/*
 * The public license routes: a deployed kit reports the NetSuite account it
 * runs on (`POST /licenses/report`), and the CLI asks what a key covers
 * (`POST /licenses/status`). The kit never talks to Creem. This site holds
 * the Creem key, so it is the one place that activates an instance.
 *
 * A plain module, never a server action: it must not carry 'use server',
 * because every export of such a file becomes a public endpoint. Imports are
 * relative so the engine test project can load it.
 *
 * What the routes promise:
 *  - Our `licenses.accounts` list is the authority. Creem does not merge
 *    repeat activations, so a listed account never reaches Creem again, and
 *    Creem's own count is a second record that may lag.
 *  - Nothing here blocks anyone. An account over the limit is recorded and
 *    answered `over_limit`; the kit prints one line and carries on.
 *  - An `invalid` answer is the same whatever the cause: an unknown key, a
 *    key from the other environment or another kit, a refunded license. The
 *    route cannot be used to tell them apart.
 *  - No answer ever carries the key, the owner's address or a Creem id.
 *  - `lastSeenAt` is a rough signal, moved at most once an hour.
 *  - The accounts array is read, changed and written back under the
 *    license's row lock (licenseLock.js), so two reports at once are decided
 *    one after the other and neither loses the other's row.
 *
 * Rate limiting is a Vercel Firewall rule, not code here.
 */

import { activateLicense } from './creem'
import { creemEnvironment } from './creemEnv'
import { tryCreateAccessToken } from './accessToken'
import { sendOverLimitEmail } from './fulfillment'
import {
  activeAccounts,
  licenseLimits,
  normalizeAccountId,
  tierRank,
} from './license'
import { currentKey, licenseFromClaims, relationId } from './licenseRecord'
import { withLicenseLock } from './licenseLock'

/** The largest request body read, in bytes. */
export const MAX_BODY_BYTES = 2048

/** The kit's client gives up at 3 seconds; Creem gets 2 of them. */
const CREEM_TIMEOUT_MS = 2000

/** Accounts stored past the limit before the route stops writing more. A
    leaked key could otherwise grow the row and mail the owner once per
    made-up account. */
const OVER_LIMIT_ROWS = 25

/** How old a listed account's `lastSeenAt` may be before a report moves it.
    Every license write rewrites the whole document, which is a lot to spend
    on a rough signal. */
const LAST_SEEN_INTERVAL_MS = 60 * 60 * 1000

const INVALID = Object.freeze({ status: 'invalid' })

/* ---------------------------------------------------------------- parsing */

const NO_STORE = { 'Cache-Control': 'no-store' }

/** A JSON response that is never cached and carries no CORS headers. */
export function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...NO_STORE, ...headers },
  })
}

/** The answer for any method but POST. */
export function methodNotAllowed() {
  return jsonResponse(
    { error: 'method_not_allowed', message: 'Use POST.' },
    405,
    { Allow: 'POST' }
  )
}

const bad = (status, error, message) => ({ ok: false, status, error, message })
const tooLarge = () =>
  bad(413, 'too_large', `The request body is over ${MAX_BODY_BYTES} bytes.`)

/*
 * The raw body as a string, read up to `MAX_BODY_BYTES`. The cap is enforced
 * on the bytes that arrive: `Content-Length` can be absent or can lie, so it
 * only lets an obviously oversized request be refused before anything is
 * read. A stream that keeps going is cancelled the moment it passes the cap.
 */
async function readBody(request) {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return tooLarge()

  const reader = request.body?.getReader()
  if (!reader) return bad(400, 'bad_request', 'Send a JSON body.')

  const chunks = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {})
      return tooLarge()
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return {
      ok: true,
      text: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    }
  } catch {
    return bad(400, 'bad_request', 'The body is not valid UTF-8 JSON.')
  }
}

const text = (value, max) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed && trimmed.length <= max ? trimmed : null
}

/*
 * The account ID, reduced to the one NetSuite issued. `normalizeAccountId`
 * strips a sandbox or Release Preview suffix; this also keeps the characters
 * to those an account ID has (digits and letters, with `_` or `-`), because
 * the ID is stored, shown on the license page and written into the owner's
 * email, and a leaked key must not be able to put a sentence there.
 */
function safeAccountId(raw) {
  const id = normalizeAccountId(raw)
  return id && /^[A-Z0-9][A-Z0-9_-]*$/.test(id) ? id : null
}

/**
 * Read and check a request for either route. `account` is true for the
 * report route, which also needs an account ID.
 *
 * Returns `{ ok: true, value }` or `{ ok: false, status, error, message }`:
 * 400 for an empty body, text that is not JSON, JSON that is not an object,
 * a missing or wrongly typed field, or an account ID that cannot be one;
 * 413 above 2 KB.
 */
export async function parseLicenseRequest(request, { account }) {
  const read = await readBody(request)
  if (!read.ok) return read

  let body
  try {
    body = JSON.parse(read.text)
  } catch {
    return bad(400, 'bad_request', 'The body is not valid JSON.')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return bad(400, 'bad_request', 'The body must be a JSON object.')
  }

  const key = text(body.key, 200)
  const kit = text(body.kit, 64)
  if (!key || !kit) {
    return bad(400, 'bad_request', 'Send `key` and `kit` as text.')
  }
  if (!account) return { ok: true, value: { key, kit } }

  const accountId = typeof body.accountId === 'string' ? body.accountId : null
  if (!accountId || !safeAccountId(accountId)) {
    return bad(400, 'bad_request', 'Send `accountId` as a NetSuite account ID.')
  }
  return { ok: true, value: { key, accountId, kit } }
}

/* ----------------------------------------------------------------- lookup */

const itemIdOf = (purchase) =>
  purchase?.item && typeof purchase.item === 'object'
    ? purchase.item.value
    : purchase?.item

/*
 * The license a key opens, or null for every reason it should not: no such
 * key, a purchase from the other Creem environment, no license, a key from
 * another kit, or a license below Pro. Every key was sold with a paid tier,
 * so a license below Pro has been refunded: its tier is null, or `lite` if it
 * began as a free claim. Creem leaves a refunded key active, so only our table
 * stops it. `kit` is the `kit` in the kit's `warekit.json`, which equals the
 * license's `stack`.
 *
 * A database failure is thrown, not turned into null: "invalid" is an
 * answer, and the caller must not give it because it could not look.
 */
async function findLicense(payload, key, kit) {
  const env = creemEnvironment()
  const found = await payload.find({
    collection: 'purchases',
    where: { licenseKey: { equals: key } },
    depth: 0,
    limit: 5,
    overrideAccess: true,
  })
  const purchase = (found?.docs ?? []).find(
    (row) =>
      row.licenseKey === key && (row.creemEnvironment || 'production') === env
  )
  if (!purchase) return null

  const claims = await licenseFromClaims(payload, {
    licenseId: relationId(purchase.license),
  })
  const license = claims?.license
  if (!license || license.stack !== kit) return null
  if (tierRank(license.tier) < tierRank('pro')) return null
  return { license, purchase, product: claims.product }
}

const rowsOf = (license) =>
  Array.isArray(license.accounts) ? license.accounts : []

/* ------------------------------------------------------------------ writes */

/* A timestamp from the future is not recent: it would otherwise stop updating
   until then. */
const seenRecently = (row, now) => {
  const elapsed = now - Date.parse(String(row.lastSeenAt ?? ''))
  return elapsed >= 0 && elapsed < LAST_SEEN_INTERVAL_MS
}

const saveAccounts = (payload, license, accounts, tx = {}) =>
  payload.update({
    collection: 'licenses',
    id: license.id,
    overrideAccess: true,
    data: { accounts },
    ...tx,
  })

const readFresh = (payload, licenseId, tx) =>
  payload.findByID({
    collection: 'licenses',
    id: licenseId,
    depth: 0,
    overrideAccess: true,
    ...tx,
  })

/* Change one row against a fresh read under the license's lock, for the
   writes that follow a slow call (Creem, the mail), so what happened in the
   meantime is not lost. */
async function patchRow(payload, licenseId, accountId, patch) {
  await withLicenseLock(payload, licenseId, async (tx) => {
    const fresh = await readFresh(payload, licenseId, tx)
    const rows = rowsOf(fresh)
    if (!rows.some((row) => row.accountId === accountId)) return
    await saveAccounts(
      payload,
      fresh,
      rows.map((row) =>
        row.accountId === accountId ? { ...row, ...patch } : row
      ),
      tx
    )
  })
}

/*
 * Activate an account in Creem and store the instance id. The row is written
 * before this runs, so a slow or failing Creem leaves the account recorded
 * with no instance, and the next report retries. It activates with the
 * license's current key, which may not be the one reported (an upgrade's
 * newer key, or a key from a duplicate purchase).
 *
 * A Creem failure is logged and swallowed. A timed-out call may still have
 * landed, so a retry can add a second instance there; our table is what the
 * limit is checked against.
 */
async function activateRow(payload, license, accountId) {
  let instanceId
  try {
    const key = await currentKey(payload, license.id)
    if (!key) {
      console.error('Report: no key to activate with', { license: license.id })
      return
    }
    ;({ instanceId } = await activateLicense({
      key,
      instanceName: accountId,
      timeoutMs: CREEM_TIMEOUT_MS,
    }))
  } catch (err) {
    console.error('Report: Creem activation failed', {
      license: license.id,
      status: err?.status,
    })
    return
  }
  await patchRow(payload, license.id, accountId, {
    creemInstanceId: instanceId,
  })
}

/*
 * Tell the license owner, once, that an account is over the limit. Only
 * `ownerEmail` is mailed, with a fresh signed link to the license page.
 * `notifiedAt` is set after the send succeeds, so a failed mail is tried
 * again on the next report. Nothing here may change the answer, so every
 * failure is logged and swallowed.
 */
async function notifyOwner(
  payload,
  { license, purchase, accountId, used, limit }
) {
  try {
    const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
    if (!license.ownerEmail || !site) {
      console.error('Report: cannot mail the owner', { license: license.id })
      return
    }
    const signed = tryCreateAccessToken({
      purchaseId: purchase.id,
      licenseId: license.id,
      itemType: 'product',
      itemId: itemIdOf(purchase) ?? purchase.id,
    })
    if (!signed.ok) {
      console.error('Report: could not sign a license link', signed.reason)
      return
    }
    await sendOverLimitEmail({
      to: license.ownerEmail,
      accountId,
      used,
      limit,
      url: `${site}/access/seats/${signed.token}`,
    })
    await patchRow(payload, license.id, accountId, {
      notifiedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Report: over-limit mail failed', {
      license: license.id,
      name: err?.name,
    })
  }
}

/* ---------------------------------------------------------------- answers */

/**
 * Record a deployed account against its license.
 *
 * @returns {Promise<{ status: 'ok' | 'invalid' | 'over_limit', tier?: string, used?: number, limit?: number }>}
 */
export async function reportAccount(payload, { key, accountId, kit }) {
  const id = safeAccountId(accountId)
  if (!id) return INVALID
  const found = await findLicense(payload, key, kit)
  if (!found) return INVALID

  const { license, purchase, product } = found
  const tier = license.tier
  // Every tier `findLicense` lets through tracks accounts, so this only stops
  // a limit it could not read from being written against.
  if (licenseLimits(license, product).accounts == null) {
    return { status: 'ok', tier }
  }

  /* Decided and written under the license's lock, from the accounts as they
     are at that moment. Two deploys reporting at once used to both see room
     for one more and both be let in, and the second write dropped the first
     one's row. Now the second waits, sees the first, and is answered from
     what is really there. Creem and the owner's mail come after the lock is
     let go, so neither holds it. */
  const now = new Date().toISOString()
  const step = await withLicenseLock(payload, license.id, async (tx) => {
    const fresh = await readFresh(payload, license.id, tx)
    const limit = licenseLimits(fresh, product).accounts
    if (limit == null) return { status: 'ok', bare: true }

    const rows = rowsOf(fresh)
    const used = activeAccounts(rows)
    const listed = rows.find((row) => row.accountId === id)
    const recent = listed != null && seenRecently(listed, Date.parse(now))
    const save = (accounts) => saveAccounts(payload, fresh, accounts, tx)
    const touch = () =>
      save(
        rows.map((row) => (row === listed ? { ...row, lastSeenAt: now } : row))
      )

    if (listed?.status === 'active') {
      if (!recent || !listed.creemInstanceId) await touch()
      return { status: 'ok', used, limit, activate: !listed.creemInstanceId }
    }

    if (listed) {
      // Over limit when last seen. Room now (an upgrade, a removed account)
      // promotes it; otherwise it stays marked and is mailed if the last
      // mail never went out.
      if (used < limit) {
        await save(
          rows.map((row) =>
            row === listed ? { ...row, status: 'active', lastSeenAt: now } : row
          )
        )
        return {
          status: 'ok',
          used: used + 1,
          limit,
          activate: !listed.creemInstanceId,
        }
      }
      if (!recent) await touch()
      return { status: 'over_limit', used, limit, notify: !listed.notifiedAt }
    }

    if (used < limit) {
      await save([
        ...rows,
        { accountId: id, status: 'active', firstSeenAt: now, lastSeenAt: now },
      ])
      return { status: 'ok', used: used + 1, limit, activate: true }
    }

    // No room. Past the cap the answer is the same but nothing is stored or
    // mailed, so a leaked key cannot grow the row or the owner's inbox.
    if (rows.length >= limit + OVER_LIMIT_ROWS) {
      return { status: 'over_limit', used, limit }
    }

    await save([
      ...rows,
      {
        accountId: id,
        status: 'over_limit',
        firstSeenAt: now,
        lastSeenAt: now,
      },
    ])
    return { status: 'over_limit', used, limit, notify: true }
  })

  if (step.bare) return { status: 'ok', tier }
  if (step.activate) await activateRow(payload, license, id)
  if (step.notify) {
    await notifyOwner(payload, {
      license,
      purchase,
      accountId: id,
      used: step.used,
      limit: step.limit,
    })
  }
  return { status: step.status, tier, used: step.used, limit: step.limit }
}

/**
 * What a key covers, for `warekit license status`. Reads only.
 *
 * @returns {Promise<{ status: 'ok' | 'invalid', tier?: string, developers?: { used: number, limit: number }, accounts?: { used: number, limit: number } }>}
 */
export async function licenseStatus(payload, { key, kit }) {
  const found = await findLicense(payload, key, kit)
  if (!found) return INVALID

  const { license, product } = found
  const limits = licenseLimits(license, product)
  const seatsUsed = Array.isArray(license.seatMembers)
    ? license.seatMembers.length
    : 0
  return {
    status: 'ok',
    tier: license.tier,
    developers: { used: seatsUsed, limit: limits.seats },
    ...(limits.accounts != null
      ? {
          accounts: {
            used: activeAccounts(license.accounts),
            limit: limits.accounts,
          },
        }
      : {}),
  }
}

/* --------------------------------------------------------------- handlers */

/* Any thrown error is a 503 with JSON, never a 500 page. Only the error's
   name is logged: a database error can carry the query's parameters, and the
   key is one of them. */
async function handle(request, getPayload, account, run) {
  try {
    const parsed = await parseLicenseRequest(request, { account })
    if (!parsed.ok) {
      return jsonResponse(
        { error: parsed.error, message: parsed.message },
        parsed.status
      )
    }
    return jsonResponse(await run(await getPayload(), parsed.value))
  } catch (err) {
    console.error('License route failed', { name: err?.name, code: err?.code })
    return jsonResponse(
      { error: 'unavailable', message: 'Try again shortly.' },
      503
    )
  }
}

/** `POST /licenses/report`. `getPayload` is `getPayloadClient`. */
export const handleReport = (request, getPayload) =>
  handle(request, getPayload, true, reportAccount)

/** `POST /licenses/status`. */
export const handleStatus = (request, getPayload) =>
  handle(request, getPayload, false, licenseStatus)
