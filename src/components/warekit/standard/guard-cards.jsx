'use client'

/* eslint-disable @next/next/no-img-element -- the drawings are animated SVGs
   served as they are; the image optimiser would add nothing. */

import { useState } from 'react'

import { useReducedMotion } from '@/components/AccessibilityProvider'
import { PRESALE } from '@/content/site/standard-presale'

/* Each guard's two drawings, from the board's illos: the finished drawing at
   rest, and a copy that plays its animation once. The paths are written out
   in full, never assembled from the `art` id, so every file the page can ask
   for can be found by searching for it. The playing drawing is only put in
   the page while it plays, so nothing loads it ahead of a hover. Keys make a
   swap a new element, so a second hover starts the drawing from the top. */
const IMG = { width: 720, height: 460, className: 'st-guard-img' }

const DRAWINGS = {
  'api-gateway': (playing) =>
    playing ? (
      <img
        key="play"
        {...IMG}
        alt=""
        src="/images/warekit/standard/guards/api-gateway-play.svg"
      />
    ) : (
      <img
        key="rest"
        {...IMG}
        alt=""
        loading="lazy"
        src="/images/warekit/standard/guards/api-gateway.svg"
      />
    ),
  firewall: (playing) =>
    playing ? (
      <img
        key="play"
        {...IMG}
        alt=""
        src="/images/warekit/standard/guards/firewall-play.svg"
      />
    ) : (
      <img
        key="rest"
        {...IMG}
        alt=""
        loading="lazy"
        src="/images/warekit/standard/guards/firewall.svg"
      />
    ),
  billing: (playing) =>
    playing ? (
      <img
        key="play"
        {...IMG}
        alt=""
        src="/images/warekit/standard/guards/billing-play.svg"
      />
    ) : (
      <img
        key="rest"
        {...IMG}
        alt=""
        loading="lazy"
        src="/images/warekit/standard/guards/billing.svg"
      />
    ),
  encryption: (playing) =>
    playing ? (
      <img
        key="play"
        {...IMG}
        alt=""
        src="/images/warekit/standard/guards/encryption-play.svg"
      />
    ) : (
      <img
        key="rest"
        {...IMG}
        alt=""
        loading="lazy"
        src="/images/warekit/standard/guards/encryption.svg"
      />
    ),
  'ci-pipeline': (playing) =>
    playing ? (
      <img
        key="play"
        {...IMG}
        alt=""
        src="/images/warekit/standard/guards/ci-pipeline-play.svg"
      />
    ) : (
      <img
        key="rest"
        {...IMG}
        alt=""
        loading="lazy"
        src="/images/warekit/standard/guards/ci-pipeline.svg"
      />
    ),
  'version-control': (playing) =>
    playing ? (
      <img
        key="play"
        {...IMG}
        alt=""
        src="/images/warekit/standard/guards/version-control-play.svg"
      />
    ) : (
      <img
        key="rest"
        {...IMG}
        alt=""
        loading="lazy"
        src="/images/warekit/standard/guards/version-control.svg"
      />
    ),
}

/* Only a mouse or a pen hovers. A finger sends pointer events too, and a tap
   must not start a drawing it would then leave running. */
const isFine = (event) =>
  event.pointerType === 'mouse' || event.pointerType === 'pen'

/* The six guards. A card plays its drawing while a fine pointer is over it.
   The cards hold nothing to focus or press: the resting drawing is the
   finished picture, so keyboard and touch readers miss nothing, and the
   drawings are decorative (`alt=""`) beside the title and copy.

   useReducedMotion says "reduced" on the server and on the first client
   render, then settles on the reader's setting. The playing state is worked
   out on every render from both, so a card never plays under reduced motion,
   and turning motion off mid-hover rests the card. */
export function GuardCards() {
  const reduced = useReducedMotion()
  const [hovered, setHovered] = useState(null)

  return (
    <ul className="st-guards">
      {PRESALE.guards.items.map(({ id, art, title, copy }, i) => (
        <li
          key={id}
          className="ed-card st-guard"
          onPointerEnter={(event) => {
            if (isFine(event)) setHovered(art)
          }}
          onPointerLeave={() =>
            setHovered((current) => (current === art ? null : current))
          }
        >
          <div className="st-guard-art">
            {DRAWINGS[art](!reduced && hovered === art)}
          </div>
          <span className="st-guard-num" aria-hidden="true">
            {String(i + 1).padStart(2, '0')}
          </span>
          <h3 className="st-guard-title">{title}</h3>
          <p className="st-guard-copy">{copy}</p>
        </li>
      ))}
    </ul>
  )
}
