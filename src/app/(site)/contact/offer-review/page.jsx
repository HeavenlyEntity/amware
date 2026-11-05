import { withSocialImage } from '@/lib/social/metadata'
import OfferReviewForm from './OfferReviewForm'

/* Static landing for the Founders' Desk review CTA. A real route (not a query
   string) keeps /contact statically rendered and lets the nav highlight the
   desk. The read is computed in the browser from the answers kept there;
   nothing from the calculators travels in the URL. */

export const metadata = withSocialImage(
  {
    title: 'Offer review',
    description:
      'Send the read from the Founders’ Desk equity or job offer calculator and get a written second opinion from AMWARE.',
  },
  'contact-offer-review'
)

export default function OfferReviewPage() {
  return <OfferReviewForm />
}
