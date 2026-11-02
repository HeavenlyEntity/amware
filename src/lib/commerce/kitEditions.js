import {
  COMPARE,
  EDITION_LEADS,
  EDITIONS,
  NOT_ON_SALE_LEAD,
  NOT_ON_SALE_WHY,
  SETUP_INTROS,
  SETUP_STEPS,
} from '../../content/site/warekit'
import { checkoutRoute } from './checkoutRoute'

/*
 * What the NetSuite storefront may say about each kit.
 *
 * The page reads draft rows, because a draft is how it knows an edition is
 * still planned. `editionStates` is the only thing that crosses to the
 * browser: a planned edition contributes nothing from its row, so a draft
 * can't leak a price, a repo or a plan id. Everything below it turns that
 * reduced shape into words, so no copy can claim an edition is on sale when
 * it isn't. A missing edition, or the `{}` of a failed read, is planned.
 *
 * Imported by client components: no server imports, and relative paths so
 * the engine test project can load it.
 */
const STACKS = { 'react-netsuite': 'react', 'next-netsuite': 'next' }
const TIER_SEATS = { lite: 1, pro: 1, team: 5 }

const STATUS_LABELS = {
  free: 'Free to claim',
  ready: 'Available',
  planned: 'Not on sale yet',
}

const stateOf = (states, id) => states?.[id]?.state ?? 'planned'
const money = (price) =>
  typeof price === 'number' ? `$${price.toFixed(2)}` : ''
const productHref = (states, id) => `/products/${states[id].slug}`

function plannedEditions() {
  const editions = {}
  for (const [stack, name] of Object.entries(STACKS)) {
    for (const [tier, seats] of Object.entries(TIER_SEATS)) {
      editions[`${name}-${tier}`] = {
        state: 'planned',
        price: null,
        seats,
        slug: `warekit-${stack}-${tier}`,
      }
    }
  }
  return editions
}

function saleState(row) {
  if (row.status !== 'published') return 'planned'
  if (row.type === 'boilerplate' && row.price === 0) return 'free'
  return checkoutRoute(row) === 'whop' ? 'ready' : 'planned'
}

export function editionStates(rows) {
  const editions = plannedEditions()
  for (const row of rows) {
    const id = `${STACKS[row.stack]}-${row.tier}`
    const state = saleState(row)
    if (!editions[id] || state === 'planned') continue
    editions[id] = {
      state,
      price: row.price ?? null,
      seats: row.seats ?? editions[id].seats,
      slug: row.slug,
    }
  }
  return editions
}

export const familyOf = (id) =>
  id.startsWith('react-') ? 'inside' : 'connected'

/* Which of the two hero claims hold. */
export function saleSummary(states) {
  const on = Object.values(states).map((edition) => edition.state)
  return { free: on.includes('free'), paid: on.includes('ready') }
}

/* The heading and steps of the setup path, for what can be reached now. */
export function setupCopy({ free, paid }) {
  const key = free ? (paid ? 'both' : 'free') : paid ? 'paid' : 'none'
  const { kicker, first } = SETUP_INTROS[key]
  const [firstStep, ...rest] = SETUP_STEPS
  return { kicker, steps: [{ ...firstStep, copy: first }, ...rest] }
}

export function editionView(edition, states) {
  const state = stateOf(states, edition.id)
  const planned = state === 'planned'
  const seats = edition.seatLabel
  const liteOpen = stateOf(states, 'react-lite') !== 'planned'
  const words = planned ? edition : { ...edition, ...edition.onSale }
  return {
    state,
    badge: STATUS_LABELS[state],
    head: words.head,
    copy:
      planned && edition.copyLite && liteOpen
        ? `${edition.copy} ${edition.copyLite}`
        : words.copy,
    listLabel: words.listLabel,
    items: words.items,
    price: {
      free: 'Free',
      ready: money(states?.[edition.id]?.price),
      planned: 'Planned',
    }[state],
    priceSub:
      state === 'ready'
        ? `One-time · ${seats}`
        : seats[0].toUpperCase() + seats.slice(1),
    cta: planned ? 'Get notified' : edition.cta,
    tone: planned ? 'quiet' : edition.tone,
    rec: edition.rec && !planned,
    href: planned ? null : productHref(states, edition.id),
  }
}

