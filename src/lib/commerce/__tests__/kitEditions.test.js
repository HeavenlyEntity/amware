import { describe, expect, it } from 'vitest'

import {
  compareTable,
  editionLead,
  editionStates,
  editionView,
  recommendEdition,
  setupCopy,
} from '../kitEditions'
import { EDITIONS, NOT_ON_SALE_LEAD } from '../../../content/site/warekit'

const pro = {
  slug: 'warekit-next-netsuite-pro',
  stack: 'next-netsuite',
  tier: 'pro',
  type: 'boilerplate',
  price: 499,
  seats: 1,
  status: 'published',
  whopPlanId: 'plan_1',
}
const IDS = [
  'react-lite',
  'react-pro',
  'react-team',
  'next-lite',
  'next-pro',
  'next-team',
]
const view = (id, states) =>
  editionView(
    [...EDITIONS.inside, ...EDITIONS.connected].find((e) => e.id === id),
    states
  )

describe('editionStates', () => {
  it('is ready when published with a Whop plan', () => {
    expect(editionStates([pro])['next-pro'].state).toBe('ready')
  })

  it('is planned when the row is a draft', () => {
    expect(editionStates([{ ...pro, status: 'draft' }])['next-pro'].state).toBe(
      'planned'
    )
  })

  it('is planned without a Whop plan', () => {
    expect(
      editionStates([{ ...pro, whopPlanId: null }])['next-pro'].state
    ).toBe('planned')
  })

  it('is free when a published kit costs nothing', () => {
    const lite = { ...pro, tier: 'lite', price: 0, whopPlanId: null }
    expect(editionStates([lite])['next-lite'].state).toBe('free')
  })

  it('is planned when a free kit is a draft', () => {
    const lite = { ...pro, tier: 'lite', price: 0, status: 'draft' }
    expect(editionStates([lite])['next-lite'].state).toBe('planned')
  })

  it('covers all six editions when there are no rows', () => {
    const states = editionStates([])
    expect(states['react-team'].state).toBe('planned')
    expect(Object.keys(states).sort()).toEqual([...IDS].sort())
    expect(states['react-team'].seats).toBe(5)
    expect(states['next-lite'].seats).toBe(1)
    expect(states['react-pro'].slug).toBe('warekit-react-netsuite-pro')
  })

  it('reads price, seats and slug from a row on sale', () => {
    const team = {
      ...pro,
      slug: 'renamed-team',
      tier: 'team',
      price: 999,
      seats: 5,
    }
    expect(editionStates([team])['next-team']).toEqual({
      state: 'ready',
      price: 999,
      seats: 5,
      slug: 'renamed-team',
    })
  })

  // Review Focus 2: only the reduced shape leaves the server.
  it('keeps only the reduced shape', () => {
    expect(
      Object.keys(
        editionStates([{ ...pro, githubRepo: 'a/b' }])['next-pro']
      ).sort()
    ).toEqual(['price', 'seats', 'slug', 'state'])
  })

  it('carries nothing from a draft row', () => {
    const draft = { ...pro, status: 'draft', price: 1234, slug: 'secret-draft' }
    expect(editionStates([draft])['next-pro']).toEqual({
      state: 'planned',
      price: null,
      seats: 1,
      slug: 'warekit-next-netsuite-pro',
    })
  })

  it('does not let a planned row hide one on sale with the same cell', () => {
    const draft = { ...pro, slug: 'old', status: 'draft' }
    expect(editionStates([pro, draft])['next-pro'].state).toBe('ready')
  })

  it('ignores a row outside the grid', () => {
    const states = editionStates([
      { ...pro, stack: null },
      { ...pro, tier: 'x' },
    ])
    expect(states['next-pro'].state).toBe('planned')
    expect(Object.keys(states)).toHaveLength(6)
  })
})

