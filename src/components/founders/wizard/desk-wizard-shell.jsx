'use client'

import { useCallback, useRef } from 'react'

import '@/styles/founders-wizard.css'
import { Stepper } from '@/components/founders/wizard/stepper'
import { BackButton, NextButton } from '@/components/founders/wizard/buttons'

/*
 * The boards' wizard card: the stepper, the "Step n of N · eyebrow" kicker,
 * the step heading and body, and the footer nav. Shared by the equity and job
 * offer calculators; `wizard-shell.jsx` keeps the old look for anything that
 * has not moved yet.
 *
 * The step heading is focused on every step change (not on the first paint of
 * step 1), so keyboard and screen-reader users land on the question; that
 * focus also scrolls it into view. The body slides in from the side it came
 * from (`dir`: 'fwd' | 'back'), keyed on the step so the CSS entrance replays;
 * the site's reduced-motion switch turns the slide off.
 *
 * Props:
 *   steps        [{ id, index, eyebrow, title, next, lead? }]
 *   step         the current index
 *   dir          'fwd' | 'back' | 'none'
 *   onBack, onNext, onGo(index)   onGo is the stepper's click-back
 *   nextDisabled
 *   footerStart  node for the footer's left side on step 1 (e.g. the worked
 *                example link); later steps show Back there
 *   lead         node under the heading (else `steps[].lead`)
 *   icons        { [step id]: LucideIcon } for the stepper dots
 *   children     the step body
 */
export function DeskWizardShell({
  steps,
  step,
  dir = 'fwd',
  onBack,
  onNext,
  onGo,
  nextDisabled = false,
  footerStart = null,
  lead = null,
  icons,
  children,
}) {
  const current = steps.find((s) => s.index === step) ?? steps[0]
  const isFirst = current.index === 1
  const isLast = current.index === steps.length
  const leadNode = lead ?? current.lead ?? null

  const hasMountedHeading = useRef(false)
  const headingRef = useCallback(
    (node) => {
      if (!node) return
      if (hasMountedHeading.current || current.index !== 1)
        node.focus({ preventScroll: false })
      hasMountedHeading.current = true
    },
    [current.index]
  )

  return (
    <div>
      <div data-print="hide">
        <Stepper
          steps={steps}
          current={current.index}
          onGo={onGo}
          icons={icons}
        />
      </div>
      <p className="amw-wz-kicker mt-8">
        Step {current.index} of {steps.length} · {current.eyebrow}
      </p>

      <section
        key={current.id}
        className="amw-wz-step"
        data-dir={dir}
        aria-labelledby={`wizard-step-${current.id}`}
      >
        <h2
          id={`wizard-step-${current.id}`}
          ref={headingRef}
          tabIndex={-1}
          className="amw-wz-h2"
        >
          {current.title}
        </h2>
        {leadNode && (
          <p className="text-[var(--amw-mut)] mt-2 max-w-[40rem] text-[15px] leading-relaxed">
            {leadNode}
          </p>
        )}
        {children}
      </section>

      {!isLast && (
        <div className="amw-wz-nav" data-print="hide">
          {isFirst ? footerStart ?? <span /> : <BackButton onClick={onBack} />}
          <NextButton onClick={onNext} disabled={nextDisabled} block>
            {current.next}
          </NextButton>
        </div>
      )}
    </div>
  )
}
