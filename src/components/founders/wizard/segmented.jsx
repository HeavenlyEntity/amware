'use client'

import { useId } from 'react'

import '@/styles/founders-wizard.css'
import { useRovingRadio } from '@/components/founders/wizard/use-roving-radio'

/*
 * Segmented control with a sliding thumb (board `.eq-seg`).
 *
 * A radiogroup, never `aria-pressed`: one choice of n, arrow keys move and
 * select (DESIGN.md). The thumb is a neutral surface, not teal; it slides to
 * the selected cell and hides when nothing is selected, so a stored value
 * outside the options never reads as a wrong selection.
 *
 * With four or more options the control folds to 2×2 when its own width drops
 * under 26rem, so labels such as "Bootstrap or hold" never squeeze into 70px
 * cells on a phone (spec fork F8). Labels may also wrap to two lines.
 *
 * The fold uses a container query, and a query container has no intrinsic
 * width: in a flex row or anything else that shrinks to fit, give the
 * wrapper a width (`className="w-full sm:min-w-[24rem]"`), or it collapses.
 *
 * Props:
 *   label       visible group label (rendered as `.amw-wz-label`), or omit and
 *               pass `labelId` / `ariaLabel` to name the group yourself
 *   labelAside  quiet text after the label, e.g. "(last closed priced round)"
 *   options     [{ id, label, disabled? }]
 *   value       the selected id, or anything else for "none"
 *   onChange    (id) => void
 *   fold        allow the 2×2 fold (default: when there are 4+ options)
 *   hideLabel   keep the label for assistive tech only
 *   className   on the outer wrapper
 */
export function Segmented({
  label,
  labelAside,
  labelId,
  ariaLabel,
  options,
  value,
  onChange,
  fold,
  hideLabel = false,
  className = '',
}) {
  const autoId = useId()
  const groupLabelId = labelId ?? `${autoId}-label`
  const { selectedIndex, getItemProps } = useRovingRadio({
    options,
    value,
    onChange,
  })
  const n = options.length
  const folds = fold ?? n >= 4
  const index = Math.max(0, selectedIndex)
  const style = {
    '--n': n,
    '--i': index,
    '--col': index % 2,
    '--row': Math.floor(index / 2),
    '--rows': Math.ceil(n / 2),
  }

  return (
    <div className={className}>
      {label && (
        <p id={groupLabelId} className={hideLabel ? 'sr-only' : 'amw-wz-label'}>
          {label}
          {labelAside && (
            <>
              {' '}
              <span className="amw-wz-label-aside">{labelAside}</span>
            </>
          )}
        </p>
      )}
      <div className="amw-wz-seg-wrap">
        <div
          role="radiogroup"
          aria-labelledby={label || labelId ? groupLabelId : undefined}
          aria-label={!label && !labelId ? ariaLabel : undefined}
          className="amw-wz-seg"
          data-fold={folds ? 'true' : undefined}
          data-empty={selectedIndex < 0 ? 'true' : undefined}
          style={style}
        >
          <span className="amw-wz-seg-thumb" aria-hidden="true" />
          {options.map((option, i) => (
            <button key={option.id} {...getItemProps(i)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
