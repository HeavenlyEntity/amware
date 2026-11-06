'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'

import { announceDesk } from '@/components/founders/desk-toast'
import { useClipboard } from '@/components/founders/use-clipboard'
import { useReveal } from '@/components/founders/desk/use-reveal'

/*
 * 02 · The same example, priced as an ask.
 *
 * The second half of the desk, shown rather than described: this is the gap,
 * and this is what you would ask for because of it. The rows are computed on
 * the server from `computeAsk(EXAMPLE_READ)` and arrive as plain data, so the
 * final figures are in the HTML (print, no-JS, crawlers) and the landing never
 * ships `negotiation.js` or the salary bands.
 *
 * A real table: a screen reader hears "Aim for, cash $100k, equity 13%"
 * rather than three bare values. The middle rung is dominant by weight and
 * contrast, never by a teal fill, which in this design system reads as
 * "selected" and would recommend an ask to someone who has not used the tool.
 * The accent only arrives on hover or focus, as feedback.
 *
 * No count-up: the figures are at rest from the first paint and the meters
 * carry the motion.
 *
 * Copying confirms in the dock's one toast (`announceDesk`). When the
 * clipboard is unavailable or denied, the text appears selected in a box
 * under the table instead of a "Copied" that did not happen.
 */
export function DeskLadder({ rungs, note }) {
  const { ref, attrs } = useReveal()
  const { state, areaRef, copy } = useClipboard()
  const [pending, setPending] = useState(null)

  if (!rungs?.length) return null

  const onCopy = async (rung) => {
    setPending(rung)
    const ok = await copy(rung.copyText)
    if (ok) announceDesk(rung.toastText)
  }

  return (
    <div ref={ref} {...attrs} style={{ '--d': '.1s' }}>
      <figure className="amw-dk-ladder">
        <figcaption className="amw-dk-num">
          02 · The same example, priced as an ask
        </figcaption>
        <table className="amw-dk-rungs">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Rung</span>
              </th>
              <th scope="col" className="amw-kicker">
                Cash
              </th>
              <th scope="col" className="amw-kicker">
                Equity
              </th>
              <th scope="col">
                <span className="sr-only">Copy</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rungs.map((rung) => (
              <tr
                key={rung.id}
                className={`amw-dk-rung ${
                  rung.dominant ? 'amw-dk-rung-main' : ''
                }`}
              >
                <th scope="row" className="amw-kicker amw-dk-rung-label">
                  {rung.label}
                </th>
                <td>
                  <Meter
                    text={rung.cashText}
                    share={rung.share.cash}
                    dominant={rung.dominant}
                  />
                </td>
                <td>
                  <Meter
                    text={rung.equityText}
                    share={rung.share.equity}
                    dominant={rung.dominant}
                  />
                </td>
                <td className="amw-dk-rung-copy">
                  <button
                    type="button"
                    className="amw-dk-copy"
                    data-print="hide"
                    aria-label={`Copy the ${copyName(rung)} ask`}
                    onClick={() => onCopy(rung)}
                  >
                    <Copy className="size-[18px]" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {state === 'fallback' && pending ? (
          <div className="amw-dk-fallback" data-print="hide">
            <label htmlFor="desk-ladder-fallback" className="amw-kicker">
              Copy this text
            </label>
            <textarea
              id="desk-ladder-fallback"
              ref={areaRef}
              readOnly
              rows={2}
              value={pending.copyText}
            />
          </div>
        ) : null}
      </figure>
      {note?.lead ? (
        <p className="amw-dk-note">
          {note.lead}
          {note.emphasis ? (
            <>
              {' '}
              <span className="amw-dk-note-em">{note.emphasis}</span>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  )
}

const COPY_NAMES = { ceiling: 'open-with', target: 'aim-for', floor: 'minimum' }

function copyName(rung) {
  return COPY_NAMES[rung.id] ?? rung.label.toLowerCase()
}

function Meter({ text, share, dominant }) {
  return (
    <span className="amw-dk-meter">
      <span
        className={`amw-dk-value ${dominant ? 'font-semibold' : 'font-normal'}`}
      >
        {text}
      </span>
      <span className="amw-dk-meter-bar" aria-hidden="true">
        <span className="amw-dk-meter-fill" style={{ '--w': share }} />
      </span>
    </span>
  )
}
