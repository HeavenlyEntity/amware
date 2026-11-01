import Link from 'next/link'

import { REFUND_NOTE, UPGRADE_HREF, UPGRADE_NOTE } from '@/content/site/warekit'

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
          <Link href={UPGRADE_HREF}>{UPGRADE_NOTE}</Link>
        </p>
      )}
    </div>
  )
}