describe('editionView', () => {
  it('shows a planned edition as not on sale', () => {
    expect(view('next-pro', {})).toMatchObject({
      state: 'planned',
      badge: 'Not on sale yet',
      price: 'Planned',
      priceSub: 'One GitHub collaborator',
      cta: 'Get notified',
      tone: 'quiet',
      rec: false,
      href: null,
    })
  })

  it('shows a ready edition with its Payload price and page', () => {
    const states = editionStates([pro])
    expect(view('next-pro', states)).toMatchObject({
      badge: 'Available',
      price: '$499.00',
      priceSub: 'One-time · one GitHub collaborator',
      cta: 'Buy Pro',
      tone: 'solid',
      rec: true,
      href: '/products/warekit-next-netsuite-pro',
    })
  })

  it('shows a free edition as claimable', () => {
    const states = editionStates([
      { ...pro, tier: 'lite', price: 0, whopPlanId: null, slug: 'next-lite' },
    ])
    expect(view('next-lite', states)).toMatchObject({
      badge: 'Free to claim',
      price: 'Free',
      priceSub: 'One GitHub account',
      cta: 'Get Lite',
      href: '/products/next-lite',
    })
  })

  it('only points at React Lite while it can be reached', () => {
    const lite = {
      ...pro,
      slug: 'react-lite',
      stack: 'react-netsuite',
      tier: 'lite',
      price: 0,
    }
    expect(view('react-pro', {}).copy).toBe(
      'Planned extensions on top of Lite.'
    )
    expect(view('react-pro', editionStates([lite])).copy).toBe(
      'Planned extensions on top of Lite. Start with React Lite while development continues.'
    )
  })
})

describe('editionView on sale', () => {
  const react = (tier, price) => ({
    ...pro,
    slug: `react-${tier}`,
    stack: 'react-netsuite',
    tier,
    price,
  })
  const onSale = editionStates([react('pro', 499), react('team', 999)])
  const words = ({ head, copy, listLabel, items }) =>
    [head, copy, listLabel, ...items].join(' ')

  it.each(['react-pro', 'react-team'])(
    'drops the planned wording from %s once it is ready',
    (id) => {
      expect(view(id, onSale).state).toBe('ready')
      expect(words(view(id, onSale))).not.toMatch(/planned|in development/i)
    }
  )

  it('keeps the planned wording while they are planned', () => {
    expect(view('react-pro', {}).head).toBe(
      'A commercial SuiteApp foundation, in development.'
    )
    expect(view('react-pro', {}).listLabel).toBe('Planned modules')
    expect(view('react-team', {}).items[0]).toBe('The same planned Pro code')
  })

  it('stops pointing at React Lite once React Pro is on sale', () => {
    const states = editionStates([
      react('pro', 499),
      { ...react('lite', 0), whopPlanId: null },
    ])
    expect(view('react-pro', states).copy).not.toContain(
      'Start with React Lite'
    )
  })

  it('leaves the editions the board wrote for sale alone', () => {
    const { head, copy, listLabel, items } = EDITIONS.connected[1]
    expect(view('next-pro', editionStates([pro]))).toMatchObject({
      head,
      copy,
      listLabel,
      items,
    })
  })
})

describe('setupCopy', () => {
  const first = (sale) => setupCopy(sale).steps[0].copy

  it('keeps the board wording with both on sale', () => {
    const sale = { free: true, paid: true }
    expect(setupCopy(sale).kicker).toBe('04 · After you check out')
    expect(first(sale)).toBe(
      'Claim a Lite edition or check out, then confirm the GitHub account that gets the invite.'
    )
  })

  it('only mentions claiming when only Lite is on sale', () => {
    const sale = { free: true, paid: false }
    expect(setupCopy(sale).kicker).toBe('04 · After you claim Lite')
    expect(first(sale)).toBe(
      'Claim a Lite edition, then confirm the GitHub account that gets the invite.'
    )
  })

  it('only mentions checkout when only paid editions are on sale', () => {
    const sale = { free: false, paid: true }
    expect(setupCopy(sale).kicker).toBe('04 · After you check out')
    expect(first(sale)).toBe(
      'Check out, then confirm the GitHub account that gets the invite.'
    )
  })

  it('claims neither with nothing on sale', () => {
    const sale = { free: false, paid: false }
    expect(setupCopy(sale).kicker).toBe('04 · After you buy')
    expect(first(sale)).toBe(
      'When an edition ships, confirm the GitHub account that gets the invite.'
    )
  })

  it('keeps the other three steps', () => {
    const { steps } = setupCopy({ free: false, paid: false })
    expect(steps.map((step) => step.title)).toEqual([
      'Get GitHub access',
      'Run the local example',
      'Configure your account',
      'Validate in your sandbox',
    ])
  })
})

