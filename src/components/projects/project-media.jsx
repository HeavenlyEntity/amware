import Image from 'next/image'

import { Pattern } from '@/components/ui/pattern'

import logoCosmos from '@/images/logos/cosmos.svg'
import logoPortalGen from '@/images/logos/PortalGen Fav-1.png'
import logoOpenShuttle from '@/images/logos/open-shuttle.svg'
import logoPlanetaria from '@/images/logos/planetaria.svg'
import logoChamoji from '@/images/logos/chamoji-mark.png'
import logoWindstone from '@/images/logos/Windstone icon-1.png'
import authjsLogo from '@/images/logos/authjs.png'
import logoConventionSuite from '@/images/logos/ConventionSuite.png'
import logoExhibitHouse from '@/images/logos/exhibithouse-logo.svg'
import logoCelestial from '@/images/logos/dark-celestial-square.svg'
import logoGearz from '@/images/logos/gearz-mark.svg'
import KingdomKodeMark from '@/components/brand/kingdom-kode-mark'
import EdenKodeMark from '@/components/brand/edenkode-mark'
import FuriousFrothMark from '@/components/brand/furious-froth-mark'
import MipiMark from '@/components/brand/mipi-mark'
import mockupMipi from '@/images/photos/MiPi-mockup.webp'
import coverWindstone from '@/images/projects/windstone-cover.png'
import coverAuthjs from '@/images/projects/authjs-cover.png'
import coverNeatsuite from '@/images/projects/neatsuite-cover.png'
import coverPortalGen from '@/images/projects/portalgen-cover.png'
import coverConventionSuite from '@/images/projects/conventionsuite-cover-v4.png'
// TODO(alec): replace with a real screenshot; this cover is a drawn placeholder.
import coverExhibitHouse from '@/images/projects/exhibithouse-cover.svg'
import coverKingdomKode from '@/images/projects/kingdomkode-cover.png'
import coverFuriousFroth from '@/images/projects/furiousfroth-cover.png'
import coverChamoji from '@/images/projects/chamoji-cover.webp'
import coverVrsa from '@/images/projects/vrsa-cover.png'
import coverVbRemoteSat from '@/images/projects/vbremotesat-cover.png'
import coverCelestial from '@/images/projects/celestial-cover.png'
import coverGearz from '@/images/projects/gearz-mockup.webp'
import coverEdenKode from '@/images/projects/edenkode-cover.webp'

/* Covers and logos per project key. The theme-aware brand marks render
   with currentColor, so they take the tile's text colour; every other logo
   stays an image. A project added in the admin under a key not listed here
   gets its initial on the tile and the hatch pattern as its cover. */
export const PROJECT_MEDIA = {
  gearz: { logo: logoGearz, cover: coverGearz },
  edenkode: { mark: EdenKodeMark, cover: coverEdenKode },
  celestial: { logo: logoCelestial, cover: coverCelestial },
  kingdomkode: { mark: KingdomKodeMark, cover: coverKingdomKode },
  conventionsuite: { logo: logoConventionSuite, cover: coverConventionSuite },
  exhibithouse: { logo: logoExhibitHouse, cover: coverExhibitHouse },
  mipi: { mark: MipiMark, cover: mockupMipi },
  portalgen: { logo: logoPortalGen, cover: coverPortalGen },
  neatsuite: { logo: logoCosmos, cover: coverNeatsuite },
  authjs: { logo: authjsLogo, cover: coverAuthjs },
  chamoji: { logo: logoChamoji, cover: coverChamoji },
  windstone: { logo: logoWindstone, cover: coverWindstone },
  furiousfroth: { mark: FuriousFrothMark, cover: coverFuriousFroth },
  vrsa: { logo: logoPlanetaria, cover: coverVrsa },
  vbremotesat: { logo: logoOpenShuttle, cover: coverVbRemoteSat },
}

export function ProjectMark({ project }) {
  const media = PROJECT_MEDIA[project.key]
  if (!media) {
    return (
      <span className="pj-mark pj-initial">
        {(Array.from(project.name.trim())[0] ?? '').toUpperCase()}
      </span>
    )
  }
  if (media.mark) {
    const Mark = media.mark
    return <Mark className="pj-mark" />
  }
  return <Image src={media.logo} alt="" className="pj-mark" unoptimized />
}

/* The logo tile; size is '', 'sm' or 'lg'. */
export function ProjectLogo({ project, size = '' }) {
  return (
    <span
      className={size ? `pj-logo pj-logo--${size}` : 'pj-logo'}
      aria-hidden="true"
    >
      <ProjectMark project={project} />
    </span>
  )
}

export function ProjectCover({ project, sizes, alt = '', priority = false }) {
  const media = PROJECT_MEDIA[project.key]
  if (!media) {
    return (
      <div
        className="pj-cover-fallback"
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
      >
        <Pattern className="absolute inset-0" />
      </div>
    )
  }
  return (
    <Image
      src={media.cover}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover"
    />
  )
}
