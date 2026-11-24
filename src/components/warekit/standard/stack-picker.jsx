'use client'

import { useId } from 'react'
import {
  AppWindow,
  BookMarked,
  Bot,
  FlaskConical,
  LayoutDashboard,
  Package,
  ShieldCheck,
  SquareTerminal,
} from 'lucide-react'

import { PRESALE } from '@/content/site/standard-presale'
import { KIT_TREE, PAYMENTS, STACKS } from '@/content/site/warekit'
import { BRAND_ICONS } from './brand-icons'

/* Creem and Manifest have no brand mark of their own on the board: a card
   stands in for Creem and a file for Manifest. Every other option uses the
   icon under its own id. */
const ICON_FOR = { creem: 'card', manifest: 'file' }

/* The board's line icons for the folders that do not depend on a pick. */
const FOLDER_ICONS = {
  'apps/web/': AppWindow,
  'apps/dev-tool/': SquareTerminal,
  'apps/e2e/': FlaskConical,
  'packages/core/': Package,
  'packages/ai/': Bot,
  'packages/ui/': LayoutDashboard,
  'packages/agent/': BookMarked,
  'tooling/guards/': ShieldCheck,
}

/* A brand mark at a fixed height. Wide marks (Whop) keep their proportions,
   so the width follows the viewBox. A `stroke` icon is drawn as a line. */
function BrandIcon({ id, size = 14 }) {
  const icon = BRAND_ICONS[ICON_FOR[id] ?? id]
  if (!icon) return null
  const [, , w, h] = icon.viewBox.split(' ').map(Number)
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="st-pick-ico"
      viewBox={icon.viewBox}
      width={Math.round((size * w) / h)}
      height={size}
      fill={icon.stroke ? 'none' : 'currentColor'}
      stroke={icon.stroke ? 'currentColor' : undefined}
      strokeWidth={icon.stroke ? 1.5 : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={icon.d} />
    </svg>
  )
}

function PickGroup({ label, options, current, onChoose }) {
  const labelId = useId()
  return (
    <div className="st-pick-group" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="pj-kicker">
        {label}
      </span>
      <div className="ed-pick st-pick">
        {options.map(({ id, label: name }) => (
          <button
            key={id}
            type="button"
            aria-pressed={current === id}
            onClick={() => onChoose(id)}
          >
            <BrandIcon id={id} />
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}

/* The icon for one line of the tree: the picked brand on the two lines that
   depend on a pick, the board's line icon on the rest. */
function LineIcon({ path, data, pay }) {
  if (path.startsWith('packages/data/')) return <BrandIcon id={data} />
  if (path.startsWith('packages/billing/')) return <BrandIcon id={pay} />
  const Icon = FOLDER_ICONS[path]
  return Icon ? (
    <Icon
      className="st-pick-ico"
      width={14}
      height={14}
      strokeWidth={1.5}
      aria-hidden="true"
    />
  ) : null
}

/* The presale's stack picker: one data layer and one payment provider, and
   the repository those picks produce. Lines are keyed by path, so a pick
   swaps only the line it changes: that line rises in again and is the only
   one the live region reads out. The first render is not announced. */
export function StackPicker({ data, pay, onPick }) {
  const { picker } = PRESALE
  return (
    <div className="st-picker">
      <div>
        <h2 className="st-picker-title">{picker.title}</h2>
        <p className="st-picker-copy">{picker.copy}</p>
      </div>
      <PickGroup
        label={picker.dataLabel}
        options={STACKS}
        current={data}
        onChoose={(id) => onPick('data', id)}
      />
      <PickGroup
        label={picker.payLabel}
        options={PAYMENTS}
        current={pay}
        onChoose={(id) => onPick('pay', id)}
      />
      <div className="ed-tree st-tree" aria-live="polite">
        <div className="ed-tree-bar">
          <i />
          <i />
          <i />
          <span>{picker.treeTitle}</span>
        </div>
        <ul className="ed-files">
          {KIT_TREE(data, pay).map(({ path, isNew }, i) => (
            <li key={path} data-new={isNew} style={{ '--i': i }}>
              <b aria-hidden="true">{isNew ? '+' : ''}</b>
              <LineIcon path={path} data={data} pay={pay} />
              {isNew && <span className="sr-only">Added: </span>}
              {path}
            </li>
          ))}
        </ul>
      </div>
      <p className="st-lemon">{picker.lemon}</p>
    </div>
  )
}
