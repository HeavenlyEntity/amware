import { describe, expect, it, vi } from 'vitest'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { FileText, User } from 'lucide-react'

import { Segmented } from '../segmented'
import { Stepper } from '../stepper'
import { SeatCards } from '../seat-cards'
import { ChoiceChips } from '../choice-chips'
import { SwitchRow, YesNoRow } from '../gate-rows'
import { FounderMeter, maxScoreFor } from '../founder-meter'
import { NumberBox } from '../number-box'
import { PresetField } from '../preset-field'
import { CountStepper } from '../count-stepper'
import { RailChecklist } from '../rail'
import { BandTrack, axisMaxFor } from '../band-track'
import { OfferSlider } from '../offer-slider'
import { DeskWizardShell } from '../desk-wizard-shell'
import { CHIPS } from '@/lib/founders/equity/benchmarks'
import { scoreResponsibilities } from '@/lib/founders/equity/classify'

const STAGES = [
  { id: 'preseed', label: 'pre-seed' },
  { id: 'seed', label: 'seed' },
  { id: 'series_a', label: 'Series A' },
  { id: 'series_b_plus', label: 'Series B+' },
]

const STEPS = [
  {
    id: 'seat',
    index: 1,
    eyebrow: 'Who you are',
    title: 'Seat?',
    next: 'Next: work',
  },
  {
    id: 'work',
    index: 2,
    eyebrow: 'The work',
    title: 'Work?',
    next: 'Next: offer',
  },
  {
    id: 'offer',
    index: 3,
    eyebrow: 'The offer',
    title: 'Offer?',
    next: 'See it',
  },
  { id: 'read', index: 4, eyebrow: 'Your read', title: 'Read', next: null },
]

