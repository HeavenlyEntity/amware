/*
 * The link from onboarding to the license page.
 *
 * A plain module, never a server action. Imports are relative so the engine
 * test project can load it.
 *
 * The onboarding link itself never expires, so it must not be a way to keep
 * minting fresh license links. A license link is minted only for a purchase
 * that is young enough to be the one that just happened, which is the same
 * 30 days a license link lives. After that the buyer is sent to
 * `/access/resend`, which emails a new one to the license owner.
 */

import { DEFAULT_TTL_MS, tryCreateAccessToken } from './accessToken'

export const LICENSE_LINK_WINDOW_MS = DEFAULT_TTL_MS
export const RESEND_PATH = '/access/resend'

/**
 * `{ url, expired }` for a purchase's license page. `url` is null when the
 * purchase is past the window (`expired` true) or when no token can be signed
 * (`expired` false); a caller leaves the step out in the second case.
 */
export function licenseLinkFor({
  purchase,
  licenseId,
  itemId,
  now = Date.now(),
}) {
  const created = Date.parse(purchase?.createdAt ?? '')
  if (!Number.isFinite(created) || now - created > LICENSE_LINK_WINDOW_MS) {
    return { url: null, expired: true }
  }
  if (itemId == null) return { url: null, expired: false }

  const signed = tryCreateAccessToken({
    purchaseId: purchase.id,
    ...(licenseId != null ? { licenseId } : {}),
    itemType: 'product',
    itemId,
  })
  return signed.ok
    ? { url: `/access/seats/${signed.token}`, expired: false }
    : { url: null, expired: false }
}
