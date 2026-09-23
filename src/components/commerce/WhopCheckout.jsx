'use client'

import { useMemo, useState } from 'react'
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
 * Every Elements option is fixed at creation — changing one later fails
 * rather than updating — so the element mounts only once the absolute
 * origin is known, and every option handed to it is frozen for the life of
 * the mount, not just correct in value on the first render:
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

let whopLoad
const load = () => (whopLoad ??= loadWhop())

export function WhopCheckout({ planId, returnPath, returnParams, className }) {
  const mounted = useMounted()
  const [ref] = useState(() => crypto.randomUUID())

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

  return (
    <div className={className}>
      <WhopElements
        elements={load()}
        environment={whopEnvironment()}
        appearance={appearance}
      >
        <Checkout plan={planId} returnUrl={returnUrl} metadata={metadata}>
          <CheckoutElement />
        </Checkout>
      </WhopElements>
    </div>
  )
}