describe('Segmented', () => {
  it('is a named radiogroup with one checked radio and one Tab stop', () => {
    render(
      <Segmented
        label="Company stage"
        options={STAGES}
        value="seed"
        onChange={() => {}}
      />
    )
    const group = screen.getByRole('radiogroup', { name: 'Company stage' })
    const radios = within(group).getAllByRole('radio')
    expect(radios).toHaveLength(4)
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1, -1])
    /* The thumb follows the selection. */
    expect(group.style.getPropertyValue('--i')).toBe('1')
    expect(group).not.toHaveAttribute('data-empty')
  })

  it('arrow keys move and select, wrapping; Home and End jump', () => {
    const onChange = vi.fn()
    render(
      <Segmented
        label="Stage"
        options={STAGES}
        value="preseed"
        onChange={onChange}
      />
    )
    const radios = screen.getAllByRole('radio')
    fireEvent.keyDown(radios[0], { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('seed')
    expect(radios[1]).toHaveFocus()
    fireEvent.keyDown(radios[0], { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('series_b_plus')
    fireEvent.keyDown(radios[0], { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith('series_b_plus')
    fireEvent.keyDown(radios[2], { key: 'Home' })
    expect(onChange).toHaveBeenLastCalledWith('preseed')
    fireEvent.keyDown(radios[0], { key: 'ArrowDown' })
    expect(onChange).toHaveBeenLastCalledWith('seed')
  })

  it('shows no selection, and keeps the first option tabbable, for a value it does not offer', () => {
    render(
      <Segmented
        label="Stage"
        options={STAGES}
        value="idea"
        onChange={() => {}}
      />
    )
    const group = screen.getByRole('radiogroup')
    expect(group).toHaveAttribute('data-empty', 'true')
    const radios = screen.getAllByRole('radio')
    expect(
      radios.every((r) => r.getAttribute('aria-checked') === 'false')
    ).toBe(true)
    expect(radios[0].tabIndex).toBe(0)
  })

  it('folds four options to 2×2 on narrow widths, but not when told not to', () => {
    const { rerender } = render(
      <Segmented
        label="Stage"
        options={STAGES}
        value="series_a"
        onChange={() => {}}
      />
    )
    const group = screen.getByRole('radiogroup')
    expect(group).toHaveAttribute('data-fold', 'true')
    expect(group.style.getPropertyValue('--col')).toBe('0')
    expect(group.style.getPropertyValue('--row')).toBe('1')
    rerender(
      <Segmented
        label="Stage"
        options={STAGES}
        value="series_a"
        onChange={() => {}}
        fold={false}
      />
    )
    expect(screen.getByRole('radiogroup')).not.toHaveAttribute('data-fold')
  })
})

describe('Stepper', () => {
  const setup = (current, onGo = vi.fn()) => {
    render(
      <Stepper
        steps={STEPS}
        current={current}
        onGo={onGo}
        icons={{ seat: User, offer: FileText }}
      />
    )
    return { onGo, list: screen.getByRole('list', { name: 'Progress' }) }
  }

  it('marks done, current and not-yet steps for assistive tech', () => {
    const { list } = setup(3)
    const buttons = within(list).getAllByRole('button')
    expect(buttons).toHaveLength(4)
    expect(buttons[0]).toHaveAccessibleName('Who you are, done')
    expect(buttons[2]).toHaveAttribute('aria-current', 'step')
    expect(buttons[2]).toHaveAccessibleName('The offer, current step')
    expect(buttons[3]).toHaveAttribute('aria-disabled', 'true')
    expect(buttons[3]).toHaveAccessibleName('Your read, not reached yet')
    expect(buttons[0]).not.toHaveAttribute('aria-disabled')
  })

  it('goes back to a done step on click, and ignores the current and later ones', () => {
    const { onGo, list } = setup(3)
    const buttons = within(list).getAllByRole('button')
    fireEvent.click(buttons[2])
    fireEvent.click(buttons[3])
    expect(onGo).not.toHaveBeenCalled()
    fireEvent.click(buttons[1])
    expect(onGo).toHaveBeenCalledWith(2)
  })

  it('keeps every step a real, focusable button in reading order', () => {
    const { list } = setup(2)
    const buttons = within(list).getAllByRole('button')
    for (const button of buttons) {
      expect(button.tagName).toBe('BUTTON')
      expect(button).toHaveAttribute('type', 'button')
      button.focus()
      expect(button).toHaveFocus()
    }
  })
})

describe('DeskWizardShell', () => {
  it('focuses the incoming heading forward, back and on a click-back', async () => {
    const onGo = vi.fn()
    const { rerender } = render(
      <DeskWizardShell steps={STEPS} step={1} onGo={onGo}>
        Answer
      </DeskWizardShell>
    )
    /* Not on the first paint of step 1. */
    expect(screen.getByRole('heading', { name: 'Seat?' })).not.toHaveFocus()
    rerender(
      <DeskWizardShell steps={STEPS} step={3} dir="fwd" onGo={onGo}>
        Answer
      </DeskWizardShell>
    )
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Offer?' })).toHaveFocus()
    )
    expect(screen.getByText('Step 3 of 4 · The offer')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /who you are, done/i }))
    expect(onGo).toHaveBeenCalledWith(1)
    rerender(
      <DeskWizardShell steps={STEPS} step={1} dir="back" onGo={onGo}>
        Answer
      </DeskWizardShell>
    )
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Seat?' })).toHaveFocus()
    )
    expect(
      screen.getByRole('heading', { name: 'Seat?' }).closest('section')
    ).toHaveAttribute('data-dir', 'back')
  })

  it('shows the step-1 footer slot, then Back on later steps', () => {
    const { rerender } = render(
      <DeskWizardShell
        steps={STEPS}
        step={1}
        footerStart={<button type="button">Fill in the worked example</button>}
      >
        Answer
      </DeskWizardShell>
    )
    expect(
      screen.getByRole('button', { name: 'Fill in the worked example' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
    rerender(
      <DeskWizardShell steps={STEPS} step={2}>
        Answer
      </DeskWizardShell>
    )
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /next: offer/i })
    ).toBeInTheDocument()
  })
})

