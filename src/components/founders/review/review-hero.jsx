import { Check, Info } from 'lucide-react'

import { GlassPanel } from '@/components/founders/desk/glass-panel'

/* The board's FluidGlass options. The text colour comes from the panel's CSS
   colour (founders-review.css), so it follows the theme. */
const LENS = {
  text: 'Second\nread.',
  fontSize: 76,
  shape: 'lens',
  shapes: ['lens', 'pill', 'blob', 'cube'],
  size: 190,
  refraction: 1,
  dispersion: 0.4,
  reflection: 1,
  shadow: 0.5,
  elevation: 0.45,
  interaction: 'follow',
  smoothness: 0.5,
  wobble: 0.5,
  spin: 0.25,
  position: [0.5, 0.5],
}

const ORIGIN = {
  equity: 'Prefilled from your equity read',
  'job-offer': 'Prefilled from your job offer ask',
}

/**
 * The review's hero: the eyebrow, the promise, and a chip saying where the
 * read came from. `status` is 'loading' until the store hydrates, then
 * 'read' or 'none'. While loading the chip keeps its height but shows
 * nothing, so the page never flashes "No read attached" and then swaps.
 */
export function ReviewHero({ status, from }) {
  return (
    <div className="rv-hero">
      <div className="min-w-0">
        <p className="amw-eyebrow rv-rise m-0" style={{ '--d': '.05s' }}>
          {'// Founders’ Desk / Offer review'}
        </p>
        <h1 className="rv-h1 rv-rise" style={{ '--d': '.12s' }}>
          Get a second read before you answer the offer.
        </h1>
        <p className="rv-lead rv-rise" style={{ '--d': '.2s' }}>
          Send what the calculator found. I read every one myself and reply with
          what to push on, what to leave alone, and the number to counter with.
        </p>
        <div className="rv-rise mt-5" style={{ '--d': '.28s' }}>
          {status === 'loading' ? (
            <span className="rv-origin" data-tone="wait" aria-hidden="true" />
          ) : status === 'read' ? (
            <p className="rv-origin m-0">
              <span className="rv-origin-ico" aria-hidden="true">
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              <span>
                {ORIGIN[from] ?? ORIGIN.equity}
                <span className="rv-faint">
                  {' '}
                  · stays in this browser until you send
                </span>
              </span>
            </p>
          ) : (
            <p className="rv-origin m-0" data-tone="none">
              <span className="rv-origin-ico" aria-hidden="true">
                <Info className="size-3.5" strokeWidth={2.5} />
              </span>
              <span>
                No read attached yet. Run a calculator first, or describe it
                yourself.
              </span>
            </p>
          )}
        </div>
      </div>
      {/* Decorative: GlassPanel without a label hides itself from assistive
          tech. It draws the static poster first and adds the FluidGlass lens
          only where the desk allows WebGL (wide, fine pointer, motion on).
          Hidden on phones, where it would push the form a screen down. */}
      <div
        className="rv-glass rv-rise"
        style={{ '--d': '.4s' }}
        data-print="hide"
      >
        <GlassPanel className="rv-glass-panel" lens={LENS}>
          <span className="amw-glass-tag amw-glass-bl">
            Every review gets a second look
          </span>
        </GlassPanel>
      </div>
    </div>
  )
}