describe('editionLead', () => {
  const liteReact = {
    ...pro,
    stack: 'react-netsuite',
    tier: 'lite',
    price: 0,
  }
  const liteNext = { ...pro, tier: 'lite', price: 0 }

  it('says so when a family has nothing on sale', () => {
    expect(editionLead('inside', {})).toBe(NOT_ON_SALE_LEAD)
    expect(editionLead('connected', {})).toBe(NOT_ON_SALE_LEAD)
    expect(NOT_ON_SALE_LEAD).toBe(
      'These editions are not on sale yet. Leave your email and you will hear when they are.'
    )
  })

  it('keeps the board wording when it is true', () => {
    expect(editionLead('inside', editionStates([liteReact]))).toBe(
      'React Lite is free and available today. Pro and Team are planned, so they have no checkout yet.'
    )
    expect(editionLead('connected', editionStates([liteNext]))).toBe(
      'Start free with Lite. Pro moves sessions into NetSuite; Team licenses the same code for five developers.'
    )
  })

  it('does not promise a free Lite that is not on sale', () => {
    expect(editionLead('connected', editionStates([pro]))).toBe(
      'Pro moves sessions into NetSuite; Team licenses the same code for five developers.'
    )
  })

  it('leaves the inside lead out when its claims no longer hold', () => {
    const reactPro = { ...pro, stack: 'react-netsuite' }
    expect(editionLead('inside', editionStates([reactPro]))).toBeNull()
  })

  it('has a fixed lead for the build path', () => {
    expect(editionLead('built', {})).toBe(
      'For business owners who want the outcome, not the framework.'
    )
  })
})

describe('compareTable', () => {
  const row = (table, label) => table.rows.find((r) => r.label === label)

  it('marks everything planned on a failed read', () => {
    const inside = compareTable('inside', {})
    expect(row(inside, 'Price').cells.map((c) => c.value)).toEqual([
      'Planned',
      'Planned',
      'Planned',
    ])
    expect(row(inside, 'Status').cells.map((c) => c.value)).toEqual([
      'Not on sale yet',
      'Not on sale yet',
      'Not on sale yet',
    ])
    const connected = compareTable('connected', {})
    expect(row(connected, 'Price').cells.map((c) => c.value)).toEqual([
      'Planned',
      'Planned',
      'Planned',
    ])
  })

  it('prices what is on sale', () => {
    const states = editionStates([
      pro,
      { ...pro, tier: 'lite', price: 0, whopPlanId: null },
    ])
    expect(
      row(compareTable('connected', states), 'Price').cells.map((c) => c.value)
    ).toEqual(['Free', '$499.00 one-time', 'Planned'])
  })

  it('keeps the recommended column only while that edition is on sale', () => {
    expect(compareTable('connected', {}).rec).toBeNull()
    const table = compareTable('connected', editionStates([pro]))
    expect(table.rec).toBe(1)
    expect(table.head).toEqual(['Lite', 'Pro', 'Team'])
    expect(row(table, 'Sessions').cells[1]).toEqual({
      value: 'Inside NetSuite',
      hi: true,
    })
    expect(row(table, 'Runs').cells[1].hi).toBe(false)
  })
})

