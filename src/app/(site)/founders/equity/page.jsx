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

/* The page's h1 is the tool's question, drawn visibly by the calculator's
   header in every state (the board), so there is no sr-only one here. */
export default function EquityCalculatorPage() {
  return <EquityCalculator />
}
