'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Check } from 'lucide-react'

import { useReducedMotion } from '@/components/AccessibilityProvider'
import { LiveAnnouncer } from '@/components/founders/live-announcer'
import { useReveal } from '@/components/founders/desk/use-reveal'
import { gapFor, positionFor } from '@/lib/founders/equity/position'

/*
 * 01 · The gap, as something to play with.
 *
 * One number, the offered percent, starts at the worked example and moves
 * with the slider and the three quick picks. Everything else reads off it:
 * the big figure, the status pill, the marker, the "pts short" bracket, the
 * band glow and the burst when it lands inside the band.
 *
 * The maths is `equity/position.js`, the same function the engine uses, so
 * the pill can never say something the calculator would not. The band itself
 * does not move with the offer (it depends on the work, not on what was
 * offered), so it arrives from the server as plain numbers and this island
 * never imports the engine.
 *
 * Throwaway on purpose: nothing here is written to the offer store or the
 * URL, so the landing stays store-free and has no hydration gate.
 *
 * Deliberately separate from `GapFigure`, which the results screen shares and
 * has its own tests.
 */

const BURST = [46, 34, 46, 30, 46, 36, 46, 32, 46, 38]

const num = (n) => String(Math.round(n * 100) / 100)

export function statusFor(offer, range, classLabel) {
  const position = positionFor(offer, range, false)
  const gap = gapFor(offer, range)
  if (position === 'below') {
    return {
      position,
      tone: 'below',
      text: `${num(gap.below[0])}–${num(
        gap.below[1]
      )} points below the band for this work`,
    }
  }
  if (position === 'above') {
    return {
      position,
      tone: 'above',
      text: `${num(gap.above)} points above the band: the equity holds up`,
    }
  }
  return {
    position,
    tone: 'hit',
    text: `Inside the ${classLabel} band for this work`,
  }
}

const ICONS = { below: ArrowDown, above: ArrowUp, hit: Check }

export function GapExplorer({ example }) {
  const { range, classLabel, track } = example
  const { lo, hi, mid } = range
  const reduced = useReducedMotion()
  const { ref, attrs } = useReveal()
  const [offer, setOffer] = useState(example.offer)
  const [touched, setTouched] = useState(false)
  const [bursts, setBursts] = useState(0)

  const status = statusFor(offer, range, classLabel)
  const Icon = ICONS[status.tone]
  const at = (value) =>
    `${Math.min(100, Math.max(0, (value / track.max) * 100))}%`
  const below = status.position === 'below'

  const update = (value) => {
    const next = Math.min(track.max, Math.max(track.min, value))
    const was = positionFor(offer, range, false)
    const now = positionFor(next, range, false)
    if (now === 'within' && was !== 'within') setBursts((n) => n + 1)
    setOffer(next)
    setTouched(true)
  }

  const presets = [
    { value: example.offer, label: `${num(example.offer)}% · the example` },
    { value: lo, label: `${num(lo)}% · band floor` },
    { value: mid, label: `${num(mid)}% · mid-band` },
  ]

  const bracketCentre = (offer / track.max + lo / track.max) * 50

  return (
    <div ref={ref} {...attrs} className="amw-dk-gap" style={{ '--d': '.15s' }}>
      <div className="amw-dk-gap-top">
        <div>
          <p className="amw-dk-num">01 · The gap</p>
          <p className="amw-dk-gap-figure">
            <span className="amw-dk-big">{num(offer)}%</span>
            <span className="amw-dk-gap-offered">offered</span>
          </p>
        </div>
        <div>
          {/* Keyed on the value once the reader has moved it, so each change
              replays the pop; at rest it never animates. */}
          <span
            key={touched ? offer : 'rest'}
            className={`amw-dk-status amw-dk-status-${status.tone} ${
              touched ? 'amw-dk-pop' : ''
            }`}
          >
            <Icon
              className="amw-dk-status-icon"
              strokeWidth={status.tone === 'hit' ? 2.5 : 2}
              aria-hidden="true"
            />
            <span>{status.text}</span>
          </span>
        </div>
      </div>

      {/* Silent until the first interaction, debounced, so the page never
          announces a verdict on load or chatters on every slider step. */}
      <LiveAnnouncer message={status.text} armed={touched} />

      <div
        className="amw-dk-track"
        role="img"
        aria-label={`Benchmark band ${num(lo)} to ${num(
          hi
        )} percent; offered ${num(offer)} percent.`}
      >
        <div className="amw-dk-track-inner">
          <span className="amw-dk-axis" />
          <span
            className="amw-dk-band"
            data-hit={status.position === 'within' ? 'true' : undefined}
            style={{ left: at(lo), width: at(hi - lo) }}
          />
          <span className="amw-kicker amw-dk-edge" style={{ left: at(lo) }}>
            {num(lo)}%
          </span>
          <span className="amw-kicker amw-dk-edge" style={{ left: at(hi) }}>
            {num(hi)}%
          </span>
          {below ? (
            <>
              <span
                className="amw-dk-bracket"
                style={{ left: at(offer), width: at(lo - offer) }}
              />
              <span
                className="amw-dk-bracket-label"
                style={{
                  left: `clamp(3.25rem, ${bracketCentre}%, calc(100% - 3.25rem))`,
                }}
              >
                {num(lo - offer)} pts short
              </span>
            </>
          ) : null}
          {status.position === 'within' && bursts > 0 && !reduced ? (
            <span
              key={bursts}
              className="amw-dk-burst"
              data-print="hide"
              style={{ left: at(offer) }}
            >
              {BURST.map((r, index) => (
                <i
                  key={index}
                  style={{ '--a': `${index * 36}deg`, '--r': `${r}px` }}
                />
              ))}
            </span>
          ) : null}
          <span className="amw-dk-marker" style={{ left: at(offer) }}>
            <span className="amw-dk-marker-stem" />
            <span className="amw-dk-marker-knob" />
          </span>
        </div>
      </div>
      <div className="amw-dk-ticks" aria-hidden="true">
        {track.ticks.map((tick) => (
          <span key={tick.value} className="amw-kicker">
            {tick.label}
          </span>
        ))}
      </div>

      <div className="amw-dk-controls" data-print="hide">
        <label htmlFor="desk-offer" className="amw-dk-range-label">
          <span>Drag to try a different offer</span>
          <span className="amw-kicker">
            {classLabel} band {num(lo)}–{num(hi)}%
          </span>
        </label>
        <input
          id="desk-offer"
          type="range"
          className="amw-dk-range"
          min={track.min}
          max={track.max}
          step={track.step}
          value={offer}
          aria-valuetext={`${num(offer)} percent offered`}
          style={{ '--p': at(offer) }}
          onChange={(event) => update(Number(event.target.value))}
        />
        <div className="amw-dk-presets" role="group" aria-label="Quick picks">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="amw-dk-preset"
              aria-pressed={offer === preset.value}
              onClick={() => update(preset.value)}
            >
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
