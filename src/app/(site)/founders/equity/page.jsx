import { withSocialImage } from '@/lib/social/metadata'
import EquityCalculator from './EquityCalculator'

export const metadata = withSocialImage(
  {
    title: 'Founder equity calculator',
    description:
      'Are you being sized as a hire while doing founder work? Get the fully diluted range to say out loud, your stake through the rounds, and a printable negotiation brief. No account. Nothing leaves your browser.',
  },
  'founders-equity'
)

export default function EquityCalculatorPage() {
  return (
    <>
      <h1 className="sr-only">Founder equity calculator</h1>
      <EquityCalculator />
    </>
  )
}
