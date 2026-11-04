import Link from 'next/link'
import { IconArrowUp, IconRefresh } from '@tabler/icons-react'

import { REFUND_NOTE, UPGRADE_HREF, UPGRADE_NOTE } from '@/content/site/warekit'

/* Utilities, not a stylesheet class: this renders on the board card, which
   loads products.css, and on the product page, which does not. 44px tall
   (min-h-11), underlined so it reads as a link beside the refund sentence,
   and the accent token that exists on each surface for hover. */
const LINK =
  'inline-flex min-h-11 items-center text-zinc-900 underline underline-offset-4 transition-colors hover:text-[var(--pj-accent-ink,var(--amw-accent-ink))] dark:text-zinc-100'

const ICON = {
  size: 16,
  stroke: 1.5,
  'aria-hidden': true,
  className: 'mt-0.5 shrink-0 text-[var(--amw-accent-ink)]',
}

/* The two lines that sit beside a paid kit's buy button: the refund terms,
   and for Team the way in for someone who already holds Pro. `paid` is the
   caller's, because only the caller knows the checkout route; Lite, digital
   products and anything not on sale pass false and get nothing.

   `withIcons` is the product page's version: each line led by a Tabler mark,
   as the redesign's buy rail draws them. The board card keeps plain lines. */
export function KitBuyNotes({ paid, tier, className, withIcons = false }) {
  if (!paid) return null
  if (withIcons) {
    return (
      <ul className={className}>
        <li className="flex items-start gap-2.5">
          <IconRefresh {...ICON} />
          <span>{REFUND_NOTE}</span>
        </li>
        {tier === 'team' && (
          <li className="flex items-start gap-2.5">
            <IconArrowUp {...ICON} className={`${ICON.className} mt-3.5`} />
            <Link href={UPGRADE_HREF} className={LINK}>
              {UPGRADE_NOTE}
            </Link>
          </li>
        )}
      </ul>
    )
  }
  return (
    <div className={className}>
      <p>{REFUND_NOTE}</p>
      {tier === 'team' && (
        <p>
          <Link href={UPGRADE_HREF} className={LINK}>
            {UPGRADE_NOTE}
          </Link>
        </p>
      )}
    </div>
  )
}
