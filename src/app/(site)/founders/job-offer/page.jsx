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

export default function JobOfferCalculatorPage() {
  return (
    <>
      <h1 className="sr-only">Job offer calculator</h1>
      <JobOfferCalculator />
    </>
  )
}