describe('recommendEdition', () => {
  const free = editionStates([
    { ...pro, tier: 'lite', price: 0, slug: 'next-lite' },
    {
      ...pro,
      stack: 'react-netsuite',
      tier: 'lite',
      price: 0,
      slug: 'react-lite',
    },
  ])
  const onSale = editionStates([
    pro,
    { ...pro, tier: 'team', price: 999, slug: 'next-team' },
  ])

  it('asks for answers first', () => {
    expect(recommendEdition({}, {})).toEqual({
      kicker: 'Your recommendation',
      name: 'Answer to see a pick',
      why: 'Your answers update this as you go. Nothing is saved or sent.',
      cta: 'See all editions',
      action: { type: 'editions' },
    })
  })

  it('sends someone without a developer to a strategy call', () => {
    expect(recommendEdition({ who: 'build', where: 'inside' }, free)).toEqual({
      kicker: 'Recommended',
      name: 'Have it built',
      why: 'Without a developer, a kit is the wrong first step. A strategy call scopes the build with you.',
      cta: 'Book a strategy call',
      action: { type: 'link', href: '/services' },
    })
  })

  describe('inside NetSuite', () => {
    it('gets React Lite when it is free', () => {
      expect(recommendEdition({ where: 'inside' }, free)).toEqual({
        kicker: 'Recommended',
        name: 'React / Lite',
        why: 'Your app runs inside the account, and React Lite is free to evaluate today.',
        cta: 'Get Lite',
        action: { type: 'link', href: '/products/react-lite' },
      })
    })

    it('explains five seats while Team is planned', () => {
      expect(
        recommendEdition({ where: 'inside', seats: 'five' }, free).why
      ).toBe(
        'React Lite is the available foundation inside NetSuite. The five-seat React Team edition is still planned.'
      )
    })

    it('answers Get notified while React Lite is planned', () => {
      const rec = recommendEdition({ where: 'inside' }, {})
      expect(rec).toMatchObject({
        name: 'React / Lite',
        cta: 'Get notified',
        action: { type: 'notify', id: 'react-lite' },
      })
      expect(rec.why).toBe(
        'Your app runs inside the account. This edition is not on sale yet. Leave your email and you will hear when it is.'
      )
    })

    it('does not call a planned Lite available at five seats', () => {
      const rec = recommendEdition({ where: 'inside', seats: 'five' }, {})
      expect(rec.cta).toBe('Get notified')
      expect(rec.why).not.toMatch(/available/i)
      expect(rec.why).toContain(
        'The five-seat React Team edition is still planned.'
      )
    })

    it('does not call React Team planned once it is on sale', () => {
      const states = {
        ...free,
        'react-team': { state: 'ready', price: 999, seats: 5, slug: 'rt' },
      }
      expect(
        recommendEdition({ where: 'inside', seats: 'five' }, states).why
      ).not.toContain('still planned')
    })
  })

  describe('connected to NetSuite', () => {
    it('narrows once where sessions live is known', () => {
      expect(recommendEdition({ where: 'connected' }, onSale)).toEqual({
        kicker: 'So far',
        name: 'A Next.js edition',
        why: 'Tell me where sessions should live and I will narrow it to one edition.',
        cta: 'See Next editions',
        action: { type: 'family', family: 'connected' },
      })
    })

    it('gets Next Lite for Postgres sessions when it is free', () => {
      expect(
        recommendEdition({ where: 'connected', sessions: 'pg' }, free)
      ).toEqual({
        kicker: 'Recommended',
        name: 'Next / Lite',
        why: 'Postgres sessions are a viable architecture, and Lite is free. Move to Pro if you later want sessions kept in NetSuite.',
        cta: 'Get Lite',
        action: { type: 'link', href: '/products/next-lite' },
      })
    })

    it('answers Get notified while Next Lite is planned', () => {
      const rec = recommendEdition({ where: 'connected', sessions: 'pg' }, {})
      expect(rec).toMatchObject({
        name: 'Next / Lite',
        cta: 'Get notified',
        action: { type: 'notify', id: 'next-lite' },
      })
      expect(rec.why).not.toContain('Lite is free')
    })

    it('gets Next Pro for NetSuite sessions', () => {
      expect(
        recommendEdition({ where: 'connected', sessions: 'ns' }, onSale)
      ).toEqual({
        kicker: 'Recommended',
        name: 'Next / Pro',
        why: 'Sessions live in NetSuite with caching to reduce repeated reads. One collaborator is all you need.',
        cta: 'Buy Pro',
        action: { type: 'link', href: '/products/warekit-next-netsuite-pro' },
      })
    })

    it('gets Next Team for five developers', () => {
      expect(
        recommendEdition(
          { where: 'connected', sessions: 'ns', seats: 'five' },
          onSale
        )
      ).toEqual({
        kicker: 'Recommended',
        name: 'Next / Team',
        why: 'The Pro codebase with sessions in NetSuite, licensed for up to five GitHub collaborators.',
        cta: 'Buy Team',
        action: { type: 'link', href: '/products/next-team' },
      })
    })

    it('answers Get notified while Pro and Team are planned', () => {
      const answers = { where: 'connected', sessions: 'ns' }
      expect(recommendEdition(answers, {})).toMatchObject({
        name: 'Next / Pro',
        cta: 'Get notified',
        action: { type: 'notify', id: 'next-pro' },
      })
      expect(recommendEdition({ ...answers, seats: 'five' }, {})).toMatchObject(
        {
          name: 'Next / Team',
          cta: 'Get notified',
          action: { type: 'notify', id: 'next-team' },
        }
      )
    })
  })
})
