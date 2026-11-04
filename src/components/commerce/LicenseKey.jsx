'use client'

import { useState } from 'react'
import { maskLicenseKey } from '@/lib/commerce/onboardingDisplay'

/* The license key line of the license page.
 *
 * The key arrives masked and stays masked until the buyer asks. Reveal and
 * Copy are real buttons with names, 44px tall, so they work by keyboard and
 * with a screen reader. Copy puts the whole `.env` line on the clipboard,
 * not the bare key: that is the thing onboarding's last step tells the buyer
 * to paste.
 *
 * A browser can refuse the clipboard (an insecure context, a denied
 * permission). That is said, rather than leaving a button that does nothing,
 * and Reveal is still there to select it by hand. */

const ENV_NAME = 'WAREKIT_LICENSE_KEY'

const buttonClass =
  'border-[var(--amw-line-strong)] bg-[var(--amw-card)] inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-4 text-sm font-medium text-zinc-800 transition-colors hover:border-[var(--amw-accent)] dark:text-zinc-200'

export function LicenseKey({ keyValue }) {
  const [revealed, setRevealed] = useState(false)
  const [copy, setCopy] = useState('idle')

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${ENV_NAME}=${keyValue}`)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
  }

  return (
    <div>
      <code className="amw-mono border-[var(--amw-line)] bg-[var(--amw-card-2)] block overflow-x-auto break-all rounded-md border px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200">
        {revealed ? keyValue : maskLicenseKey(keyValue) ?? '••••'}
      </code>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={buttonClass}
          aria-pressed={revealed}
          onClick={() => setRevealed((value) => !value)}
        >
          {revealed ? 'Hide' : 'Reveal'}
        </button>
        <button type="button" className={buttonClass} onClick={onCopy}>
          Copy
        </button>
        <p role="status" className="text-xs text-zinc-600 dark:text-zinc-400">
          {copy === 'copied'
            ? `Copied. Paste it into your .env as ${ENV_NAME}.`
            : copy === 'failed'
            ? 'Your browser would not copy it. Reveal the key and select it.'
            : ''}
        </p>
      </div>
    </div>
  )
}
