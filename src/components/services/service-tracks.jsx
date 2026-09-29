'use client'

import { useId, useSyncExternalStore } from 'react'
import { OfferTabs, offerPanelProps } from '@/components/landing/offer-tabs'
import { SERVICE_TRACKS, trackFromHash } from '@/lib/services/tracks'

/* /services splits into two tracks, using the homepage's accessible
   "Two Ways In" tabs. Unlike the homepage, both panels stay in the HTML and
   only the inactive one is hidden, so the Build & support content is
   still there for search engines.

   The selected tab is the URL hash, read as an external store: a link to
   #build-support opens that tab, and clicking a tab rewrites the hash with
   replaceState (no history entry, no scroll jump) and tells the store. */

const TRACK_EVENT = 'amw:service-track'

function subscribe(onChange) {
  window.addEventListener('hashchange', onChange)
  window.addEventListener(TRACK_EVENT, onChange)
  return () => {
    window.removeEventListener('hashchange', onChange)
    window.removeEventListener(TRACK_EVENT, onChange)
  }
}

const readHash = () => window.location.hash
const serverHash = () => ''

export function ServiceTracks({ panels }) {
  const id = useId()
  const hash = useSyncExternalStore(subscribe, readHash, serverHash)
  const tab = trackFromHash(hash) ?? SERVICE_TRACKS[0].id

  const choose = (next) => {
    const track = SERVICE_TRACKS.find((t) => t.id === next)
    window.history.replaceState(null, '', `#${track.hash}`)
    window.dispatchEvent(new Event(TRACK_EVENT))
  }

  return (
    <div className="mt-10 sm:mt-12">
      <div className="text-center">
        <OfferTabs
          id={id}
          tabs={SERVICE_TRACKS}
          value={tab}
          onChange={choose}
          label="Choose a track"
        />
      </div>
      {SERVICE_TRACKS.map((track) => (
        <div
          key={track.id}
          {...offerPanelProps(id, track.id)}
          hidden={tab !== track.id}
          className="mt-10 sm:mt-12"
        >
          {panels[track.id]}
        </div>
      ))}
    </div>
  )
}
