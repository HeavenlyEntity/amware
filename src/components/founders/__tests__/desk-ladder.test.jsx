import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { DeskLadder } from '../desk/desk-ladder'
import { subscribeDesk } from '../desk-toast'
import { deskLanding } from '@/lib/founders/desk-landing'

const { rungs, note } = deskLanding()
const target = rungs.find((r) => r.id === 'target')

const setClipboard = (writeText) =>
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  })

afterEach(() => setClipboard(undefined))

describe('DeskLadder', () => {
  it('copies the rung as a sentence and confirms it in the desk toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard(writeText)
    const heard = []
    const stop = subscribeDesk((text) => heard.push(text))
    try {
      render(<DeskLadder rungs={rungs} note={note} />)
      fireEvent.click(
        screen.getByRole('button', { name: 'Copy the aim-for ask' })
      )
      await waitFor(() => expect(heard).toEqual([target.toastText]))
      expect(writeText).toHaveBeenCalledWith(target.copyText)
      expect(target.copyText).toMatch(/^Aim for \$\d+k cash and \d+% equity$/)

      /* The same row twice is two confirmations, not one. */
      fireEvent.click(
        screen.getByRole('button', { name: 'Copy the aim-for ask' })
      )
      await waitFor(() => expect(heard).toHaveLength(2))
    } finally {
      stop()
    }
  })

  it('never says "Copied" when nothing was copied', async () => {
    setClipboard(vi.fn().mockRejectedValue(new Error('denied')))
    const heard = []
    const stop = subscribeDesk((text) => heard.push(text))
    try {
      render(<DeskLadder rungs={rungs} note={note} />)
      fireEvent.click(
        screen.getByRole('button', { name: 'Copy the minimum ask' })
      )
      const box = await screen.findByRole('textbox', {
        name: /copy this text/i,
      })
      expect(box).toHaveValue(rungs.find((r) => r.id === 'floor').copyText)
      expect(heard).toEqual([])
    } finally {
      stop()
    }
  })

  it('names one copy button per rung', () => {
    render(<DeskLadder rungs={rungs} note={note} />)
    for (const name of [
      'Copy the open-with ask',
      'Copy the aim-for ask',
      'Copy the minimum ask',
    ]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('sizes each meter from its share', () => {
    const { container } = render(<DeskLadder rungs={rungs} note={note} />)
    const fills = [...container.querySelectorAll('.amw-dk-meter-fill')].map(
      (el) => el.style.getPropertyValue('--w')
    )
    expect(fills).toEqual(
      rungs.flatMap((r) => [String(r.share.cash), String(r.share.equity)])
    )
  })

  it('sets the emphasis apart from the method sentence', () => {
    render(<DeskLadder rungs={rungs} note={note} />)
    expect(screen.getByText(note.emphasis)).toHaveClass('amw-dk-note-em')
  })
})
