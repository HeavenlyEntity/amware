'use client'

import { Check, Copy, PenLine } from 'lucide-react'

import '@/styles/founders-offer.css'
import { trackCta, trackPrinted } from '@/components/founders/analytics'
import { announceDesk } from '@/components/founders/desk-toast'
import { useClipboard } from '@/components/founders/use-clipboard'
import {
  BackButton,
  MonoLink,
  TextButton,
} from '@/components/founders/wizard/buttons'
import { askForClipboard } from '@/lib/founders/handoff'
import { useOfferStore } from '@/lib/founders/offer-store'
import { GEO_OPTIONS, INDUSTRY_OPTIONS } from '@/lib/founders/offer-steps'
import { REVIEW_HREF } from '@/lib/founders/tools'

/*
 * What the reader does next.
 *
 * THE HARD REJECTION THIS ANSWERS (design pass 3). Everything above this is
 * evidence: a headline at display scale, three rungs, a trade, a floor note.
 * Without a way to act on it the page ends as a report about someone's own
 * offer, which they then have to translate into their own words while anxious.
 * "Copy the ask" is the primary action for that reason, and it is the only
 * accent-filled control on the results screen.
 *
 * IT COPIES SENTENCES, NOT A TABLE. See `askForClipboard`. Numbers alone are a
 * demand; the reasons and their sources are what make it an ask. A copy says
 * so twice: the button's own `aria-live` label, and the desk's toast. A
 * blocked clipboard reveals the text, focused and selected, instead.
 *
 * PRINT IS THE LONG FORM. The plot's collapsed rows print open, so the
 * printed sheet carries the ladder, the whole company list and the citations.
 * Copy is for a reply, print is for a meeting.
 *
 * REVIEW. "Review my offer" records the ask (`markAsked`, from this tool) so
 * the review form opens prefilled from this store, on this device only. A
 * quiet link, not a second teal button: two primaries side by side is a menu.
 */

export function AskActions({ ask, onEdit, onClear }) {
  const { state, areaRef, copy } = useClipboard()

  const text = askForClipboard(ask, {
    industryOptions: INDUSTRY_OPTIONS,
    geoOptions: GEO_OPTIONS,
  })

  const copied = state === 'copied'

  return (
    <div className="mt-8" data-print="hide">
      <div className="amw-jo-actions">
        {text && (
          <button
            type="button"
            onClick={async () => {
              if (await copy(text)) announceDesk('Your ask is on the clipboard')
            }}
            className="amw-jo-copy"
            data-done={copied ? 'true' : undefined}
          >
            {/* aria-live on the label, so a screen reader hears the
                confirmation instead of only seeing it. */}
            <span aria-live="polite">{copied ? 'Copied' : 'Copy the ask'}</span>
            {copied ? (
              <Check
                aria-hidden="true"
                className="size-[18px]"
                strokeWidth={2.75}
              />
            ) : (
              <Copy aria-hidden="true" className="size-[18px]" />
            )}
          </button>
        )}

        <BackButton
          onClick={onEdit}
          icon={<PenLine className="size-4" aria-hidden="true" />}
        >
          Edit answers
        </BackButton>

        <TextButton
          onClick={() => {
            trackPrinted()
            window.print()
          }}
        >
          Print
        </TextButton>

        <TextButton onClick={onClear}>Clear my answers</TextButton>
      </div>

      {state === 'fallback' && (
        <div className="mt-4">
          <label htmlFor="ask-fallback" className="amw-wz-hint mt-0 block">
            Your browser blocked the clipboard. Select all and copy:
          </label>
          <textarea
            id="ask-fallback"
            ref={areaRef}
            readOnly
            value={text}
            rows={10}
            className="amw-jo-fallback"
          />
        </div>
      )}

      <div className="mt-6">
        <MonoLink
          href={REVIEW_HREF}
          onClick={() => {
            useOfferStore.getState().markAsked({ from: 'job-offer' })
            trackCta()
          }}
        >
          Review my offer →
        </MonoLink>
        <p className="amw-wz-hint">
          Your ask is carried into the form on this device only; nothing goes
          into the link or leaves your browser.
        </p>
      </div>
    </div>
  )
}
