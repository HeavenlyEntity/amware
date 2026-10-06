import { withSocialImage } from '@/lib/social/metadata'
import AboutContent from './AboutContent'

export const metadata = withSocialImage(
  {
    title: 'About',
    description:
      'Alec Mingione: fractional CTO and founder of AMWARE Technologies LLC. Honeywell automation, Charles Schwab, Senior Lead at NewGen, MBA from Woolf University.',
    alternates: { canonical: '/about' },
  },
  'about'
)

export default function AboutPage() {
  return <AboutContent />
}
