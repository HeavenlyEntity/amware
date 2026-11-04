import Link from 'next/link'

import { REFUND_NOTE, UPGRADE_HREF, UPGRADE_NOTE } from '@/content/site/warekit'

/* Utilities, not a stylesheet class: this renders on the board card, which
   loads products.css, and on the product page, which does not. 44px tall
   (min-h-11), underlined so it reads as a link beside the refund sentence,
   and the accent token that exists on each surface for hover. */
const LINK =
  'inline-flex min-h-11 items-center text-zinc-900 underline underline-offset-4 transition-colors hover:text-[var(--pj-accent-ink,var(--amw-accent-ink))] dark:text-zinc-100'

/* The two lines that sit beside a paid kit's buy button: the refund terms,
   and for Team the way in for someone who already holds Pro. `paid` is the
   caller's, because only the caller knows the checkout route; Lite, digital
   products and anything not on sale pass false and get nothing. */
export function KitBuyNotes({ paid, tier, className }) {
  if (!paid) return null
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
