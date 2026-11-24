import { withSocialImage } from '@/lib/social/metadata'
import { TrackView } from '@/components/analytics/TrackView'
import { DeskMotionSync } from '@/components/founders/desk/motion-flag'
import { DiagnosticHero } from '@/components/diagnostic/diagnostic-hero'
import {
  ClosingBand,
  HowItStarts,
  NextSteps,
  PromiseFit,
  ReportPanel,
  ReviewGrid,
} from '@/components/diagnostic/diagnostic-sections'
import { calLinkFromUrl } from '@/lib/commerce/calLink'
import { INTRO_CALL_URL } from '@/lib/contact-intents'
import { DIAGNOSTIC } from '@/content/site/codebase-diagnostic'
import '@/styles/services.css'
import '@/styles/diagnostic.css'

export const revalidate = 3600

/* Kept out of search and out of the sitemap until the Diagnostic's terms
   are settled; nothing links here yet. */
export const metadata = withSocialImage(
  {
    title: DIAGNOSTIC.meta.title,
    description: DIAGNOSTIC.meta.description,
    alternates: { canonical: '/services/codebase-diagnostic' },
    robots: { index: false, follow: true },
  },
  'services'
)

/* /services/codebase-diagnostic (design: boards/Diagnostic.dc.html): what
   the Diagnostic is and how it starts. The only action is the free intro
   call; the page names no price and never opens a deposit checkout. It
   reads no Payload data, so it renders the same whether or not the CMS is
   up. */
export default async function CodebaseDiagnosticPage() {
  const booking = calLinkFromUrl(INTRO_CALL_URL)
  return (
    <div className="amw svc dg">
      <TrackView
        type="services"
        id="codebase-diagnostic"
        name="Codebase Diagnostic"
      />
      <DeskMotionSync />

      <DiagnosticHero booking={booking} />
      <HowItStarts />
      <ReviewGrid />
      <ReportPanel />
      <PromiseFit />
      <NextSteps />
      <ClosingBand booking={booking} />
    </div>
  )
}
