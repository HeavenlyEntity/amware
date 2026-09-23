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
 * origin is known, and the reference never changes for this mount.
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
    // returnParams is read once: options cannot change after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, returnPath, ref])

  const dark = useMemo(
    () => mounted && document.documentElement.classList.contains('dark'),
    [mounted]
  )

  if (!planId || !returnUrl) return null

  return (
    <div className={className}>
      <WhopElements
        elements={load()}
        environment={whopEnvironment()}
        appearance={{
          theme: { appearance: dark ? 'dark' : 'light', accentColor: 'teal' },
        }}
      >
        <Checkout
          plan={planId}
          returnUrl={returnUrl}
          metadata={{ checkout_ref: ref }}
        >
          <CheckoutElement />
        </Checkout>
      </WhopElements>
    </div>
  )
}
