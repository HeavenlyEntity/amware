import {
  COMPARE,
  EDITION_LEADS,
  EDITIONS,
  ENTERPRISE_CTA,
  ENTERPRISE_NOTE,
  NEVER_CHECKS,
  NOT_ON_SALE_LEAD,
  NOT_ON_SALE_WHY,
  SETUP_INTROS,
  SETUP_STEPS,
  START_WITH_PRO,
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
/* Lite does not track NetSuite accounts, so it has no number to show. */
const TIER_ACCOUNTS = { lite: null, pro: 1, team: 3 }

const STATUS_LABELS = {
  free: 'Free to claim',
  ready: 'Available',
  planned: 'Not on sale yet',
}

const stateOf = (states, id) => states?.[id]?.state ?? 'planned'
const tierOf = (id) => id.slice(id.indexOf('-') + 1)
const whole = (value) => (Number.isInteger(value) && value >= 1 ? value : null)
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
export const developersLabel = (n) => plural(n, 'developer')
export const accountsLabel = (n) => plural(n, 'NetSuite account')
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
        netsuiteAccounts: TIER_ACCOUNTS[tier],
        slug: `warekit-${stack}-${tier}`,
      }
    }
  }
  return editions
}

/* What a license for this row allows, as plain counts. A missing value is 1,
   the same rule the license page applies. Lite never has accounts. */
export function kitLimits(row, seats = 1) {
  return {
    seats: whole(row.seats) ?? seats,
    netsuiteAccounts:
      row.tier === 'lite' ? null : whole(row.netsuiteAccounts) ?? 1,
  }
}

function saleState(row) {
  if (row.status !== 'published') return 'planned'
  if (row.type === 'boilerplate' && row.price === 0) return 'free'
  return checkoutRoute(row) === 'creem' ? 'ready' : 'planned'
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
      ...kitLimits(row, editions[id].seats),
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

const DEFAULTS = plannedEditions()
const limitsOf = (states, id) => ({
  seats: whole(states?.[id]?.seats) ?? DEFAULTS[id].seats,
  netsuiteAccounts:
    tierOf(id) === 'lite'
      ? null
      : whole(states?.[id]?.netsuiteAccounts) ?? DEFAULTS[id].netsuiteAccounts,
})

/* "5 developers · 3 NetSuite accounts". Lite leaves the accounts out. */
function limitsLine(id, states) {
  const { seats, netsuiteAccounts } = limitsOf(states, id)
  return [
    developersLabel(seats),
    ...(netsuiteAccounts === null ? [] : [accountsLabel(netsuiteAccounts)]),
  ].join(' · ')
}

export function editionView(edition, states) {
  const state = stateOf(states, edition.id)
  const planned = state === 'planned'
  const liteOpen = stateOf(states, 'react-lite') !== 'planned'
  const words = planned ? edition : { ...edition, ...edition.onSale }
  const limits = limitsLine(edition.id, states)
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
    priceSub: state === 'ready' ? `One-time · ${limits}` : limits,
    tier: tierOf(edition.id),
    paid: state === 'ready',
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
  if (kind === 'developers') return String(limitsOf(states, id).seats)
  if (kind === 'accounts') {
    return String(limitsOf(states, id).netsuiteAccounts ?? 'Not tracked')
  }
  const state = stateOf(states, id)
  if (kind === 'status') return STATUS_LABELS[state]
  if (state === 'free') return 'Free'
  if (state === 'planned') return 'Planned'
  return `${money(states[id].price)} one-time`
}

const FAMILY_STACK = { inside: 'react-netsuite', connected: 'next-netsuite' }
const WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven']
const word = (n) => WORDS[n] || String(n)

/* The Contact form reads a kit and a tier as short ids, and fills the subject
   only when it knows both. */
export function enterpriseHref(stack, tier) {
  const query = new URLSearchParams()
  if (stack) query.set('kit', stack)
  if (stack && tier) query.set('tier', tier)
  const text = query.toString()
  return text ? `/contact/enterprise?${text}` : '/contact/enterprise'
}

/* The lines under the table. The two about buying only hold while there is
   something to buy: moving up to Team needs Pro and Team both on sale. The
   Enterprise line is a conversation, so it stands either way. It is about
   the kit being viewed and goes past Team's limits, so its tier is Team. */
function tableNotes(family, ids, states) {
  const on = ids.map((id) => stateOf(states, id) === 'ready')
  const team = ids.find((id) => tierOf(id) === 'team')
  const { seats, netsuiteAccounts } = limitsOf(states, team)
  return {
    notes: [
      ...(on[1] && on[2] ? [START_WITH_PRO] : []),
      ...(on[1] || on[2] ? [NEVER_CHECKS] : []),
    ],
    enterprise: {
      lead: `More than ${word(seats)} developers or ${word(
        netsuiteAccounts
      )} accounts?`,
      cta: ENTERPRISE_CTA,
      href: enterpriseHref(FAMILY_STACK[family], 'team'),
    },
  }
}

export function compareTable(family, states) {
  const { rows, rec, ...table } = COMPARE[family]
  const ids = EDITIONS[family].map((edition) => edition.id)
  const shownRec = stateOf(states, ids[rec]) === 'planned' ? null : rec
  return {
    ...table,
    ...tableNotes(family, ids, states),
    rec: shownRec,
    rows: rows.map(({ label, cells, note }) => {
      const values =
        typeof cells === 'string'
          ? ids.map((id) => liveCell(cells, id, states))
          : cells
      return {
        label,
        note,
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
      ? ['The five-developer React Team edition is still planned.']
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
          'The Pro codebase with sessions in NetSuite, licensed for up to five developers.',
        ],
        'next-team',
        'Buy Team',
        states
      )
    : picked(
        'Next / Pro',
        [
          'Sessions live in NetSuite with caching to reduce repeated reads. One developer is all you need.',
        ],
        'next-pro',
        'Buy Pro',
        states
      )
}

/* Past five developers is past Team, so the quiz ends at a conversation. */
function enterpriseRec(where) {
  return {
    kicker: 'Recommended',
    name: 'Enterprise',
    why: ENTERPRISE_NOTE,
    cta: ENTERPRISE_CTA,
    action: {
      type: 'link',
      href: enterpriseHref(FAMILY_STACK[where], 'team'),
    },
  }
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
  if (answers.seats === 'more') return enterpriseRec(answers.where)
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
