'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { WhopElements, Checkout, CheckoutElement } from '@whop/elements-react'
import { loadWhop } from '@whop/elements'
import { whopEnvironment } from '@/lib/commerce/whopEnv'
import { useMounted } from '@/hooks/use-client-value'

/* The one Whop checkout on this site, for kits and deposits alike.
 *
 * Whop Elements has no completion callback: a finished checkout redirects
 * the whole tab to returnUrl, and Whop says to fulfil from webhooks rather
 * than from the browser. So this component mints a random reference once,
 * hands it to Whop as order metadata, and puts it on the return URL. The
 * webhook stores it; the return page looks the purchase up by it. What Whop
 * itself appends to the URL is undocumented, and nothing here depends on it.
 *
 * Not every Elements option is fixed at creation. The checkout's session
 * options — plan, returnUrl and metadata among them — are set at create
 * only: the session is minted from them, and changing one later refuses
 * rather than updating (CheckoutOptions in @whop/elements/checkout.d.ts).
 * appearance and locale are not: appearance changes live through update(),
 * and locale is not create-only either (this component passes none). Even
 * so, the element mounts only once the absolute origin is known, and every
 * option handed to it is frozen for the life of the mount — the create-only
 * ones because they must be, appearance because the mode is read once, on
 * mount (below) — not just correct in value on the first render:
 *
 *  - returnUrl is built once, on the render where `mounted` first turns
 *    true, from whatever returnPath/returnParams are current at that
 *    moment. Neither is listed as a useMemo dependency, so a later render
 *    with different returnPath/returnParams props never recomputes it —
 *    `mounted` and `ref` are the only deps, and neither changes again once
 *    set.
 *  - metadata and appearance are memoized so the object itself keeps one
 *    identity for the mount, not just equal contents. @whop/elements-react
 *    diffs its options per top-level key with Object.is and calls
 *    handle.update() on any reference change (see
 *    node_modules/@whop/elements-react/_runtime/react/util.js,
 *    useLiveHandle) — a fresh `{}` literal every render would trigger that
 *    update for a create-only option even when nothing in it actually
 *    changed.
 *  - plan and returnUrl are already strings, so Object.is holds on its own
 *    once returnUrl stops moving.
 *
 * Elements run in their own frames and cannot see the page's theme, so the
 * mode is read from the root class when the element first mounts. */

/* Holds the checkout's space while Whop's frame paints, so the sheet or
   the product page is never a blank gap. */
function CheckoutSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading checkout"
      className="h-72 w-full rounded-lg bg-zinc-100 motion-safe:animate-pulse dark:bg-zinc-800/60"
    />
  )
}

/* Whop's script did not load: a proxy, a privacy extension, a CDN
   incident. Said here, in the checkout's own space, so nothing else on the
   page goes with it. Try again starts a fresh load of the script. */
function CheckoutLoadFailed({ onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-zinc-200 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
    >
      <p className="font-medium text-zinc-900 dark:text-zinc-100">
        The checkout could not load.
      </p>
      <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 inline-flex items-center justify-center rounded-md border border-zinc-300 px-4 font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Try again
        </button>
        <span>
          or{' '}
          <Link
            href="/contact"
            className="text-teal-700 underline underline-offset-4 dark:text-teal-300"
          >
            get in touch
          </Link>
        </span>
      </p>
    </div>
  )
}

/* The checkout's reference: a random RFC 4122 version 4 UUID.
   crypto.randomUUID only exists in a secure context -- not on
   http://<LAN-IP>, and not in Safari before 15.4 -- and calling it there
   throws during render, a crash no load-error handling can catch.
   getRandomValues needs no secure context, so without randomUUID the same
   UUID is built from 16 random bytes: the version nibble set to 4, the
   variant bits to 10. Either way it passes the validator the webhook and
   the return pages share. */
function newCheckoutRef() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}

export function WhopCheckout({ planId, returnPath, returnParams, className }) {
  const mounted = useMounted()
  const [ref] = useState(newCheckoutRef)
  /* Set when Whop's script fails to load: holds the provider's retry(),
     which starts a fresh load in place. With onLoadError set, the provider
     reports the failure here instead of throwing it during render -- which,
     with no error boundary under src/app, would take the whole page down. */
  const [loadFailure, setLoadFailure] = useState(null)

  const returnUrl = useMemo(() => {
    if (!mounted) return null
    const url = new URL(returnPath, window.location.origin)
    for (const [key, value] of Object.entries(returnParams || {})) {
      if (value) url.searchParams.set(key, String(value))
    }
    url.searchParams.set('ref', ref)
    return url.toString()
    // returnPath and returnParams are read once, at the render where
    // mounted first turns true, then never again: options cannot change
    // after mount, so a later render must not recompute this even if the
    // caller passes different values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, ref])

  const dark = useMemo(
    () => mounted && document.documentElement.classList.contains('dark'),
    [mounted]
  )

  const metadata = useMemo(() => ({ checkout_ref: ref }), [ref])
  const appearance = useMemo(
    () => ({
      theme: { appearance: dark ? 'dark' : 'light', accentColor: 'teal' },
    }),
    [dark]
  )

  if (!planId || !returnUrl) return null

  /* loadWhop() is called on every render, and that is safe: it injects the
     script once and hands back one shared promise, so the provider keeps
     seeing the same load. It holds a failed load until retry() replaces it,
     then hands out the fresh one -- so nothing is cached here, where a copy
     would pin the failure for the life of the tab. */
  const onLoadError = (error, retry) => {
    console.error('Whop checkout failed to load', error)
    setLoadFailure({ retry })
  }

  const tryAgain = () => {
    loadFailure.retry()
    setLoadFailure(null)
  }

  return (
    <div className={className}>
      <WhopElements
        elements={loadWhop()}
        environment={whopEnvironment()}
        appearance={appearance}
        onLoadError={onLoadError}
      >
        {loadFailure ? (
          <CheckoutLoadFailed onRetry={tryAgain} />
        ) : (
          <Checkout
            plan={planId}
            returnUrl={returnUrl}
            metadata={metadata}
            fallback={<CheckoutSkeleton />}
          >
            <CheckoutElement />
          </Checkout>
        )}
      </WhopElements>
    </div>
  )
}
