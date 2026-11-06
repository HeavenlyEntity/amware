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
import { Badge } from '@/components/founders/wizard/badge'
import { OfferRail } from '@/components/founders/ladder/offer-rail'
import { CLASS_LABELS, fmtMoney, fmtPct } from '@/components/founders/format'
import { SUMMARY_BAR_HEIGHT } from '@/components/founders/rail-summary-bar'

/*
 * The phone rail (spec fork F5), the job offer twin of the equity tool's
 * `RailSummaryBar`: a 56px bar pinned to the bottom with the class badge and
 * the target, opening a non-modal bottom sheet that holds the full rail. No
 * scrim, no focus trap, Escape closes; the wizard stays usable behind it.
 * The page reserves the bar's height and tells the dock to sit above it.
 */
export function OfferSummaryBar({ read, ask, store, step, onOpenChange }) {
  const [open, setOpenState] = useState(false)
  const setOpen = (next) => {
    setOpenState(next)
    onOpenChange?.(next)
  }
  /* The bar unmounts on the ask, possibly with the sheet up; the page must
     not keep believing it is open. */
  useEffect(() => () => onOpenChange?.(false), [onOpenChange])

  const { classification } = read
  const pending = classification.pending
  const target = ask?.target ?? null

  return (
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      <SheetTrigger asChild>
        <button
          type="button"
          data-print="hide"
          className="amw border-[var(--wz-edge)] bg-[var(--wz-rail)] fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t px-5 text-left shadow-[0_-12px_32px_-20px_rgba(0,0,0,0.5)]"
          style={{
            height: `calc(${SUMMARY_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
          aria-expanded={open}
        >
          <span className="flex min-w-0 items-center gap-3">
            <Badge quiet={pending}>
              {pending ? (
                <>
                  <span aria-hidden="true">?</span>
                  <span className="sr-only">No read yet</span>
                </>
              ) : (
                CLASS_LABELS[classification.class] ?? '?'
              )}
            </Badge>
            {target && (
              <span
                className="text-base font-semibold tabular-nums"
                style={{
                  color: pending ? 'var(--amw-mut)' : 'var(--amw-ink)',
                }}
              >
                {fmtMoney(target.cash)} + {fmtPct(target.equityPct)}
              </span>
            )}
          </span>
          <span className="amw-wz-kicker flex shrink-0 items-center gap-1">
            Your ask
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
        className="md:hidden"
        style={{
          paddingBottom: `calc(${SUMMARY_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
        }}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <SheetTitle className="sr-only">Your ask so far</SheetTitle>
        <SheetDescription className="sr-only">
          What the calculator knows from your answers so far.
        </SheetDescription>
        <div className="amw p-2">
          <OfferRail
            read={read}
            ask={ask}
            store={store}
            step={step}
            className="amw-wz-railcard--flat"
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
