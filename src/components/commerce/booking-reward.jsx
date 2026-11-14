'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Download, X } from 'lucide-react'

import {
  BOOKED_EVENT,
  CHECKLIST,
  EBOOK,
  giftsFor,
  trackOfNamespace,
} from '@/lib/booking-gifts'
import ebookCover from '@/images/ebooks/visitors-into-buyers-cover.jpg'
import checklistCover from '@/images/services/ai-search-checklist-cover.jpg'
import '@/styles/booking-reward.css'

const COVER = { [EBOOK.id]: ebookCover, [CHECKLIST.id]: checklistCover }

/*
 * The reward for booking a free intro call, shown the moment Cal.com
 * confirms it (BookCallButton raises BOOKED_EVENT): the ebook, plus the AI
 * search checklist for the Build & support call, as direct downloads. The
 * booking webhook also mails the links on a lead's first intro call, for
 * anyone who booked on cal.com itself or closed the tab.
 *
 * Mounted once in the site layout. The Cal.com modal sits above it while
 * its own success screen shows, so the panel is waiting when the visitor
 * closes it. A status line announces it; focus is left alone, since the
 * modal may still hold it. Escape or the close button dismisses it.
 */
export function BookingReward() {
  const [gifts, setGifts] = useState(null)

  useEffect(() => {
    const onBooked = (event) => {
      const track = trackOfNamespace(event?.detail?.namespace)
      if (track) setGifts(giftsFor(track))
    }
    window.addEventListener(BOOKED_EVENT, onBooked)
    return () => window.removeEventListener(BOOKED_EVENT, onBooked)
  }, [])

  useEffect(() => {
    if (!gifts) return
    const onKey = (event) => {
      if (event.key === 'Escape') setGifts(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gifts])

  return (
    <>
      {/* A short line for screen readers; the panel itself is not a live
          region, since large inserted blocks are read unreliably. */}
      <p role="status" className="sr-only">
        {gifts
          ? `You're booked. ${
              gifts.length > 1
                ? 'Your free downloads are'
                : 'Your free ebook is'
            } ready to download.`
          : ''}
      </p>
      {gifts && (
        <section className="amw-reward" aria-labelledby="amw-reward-title">
          <button
            type="button"
            className="amw-reward-close"
            aria-label="Close the downloads"
            onClick={() => setGifts(null)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="amw-reward-kick">You’re booked</p>
          <h2 id="amw-reward-title" className="amw-reward-title">
            {gifts.length > 1 ? 'Your free downloads' : 'Your free ebook'}
          </h2>
          <p className="amw-reward-note">Yours to keep.</p>
          <ul className="amw-reward-list" role="list">
            {gifts.map((gift) => (
              <li key={gift.id} className="amw-reward-item">
                <Image
                  src={COVER[gift.id]}
                  alt=""
                  sizes="44px"
                  className="amw-reward-cover"
                />
                <div className="amw-reward-meta">
                  <span className="amw-reward-kind">{gift.kind}</span>
                  <span className="amw-reward-name">{gift.title}</span>
                </div>
                <a
                  href={gift.path}
                  download
                  className="amw-reward-dl"
                  aria-label={`Download ${gift.title} (PDF)`}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>PDF</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
