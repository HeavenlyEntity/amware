'use client'

import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'

import Dither from '@/components/react-bits/dither'
import TerminalRain from '@/components/react-bits/terminal-rain'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { TRACK_DITHER } from '@/components/dither-presets'
import { TRACKS } from '@/content/site/courses'

const RAIN = {
  colors: ['#0f9f8f', '#d9fff8'],
  backgroundColor: '#0b0b0f',
  mode: 'glow',
  glyphs: '01ABCDEF{}[]<>/#$%&*=+;:',
  glyphSize: 13,
  spacing: 1.05,
  density: 0.38,
  trail: 14,
  speed: 0.75,
  variance: 0.55,
  shuffle: 0.3,
  depth: 0.6,
  glow: 0.3,
  intensity: 0.95,
  quality: 0.85,
  interactive: true,
  bulletTime: true,
  slowRadius: 140,
  slowStrength: 0.55,
  /* Clicking the card selects the track, so no click bursts. */
  clickBurst: false,
  burstSize: 0.8,
}
const BURST_DELAY = 260
const SLEEP_DELAY = 1400

function Tick({ className = 'h-3 w-3', strokeWidth = 3.5 }) {
  return (
    <Check className={className} strokeWidth={strokeWidth} aria-hidden="true" />
  )
}

/* Two selectable track cards (each a button with aria-pressed). Each has an animated background that shows
   only while it is the selected track: Terminal Rain behind Security-First
   Engineer, the Dither behind Secure Builder Accelerator. Both mount once
   and stay mounted (unmounting churns WebGL contexts); the inactive one is
   paused or frozen 1.4s after it fades out, so only one animates. The
   parent passes the run state from `useTrackEffects`. */
export function TrackCards({ track, quizPick, effects, onPick }) {
  const devCardRef = useRef(null)

  return (
    <div className="co-tracks" role="group" aria-label="Choose a track">
      {Object.entries(TRACKS).map(([key, t]) => {
        const on = track === key
        return (
          /* The effects sit in the card, under its button: canvases are not
             allowed inside a <button>. Pointer events reach the rain from
             the card itself. */
          <div
            key={key}
            ref={key === 'dev' ? devCardRef : undefined}
            className="co-track pj-dark"
            data-on={on}
          >
            {key === 'dev' ? (
              <div className="co-fx" data-on={on} aria-hidden="true">
                <TerminalRain
                  ref={effects.rainRef}
                  {...RAIN}
                  paused={effects.rainPaused}
                  eventTarget={devCardRef}
                  className="absolute inset-0 min-h-0"
                />
                <span className="co-veil" />
              </div>
            ) : (
              <div
                className="co-fx co-fx--dither"
                data-on={on}
                aria-hidden="true"
              >
                <Dither
                  {...TRACK_DITHER}
                  className="absolute inset-0"
                  disableAnimation={effects.ditherFrozen}
                />
                <span className="co-veil" />
              </div>
            )}
            <button
              type="button"
              className="co-track-body"
              aria-pressed={on}
              onClick={() => onPick(key)}
            >
              <span className="co-track-head">
                <span>
                  <span className="pj-kicker block">
                    {t.kicker}
                    {quizPick === key && (
                      <span className="co-qpick">Your quiz pick</span>
                    )}
                  </span>
                  <span className="co-track-name">{t.name}</span>
                </span>
                <span className="co-radio" aria-hidden="true">
                  <Tick />
                </span>
              </span>
              {/* Spans, not a list: a button may only hold phrasing content. */}
              <span className="co-track-items">
                {t.items.map((item) => (
                  <span key={item}>
                    <Tick className="h-4 w-4" strokeWidth={2.5} />
                    {item}
                  </span>
                ))}
              </span>
              <span className="co-track-foot">
                <span className="co-price">{t.price}</span>
                <span className="co-price-sub">{t.priceSub}</span>
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

/* Run state for the two effects, changed from the selection handler (not
   an effect) so a pick un-pauses at once and the outgoing effect sleeps
   after its fade. Reduced motion keeps both still. */
export function useTrackEffects(initialTrack) {
  const reduced = useReducedMotion()
  const rainRef = useRef(null)
  const timers = useRef({})
  const [run, setRun] = useState({
    rainPaused: initialTrack !== 'dev',
    ditherFrozen: initialTrack !== 'change',
  })
  useEffect(() => {
    const t = timers.current
    return () => Object.values(t).forEach(clearTimeout)
  }, [])

  const select = (from, to) => {
    const t = timers.current
    Object.values(t).forEach(clearTimeout)
    if (to === 'dev') {
      setRun((r) => ({ ...r, rainPaused: false }))
      if (from !== 'dev' && !reduced)
        t.burst = setTimeout(
          () => rainRef.current?.burst(0.5, 0.08),
          BURST_DELAY
        )
      t.sleep = setTimeout(
        () => setRun((r) => ({ ...r, ditherFrozen: true })),
        SLEEP_DELAY
      )
    } else {
      setRun((r) => ({ ...r, ditherFrozen: false }))
      t.sleep = setTimeout(
        () => setRun((r) => ({ ...r, rainPaused: true })),
        SLEEP_DELAY
      )
    }
  }

  return {
    rainRef,
    select,
    rainPaused: reduced || run.rainPaused,
    ditherFrozen: reduced || run.ditherFrozen,
  }
}
