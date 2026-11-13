import { Pattern } from '@/components/ui/pattern'
import { SERVICES_PAGE, retainerMeta } from '@/content/site/services-page'
import { AsciiField } from './ascii-field'
import { SectionHeader } from './section-header'
import { ServiceTracks } from './service-tracks'

/*
 * Engagements (design: Main.dc.html S1): "Two ways in.", the track tabs and
 * the two panels, with the ASCII light behind the cards at the top right
 * (desktop only).
 *
 * The page hands over the panels' contents (the Payload cards, the website
 * package); this owns the frame. The Consulting cards sit in the board's
 * hatched panel; the Build & support panel brings its own (WebsitePackage),
 * after any technical services there are.
 *
 * Props: { consulting, technical, retainerCount } where the first two are
 * nodes and `retainerCount` is the number of consulting retainers (the
 * cards, not the custom asks), for the "3 retainers · scoped on a call"
 * meta.
 */

export function ConsultingPanel({ children }) {
  return (
    <div className="svc-panel svc-panel--cards">
      <div aria-hidden="true" className="svc-panel-hatch">
        <Pattern />
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}

export function Engagements({ consulting, technical, retainerCount }) {
  const { index, eyebrow, title, copy } = SERVICES_PAGE.engagements
  return (
    <section
      id="engagements"
      aria-labelledby="engagements-title"
      className="svc-wrap svc-engagements"
    >
      <AsciiField variant="accent" className="svc-eng-accent" />
      <SectionHeader
        id="engagements-title"
        index={index}
        eyebrow={eyebrow}
        meta={retainerMeta(retainerCount)}
        title={title}
        copy={copy}
      />
      <ServiceTracks
        variant="solid"
        panels={{
          consulting: <ConsultingPanel>{consulting}</ConsultingPanel>,
          technical,
        }}
      />
    </section>
  )
}
