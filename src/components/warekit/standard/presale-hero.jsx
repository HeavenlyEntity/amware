'use client'

import Dither from '@/components/react-bits/dither'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { HERO_DITHER } from '@/components/dither-presets'
import { PRESALE } from '@/content/site/standard-presale'
import { StackPicker } from './stack-picker'

/* The presale hero, from the approved board (Presale.dc.html): the promise,
   the command the visitor's picks produce, and the stack picker beside it.
   While the presale is open the primary action goes to the founding section
   and the first chip says so; while it is closed the hero claims no presale
   and sends the visitor to the waitlist. Both targets are sections further
   down the page. */
export function PresaleHero({ open, data, pay, onPick }) {
  const reduced = useReducedMotion()
  const { hero } = PRESALE
  const chips = open ? hero.chipsOpen : hero.chipsClosed
  const command = hero.command.replace('{data}', data).replace('{pay}', pay)

  return (
    <section aria-labelledby="st-title" className="pj-wrap">
      <div className="pj-hero pj-dark">
        <div className="pj-dither" aria-hidden="true">
          <Dither
            {...HERO_DITHER}
            className="absolute inset-0"
            enableMouseInteraction={!reduced}
            intro={!reduced}
            disableAnimation={reduced}
          />
        </div>
        <div className="pj-veil" aria-hidden="true" />
        <div className="pr-hero-grid st-hero-grid">
          <div className="st-hero-copy">
            <p className="pj-eyebrow pj-rise" style={{ '--d': '.05s' }}>
              {hero.eyebrow}
            </p>
            <ul className="st-chips pj-rise" style={{ '--d': '.1s' }}>
              {chips.map((chip, i) => (
                <li
                  key={chip}
                  className="st-chip"
                  data-accent={open && i === 0 ? '' : undefined}
                >
                  {open && i === 0 && <i aria-hidden="true" />}
                  {chip}
                </li>
              ))}
            </ul>
            <h1
              id="st-title"
              className="pr-title st-hero-title pj-rise"
              style={{ '--d': '.15s' }}
            >
              {hero.title}
            </h1>
            <p
              className="pj-intro st-hero-lede pj-rise"
              style={{ '--d': '.2s' }}
            >
              {hero.lede}
            </p>
            <div className="st-term pj-rise" style={{ '--d': '.25s' }}>
              <p className="st-term-line">
                <span className="st-term-sign" aria-hidden="true">
                  $
                </span>
                <code>{command}</code>
              </p>
              <p className="st-term-status">{hero.commandStatus}</p>
            </div>
            <div
              className="pj-hero-acts st-hero-acts pj-rise"
              style={{ '--d': '.3s' }}
            >
              <a
                href={open ? '#founding' : '#st-join'}
                className="pj-btn st-cta"
              >
                {open ? hero.cta : hero.ctaClosed}
              </a>
              <a href={hero.secondary.href} className="pj-ghost">
                {hero.secondary.label}
              </a>
            </div>
            <p
              className="pj-kicker st-hero-note pj-rise"
              style={{ '--d': '.35s' }}
            >
              {open ? hero.note : hero.noteClosed}
            </p>
          </div>
          <div className="pj-rise" style={{ '--d': '.25s' }}>
            <StackPicker data={data} pay={pay} onPick={onPick} />
          </div>
        </div>
      </div>
    </section>
  )
}