describe('SeatCards', () => {
  const seats = [
    {
      id: 'cto',
      label: 'CTO',
      description: 'You own the technology.',
      icon: 'system',
    },
    {
      id: 'engineer',
      label: 'Software engineer',
      description: 'You build it.',
      icon: 'computer',
    },
  ]

  it('names each card by its seat and describes it with the description', () => {
    render(
      <SeatCards
        label="Which seat?"
        options={seats}
        value="cto"
        onChange={() => {}}
      />
    )
    const cto = screen.getByRole('radio', { name: /^CTO$/ })
    expect(cto).toHaveAttribute('aria-checked', 'true')
    expect(cto).toHaveAccessibleDescription('You own the technology.')
    expect(
      screen.getByRole('radiogroup', { name: 'Which seat?' })
    ).toBeInTheDocument()
  })

  it('moves and selects with arrow keys', () => {
    const onChange = vi.fn()
    render(
      <SeatCards
        label="Which seat?"
        options={seats}
        value="cto"
        onChange={onChange}
      />
    )
    fireEvent.keyDown(screen.getByRole('radio', { name: /^CTO$/ }), {
      key: 'ArrowDown',
    })
    expect(onChange).toHaveBeenCalledWith('engineer')
  })
})

describe('ChoiceChips', () => {
  const opts = [
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
    { id: 'c', label: 'Gamma' },
  ]

  it('keeps the check glyph in the DOM so it can grow in', () => {
    render(
      <ChoiceChips label="Pick" options={opts} value="b" onChange={() => {}} />
    )
    const radios = screen.getAllByRole('radio')
    expect(radios[0].querySelector('svg')).not.toBeNull()
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')
  })

  it('multi mode toggles pressed chips and keeps the options’ order', () => {
    const onChange = vi.fn()
    render(
      <ChoiceChips
        label="Yours"
        mode="multi"
        options={opts}
        value={['c']}
        onChange={onChange}
      />
    )
    expect(screen.getByRole('group', { name: 'Yours' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gamma' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }))
    expect(onChange).toHaveBeenCalledWith(['a', 'c'])
  })
})

describe('gate rows', () => {
  it('SwitchRow is a named switch that toggles', () => {
    const onChange = vi.fn()
    render(
      <SwitchRow label="Full-time on signing" checked onChange={onChange} />
    )
    const sw = screen.getByRole('switch', { name: 'Full-time on signing' })
    expect(sw).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(sw)
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('YesNoRow is a radiogroup named by its question, with nothing checked while unanswered', () => {
    const onChange = vi.fn()
    render(
      <YesNoRow
        question="Full time on signing?"
        value={null}
        onChange={onChange}
      />
    )
    const group = screen.getByRole('radiogroup', {
      name: 'Full time on signing?',
    })
    const [yes, no] = within(group).getAllByRole('radio')
    expect(yes).toHaveAttribute('aria-checked', 'false')
    expect(no).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(no)
    expect(onChange).toHaveBeenCalledWith(false)
  })
})

describe('FounderMeter', () => {
  it('takes its divisor from the seat’s chip weights, not a typed 8.5', () => {
    for (const role of Object.keys(CHIPS)) {
      const sum = CHIPS[role].reduce((total, chip) => total + chip.weight, 0)
      expect(maxScoreFor(CHIPS[role])).toBeCloseTo(sum)
    }
  })

  it('fills to score over the maximum and shows the class, or ? while pending', () => {
    const picked = scoreResponsibilities('cto', ['architecture', 'shipped_mvp'])
    const max = maxScoreFor(CHIPS.cto)
    const { container, rerender } = render(
      <FounderMeter
        score={picked.score}
        maxScore={max}
        selected={picked.selected}
        total={picked.total}
        classLabel="Hired executive"
      />
    )
    expect(
      screen.getByText(`· ${picked.selected} of ${picked.total}`, {
        exact: false,
      })
    ).toBeInTheDocument()
    expect(screen.getByText('Hired executive')).toBeInTheDocument()
    const meter = screen.getByRole('meter', { name: 'Founder-level work' })
    expect(meter).toHaveAttribute('aria-valuemax', String(max))
    expect(container.querySelector('.amw-wz-meter-fill').style.transform).toBe(
      `scaleX(${picked.score / max})`
    )
    rerender(
      <FounderMeter
        score={0}
        maxScore={max}
        selected={0}
        total={8}
        pendingHint="Pick what was yours."
      />
    )
    expect(screen.getByText('?')).toBeInTheDocument()
    expect(screen.getByText('Pick what was yours.')).toBeInTheDocument()
  })
})

describe('NumberBox', () => {
  it('commits on blur, not per keystroke, and blank means null', () => {
    const onCommit = vi.fn()
    render(
      <NumberBox
        id="sal"
        label="Offered salary"
        value={null}
        onCommit={onCommit}
        prefix="$"
      />
    )
    const input = screen.getByLabelText('Offered salary')
    fireEvent.change(input, { target: { value: '18' } })
    expect(onCommit).not.toHaveBeenCalled()
    fireEvent.blur(input, { target: { value: '180000' } })
    expect(onCommit).toHaveBeenLastCalledWith(180000)
  })

  it('treats tabbing through, with nothing changed, as no answer at all', () => {
    const onCommit = vi.fn()
    const { rerender } = render(
      <NumberBox
        id="sal"
        label="Offered salary"
        value={null}
        onCommit={onCommit}
      />
    )
    fireEvent.blur(screen.getByLabelText('Offered salary'))
    expect(onCommit).not.toHaveBeenCalled()
    rerender(
      <NumberBox
        id="sal"
        label="Offered salary"
        value={120000}
        onCommit={onCommit}
      />
    )
    const input = screen.getByLabelText('Offered salary')
    fireEvent.blur(input)
    expect(onCommit).not.toHaveBeenCalled()
    fireEvent.blur(input, { target: { value: '' } })
    expect(onCommit).toHaveBeenLastCalledWith(null)
  })

  it('steps by its increment without float noise and stops at the floor', () => {
    const onCommit = vi.fn()
    const { rerender } = render(
      <NumberBox
        id="eq"
        label="Equity offered"
        value={3}
        onCommit={onCommit}
        step={0.25}
        decLabel="Less equity"
        incLabel="More equity"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Less equity' }))
    expect(onCommit).toHaveBeenLastCalledWith(2.75)
    rerender(
      <NumberBox
        id="eq"
        label="Equity offered"
        value={0}
        onCommit={onCommit}
        step={0.25}
        decLabel="Less equity"
        incLabel="More equity"
      />
    )
    const less = screen.getByRole('button', { name: 'Less equity' })
    expect(less).toHaveAttribute('aria-disabled', 'true')
    onCommit.mockClear()
    fireEvent.click(less)
    expect(onCommit).not.toHaveBeenCalled()
  })
})

describe('PresetField', () => {
  const presets = [
    { value: 3, label: '3 years' },
    { value: 4, label: '4 years' },
  ]

  it('selects the matching preset', () => {
    const onCommit = vi.fn()
    render(
      <PresetField
        id="v"
        label="Vesting"
        presets={presets}
        value={4}
        onCommit={onCommit}
      />
    )
    expect(screen.getByRole('radio', { name: '4 years' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(screen.queryByLabelText('Vesting, other value')).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: '3 years' }))
    expect(onCommit).toHaveBeenCalledWith(3)
  })

  it('selects Other and shows the stored value when it matches no preset', () => {
    render(
      <PresetField
        id="v"
        label="Vesting"
        presets={presets}
        value={6}
        onCommit={() => {}}
      />
    )
    expect(screen.getByRole('radio', { name: 'Other' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(screen.getByLabelText('Vesting, other value')).toHaveValue(6)
  })
})

describe('CountStepper', () => {
  it('announces the count and holds at its bounds without losing focus', () => {
    const onChange = vi.fn()
    render(
      <CountStepper
        label="How many founders?"
        value={6}
        min={1}
        max={6}
        onChange={onChange}
        decLabel="Fewer founders"
        incLabel="More founders"
      />
    )
    const more = screen.getByRole('button', { name: 'More founders' })
    expect(more).toHaveAttribute('aria-disabled', 'true')
    more.focus()
    fireEvent.click(more)
    expect(onChange).not.toHaveBeenCalled()
    expect(more).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Fewer founders' }))
    expect(onChange).toHaveBeenCalledWith(5)
    expect(screen.getByRole('status')).toHaveTextContent('6')
  })
})

describe('RailChecklist', () => {
  it('counts what is unlocked and says which rows are done', () => {
    render(
      <RailChecklist
        items={[
          { id: 'a', label: 'Role', icon: 'programmer', done: true },
          {
            id: 'b',
            label: 'Work',
            icon: 'blocks',
            done: false,
            note: 'step 2',
          },
        ]}
      />
    )
    expect(screen.getByText('1 of 2 unlocked')).toBeInTheDocument()
    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Role, done')
    expect(rows[1]).toHaveTextContent('Work, still to answer')
    expect(rows[1]).toHaveTextContent('step 2')
  })
})

describe('axisMaxFor', () => {
  it('is at least 30, else the next ten above the largest value plus two', () => {
    expect(axisMaxFor(15.5, 3)).toBe(30)
    expect(axisMaxFor(29)).toBe(40)
    expect(axisMaxFor(41, null, undefined)).toBe(50)
    expect(axisMaxFor()).toBe(30)
  })
})

describe('OfferSlider', () => {
  const band = { lo: 8.5, hi: 15.5 }

  it('names the slider and the typed field, and states the offer in text', () => {
    render(
      <OfferSlider
        id="pct"
        label="Offered equity"
        value={3}
        onCommit={() => {}}
        max={30}
        step={0.5}
        band={band}
        hint="5.5–12.5 points below the band for this work."
      />
    )
    const slider = screen.getByRole('slider', { name: 'Offered equity' })
    expect(slider).toHaveAttribute('aria-valuetext', '3% offered')
    expect(slider).toHaveAttribute('aria-valuemax', '30')
    expect(slider).toHaveAccessibleDescription(/points below the band/)
    expect(screen.getByLabelText('Offered equity, typed')).toHaveValue(3)
  })

  it('commits a typed percent on blur, and a blank as no offer', () => {
    const onCommit = vi.fn()
    render(
      <OfferSlider
        id="pct"
        label="Offered equity"
        value={3}
        onCommit={onCommit}
        max={30}
        step={0.5}
        band={band}
      />
    )
    const typed = screen.getByLabelText('Offered equity, typed')
    fireEvent.change(typed, { target: { value: '0.1' } })
    expect(onCommit).not.toHaveBeenCalled()
    fireEvent.blur(typed)
    expect(onCommit).toHaveBeenLastCalledWith(0.1)
    fireEvent.blur(typed, { target: { value: '' } })
    expect(onCommit).toHaveBeenLastCalledWith(null)
  })

  it('moves by its step from the keyboard', () => {
    const onCommit = vi.fn()
    render(
      <OfferSlider
        id="pct"
        label="Offered equity"
        value={3}
        onCommit={onCommit}
        max={30}
        step={0.5}
        band={band}
      />
    )
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' })
    expect(onCommit).toHaveBeenCalledWith(3.5)
  })
})

describe('BandTrack', () => {
  it('lights the band only when the offer is inside it', () => {
    const { container, rerender } = render(
      <BandTrack lo={8} hi={15} offer={3} max={30} />
    )
    const bandEl = container.querySelector('.amw-wz-band')
    expect(bandEl).not.toHaveAttribute('data-hit')
    expect(bandEl.style.left).toBe(`${(8 / 30) * 100}%`)
    rerender(<BandTrack lo={8} hi={15} offer={10} max={30} />)
    expect(container.querySelector('.amw-wz-band')).toHaveAttribute(
      'data-hit',
      'true'
    )
    rerender(<BandTrack lo={8} hi={15} offer={null} max={30} />)
    expect(container.querySelector('.amw-wz-mark')).toBeNull()
  })
})