export function editionLead(family, states) {
  if (family === 'built') return EDITION_LEADS.built
  const [lite, ...rest] = EDITIONS[family].map((e) => stateOf(states, e.id))
  const restPlanned = rest.every((state) => state === 'planned')
  if (lite === 'planned' && restPlanned) return NOT_ON_SALE_LEAD
  if (family === 'inside') {
    return lite === 'free' && restPlanned ? EDITION_LEADS.inside : null
  }
  return lite === 'free' ? EDITION_LEADS.connected : EDITION_LEADS.connectedPaid
}

function liveCell(kind, id, states) {
  const state = stateOf(states, id)
  if (kind === 'status') return STATUS_LABELS[state]
  if (state === 'free') return 'Free'
  if (state === 'planned') return 'Planned'
  return `${money(states[id].price)} one-time`
}

export function compareTable(family, states) {
  const { rows, rec, ...table } = COMPARE[family]
  const ids = EDITIONS[family].map((edition) => edition.id)
  const shownRec = stateOf(states, ids[rec]) === 'planned' ? null : rec
  return {
    ...table,
    rec: shownRec,
    rows: rows.map(({ label, cells }) => {
      const values =
        typeof cells === 'string'
          ? ids.map((id) => liveCell(cells, id, states))
          : cells
      return {
        label,
        cells: values.map((value, i) => ({
          value,
          hi: i === shownRec && values[0] !== value,
        })),
      }
    }),
  }
}

/* The edition's own button: its page while on sale, the waitlist otherwise. */
function editionAction(id, cta, states) {
  return stateOf(states, id) === 'planned'
    ? { cta: 'Get notified', action: { type: 'notify', id } }
    : { cta, action: { type: 'link', href: productHref(states, id) } }
}

function picked(name, why, id, cta, states) {
  const planned = stateOf(states, id) === 'planned'
  return {
    kicker: 'Recommended',
    name,
    why: [...why, ...(planned ? [NOT_ON_SALE_WHY] : [])].join(' '),
    ...editionAction(id, cta, states),
  }
}

function insideWhy(seats, states) {
  const liteFree = stateOf(states, 'react-lite') === 'free'
  if (seats !== 'five') {
    return [
      liteFree
        ? 'Your app runs inside the account, and React Lite is free to evaluate today.'
        : 'Your app runs inside the account.',
    ]
  }
  return [
    ...(liteFree
      ? ['React Lite is the available foundation inside NetSuite.']
      : []),
    ...(stateOf(states, 'react-team') === 'planned'
      ? ['The five-seat React Team edition is still planned.']
      : []),
  ]
}

function connectedRec(answers, states) {
  const { sessions, seats } = answers
  if (sessions === 'pg') {
    const why =
      stateOf(states, 'next-lite') === 'free'
        ? 'Postgres sessions are a viable architecture, and Lite is free. Move to Pro if you later want sessions kept in NetSuite.'
        : 'Postgres sessions are a viable architecture.'
    return picked('Next / Lite', [why], 'next-lite', 'Get Lite', states)
  }
  if (sessions !== 'ns') {
    return {
      kicker: 'So far',
      name: 'A Next.js edition',
      why: 'Tell me where sessions should live and I will narrow it to one edition.',
      cta: 'See Next editions',
      action: { type: 'family', family: 'connected' },
    }
  }
  return seats === 'five'
    ? picked(
        'Next / Team',
        [
          'The Pro codebase with sessions in NetSuite, licensed for up to five GitHub collaborators.',
        ],
        'next-team',
        'Buy Team',
        states
      )
    : picked(
        'Next / Pro',
        [
          'Sessions live in NetSuite with caching to reduce repeated reads. One collaborator is all you need.',
        ],
        'next-pro',
        'Buy Pro',
        states
      )
}

/* The board's "Help me choose" logic. */
export function recommendEdition(answers, states) {
  if (answers.who === 'build') {
    return {
      kicker: 'Recommended',
      name: 'Have it built',
      why: 'Without a developer, a kit is the wrong first step. A strategy call scopes the build with you.',
      cta: 'Book a strategy call',
      action: { type: 'link', href: '/services' },
    }
  }
  if (answers.where === 'inside') {
    return picked(
      'React / Lite',
      insideWhy(answers.seats, states),
      'react-lite',
      'Get Lite',
      states
    )
  }
  if (answers.where === 'connected') return connectedRec(answers, states)
  return {
    kicker: 'Your recommendation',
    name: 'Answer to see a pick',
    why: 'Your answers update this as you go. Nothing is saved or sent.',
    cta: 'See all editions',
    action: { type: 'editions' },
  }
}
