'use client'

import { useRef } from 'react'

/*
 * The keyboard half of every single-select control on the desk (seat cards,
 * chips, segmented thumbs, yes/no pairs), so they all behave like the radio
 * groups they are (DESIGN.md: "Single-select groups are role=radiogroup").
 *
 * Roving tabindex: the selected option is the one Tab stop; with nothing
 * selected the first enabled option is. Arrow keys move and select, wrapping;
 * Home and End jump. Disabled options are skipped.
 *
 * `getItemProps(index)` returns the props a `role="radio"` button needs.
 */
export function useRovingRadio({ options, value, onChange }) {
  const refs = useRef([])
  const selectedIndex = options.findIndex((option) => option.id === value)
  const firstEnabled = options.findIndex((option) => !option.disabled)

  function onKeyDown(event, index) {
    const enabled = options
      .map((option, i) => (option.disabled ? null : i))
      .filter((i) => i !== null)
    if (enabled.length === 0) return
    const position = Math.max(0, enabled.indexOf(index))
    let target = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      target = enabled[(position + 1) % enabled.length]
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      target = enabled[(position - 1 + enabled.length) % enabled.length]
    } else if (event.key === 'Home') {
      target = enabled[0]
    } else if (event.key === 'End') {
      target = enabled[enabled.length - 1]
    }
    if (target === null || target === undefined) return
    event.preventDefault()
    refs.current[target]?.focus()
    onChange(options[target].id)
  }

  function getItemProps(index) {
    const option = options[index]
    const selected = index === selectedIndex
    const tabbable = selected || (selectedIndex < 0 && index === firstEnabled)
    return {
      ref: (node) => {
        refs.current[index] = node
      },
      type: 'button',
      role: 'radio',
      'aria-checked': selected,
      'aria-disabled': option.disabled || undefined,
      tabIndex: tabbable ? 0 : -1,
      onClick: () => {
        if (!option.disabled) onChange(option.id)
      },
      onKeyDown: (event) => onKeyDown(event, index),
    }
  }

  return { selectedIndex, getItemProps }
}
