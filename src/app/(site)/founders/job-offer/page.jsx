import { withSocialImage } from '@/lib/social/metadata'
import JobOfferCalculator from './JobOfferCalculator'

export const metadata = withSocialImage(
  {
    title: 'Job offer calculator',
    description:
      'What to ask for, in cash and equity, and where to stop. Three rungs with the market data behind each one. No account. Nothing leaves your browser.',
  },
  'founders-job-offer'
)

/* The visible h1 is the tool's question, rendered by the calculator in every
   state (the skeleton included), so the page has exactly one. */
export default function JobOfferCalculatorPage() {
  return <JobOfferCalculator />
}
