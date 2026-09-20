'use client'

import { useRef } from 'react'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'

/* A two-way toggle in the segmented-control vocabulary the Founders' Desk
   already uses, done as real tabs: roving tabindex, arrow keys, Home/End,
   and the panel wired to its tab with aria-controls. The selected segment is
   a filled accent pill that slides between tabs; under reduced motion it
   simply appears where it should be.

   Selection is not colour alone. The fill changes shape as much as colour,
   and aria-selected carries it for anyone not looking. */

/* `id` is shared with the panels, which the parent renders; both sides
   derive their element ids from it so aria-controls and aria-labelledby
   point at real elements. */
export function OfferTabs({ id, tabs, value, onChange, label }) {
  const reduce = useReducedMotion()
  const refs = useRef([])

  const select = (index) => {
    const next = tabs[(index + tabs.length) % tabs.length]
    onChange(next.id)
    refs.current[(index + tabs.length) % tabs.length]?.focus()
  }

  const onKeyDown = (event, index) => {
    const keys = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    }
    if (event.key in keys) {
      event.preventDefault()
      select(keys[event.key])
    }
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className="amw-tabs mx-auto inline-flex"
    >
      {tabs.map((tab, i) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${id}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            className="amw-tab"
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {selected && (
              <motion.span
                aria-hidden="true"
                className="amw-tab__fill"
                layoutId={reduce ? undefined : `${id}-fill`}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="amw-tab__label">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** The ids OfferTabs uses, so a panel can point back at its tab. */
export function offerPanelProps(id, tabId) {
  return {
    role: 'tabpanel',
    id: `${id}-panel-${tabId}`,
    'aria-labelledby': `${id}-tab-${tabId}`,
  }
}
