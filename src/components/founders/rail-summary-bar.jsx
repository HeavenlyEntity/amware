'use client'

import { useEffect, useState } from 'react'
import { ChevronUp } from 'lucide-react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ResultsRail } from '@/components/founders/results-rail'
import { AnimateDigits } from '@/components/founders/animate-digits'
import { Badge } from '@/components/founders/wizard/badge'
import { CLASS_LABELS, fmtPct } from '@/components/founders/format'

/* Below md (the page's wrapper is md:hidden): a 56px bar pinned to the bottom (badge + range) that opens a
   non-modal bottom sheet with the full rail. No scrim, no focus trap,
   Escape closes; the form stays usable behind it. The wizard reserves
   bottom padding equal to the bar plus the safe-area inset. */

export const SUMMARY_BAR_HEIGHT = 56

export function RailSummaryBar({ read, step, onOpenChange }) {
  const [open, setOpenState] = useState(false)
  /* The page hears about the sheet too: the desk dock hides while it is up. */
  const setOpen = (next) => {
    setOpenState(next)
    onOpenChange?.(next)
  }
  /* The bar unmounts on the results step, possibly with the sheet up; the
     page must not keep believing it is open. */
  useEffect(() => () => onOpenChange?.(false), [onOpenChange])
  const { classification, offer } = read
  const band = offer.range
  const classLabel = classification.pending
    ? '?'
    : CLASS_LABELS[classification.class] ?? '?'

  return (
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      <SheetTrigger asChild>
        <button
          type="button"
          data-print="hide"
          className="amw border-[var(--wz-edge)] bg-[var(--wz-rail)] fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t px-5 text-left shadow-[0_-12px_32px_-20px_rgba(0,0,0,0.5)] lg:hidden"
          style={{
            height: `calc(${SUMMARY_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
          aria-expanded={open}
        >
          <span className="flex items-center gap-3">
            <Badge quiet={classification.pending}>
              <span aria-hidden={classification.pending || undefined}>
                {classLabel}
              </span>
              {classification.pending && (
                <span className="sr-only">No read yet</span>
              )}
            </Badge>
            <span className="text-[var(--amw-ink)] text-base font-semibold tabular-nums">
              <AnimateDigits value={`${fmtPct(band.lo)}–${fmtPct(band.hi)}`} />
            </span>
          </span>
          <span className="amw-wz-kicker flex items-center gap-1">
            Your read
            <ChevronUp
              className={`size-4 transition-transform ${
                open ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        overlay={false}
        showClose
        className="lg:hidden"
        style={{
          paddingBottom: `calc(${SUMMARY_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
        }}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <SheetTitle className="sr-only">Your read so far</SheetTitle>
        <SheetDescription className="sr-only">
          What the calculator knows from your answers so far.
        </SheetDescription>
        <div className="p-2">
          <ResultsRail
            read={read}
            step={step}
            className="amw-wz-railcard--flat"
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
