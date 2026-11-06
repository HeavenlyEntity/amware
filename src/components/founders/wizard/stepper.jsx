'use client'

import { Check } from 'lucide-react'

import '@/styles/founders-wizard.css'

/*
 * The wizard's progress (board `.eq-steps`): an icon dot per step, a bar that
 * fills as each step is done, and the step's name.
 *
 * Every step is a real button in an `ol` labelled "Progress". A done step goes
 * back to that step (`onGo(index)`); the current step is marked
 * `aria-current="step"`; a step not reached yet is `aria-disabled`, so the
 * no-op is announced rather than silent. Names hide visually at phone width
 * but stay as the buttons' names.
 *
 * Props: { steps: [{ id, index, eyebrow }], current (index), onGo(index),
 *   icons: { [step id]: LucideIcon }, className }
 */
export function Stepper({ steps, current, onGo, icons = {}, className = '' }) {
  return (
    <ol
      aria-label="Progress"
      className={`amw-wz-steps ${className}`}
      style={{ '--n': steps.length }}
    >
      {steps.map((step) => {
        const state =
          step.index < current
            ? 'done'
            : step.index === current
            ? 'current'
            : 'todo'
        const Icon = state === 'done' ? Check : icons[step.id]
        const isLast = step.index === steps.length
        const status =
          state === 'done'
            ? ', done'
            : state === 'current'
            ? ', current step'
            : ', not reached yet'
        return (
          <li key={step.id}>
            <button
              type="button"
              className="amw-wz-st"
              data-state={state}
              data-reach={state === 'done' ? 'true' : undefined}
              aria-current={state === 'current' ? 'step' : undefined}
              aria-disabled={state === 'todo' || undefined}
              onClick={() => {
                if (state === 'done') onGo?.(step.index)
              }}
            >
              <span className="amw-wz-st-row">
                <span className="amw-wz-st-dot" aria-hidden="true">
                  {Icon && (
                    <Icon
                      className="size-4"
                      strokeWidth={state === 'done' ? 2.75 : 2}
                    />
                  )}
                </span>
                {!isLast && (
                  <span className="amw-wz-st-bar" aria-hidden="true">
                    <span />
                  </span>
                )}
              </span>
              <span className="amw-wz-st-name">
                {step.eyebrow}
                <span className="sr-only">{status}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
