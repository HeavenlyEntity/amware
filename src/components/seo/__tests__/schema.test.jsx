import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  faqSchema,
  ids,
  personSchema,
  servicesSchema,
  siteGraph,
} from '@/lib/seo/schema'
import { faqs } from '@/content/site/faq'
import { FAQ } from '@/components/landing/faq'
import { Stats } from '@/components/landing/stats'

describe('site JSON-LD', () => {
  it('links one Person and one ProfessionalService by @id', () => {
    const graph = siteGraph()['@graph']
    const org = graph.find((n) => n['@type'] === 'ProfessionalService')
    const person = graph.find((n) => n['@type'] === 'Person')
    expect(org.founder).toEqual({ '@id': ids.person })
    expect(person.worksFor).toContainEqual({ '@id': ids.organization })
    expect(org.legalName).toBe('AMWARE Technologies LLC')
  })

  it('states credentials as they appear on /about', () => {
    const json = JSON.stringify(personSchema())
    for (const name of [
      'Woolf University',
      'Glendale Community College',
      'Woz U',
      'Steve Wozniak',
      'Anthropic',
    ])
      expect(json).toContain(name)
    expect(json).not.toMatch(/Review|AggregateRating/)
  })

  it('mirrors the visible FAQ exactly', () => {
    const schema = faqSchema(faqs)
    expect(schema.mainEntity).toHaveLength(faqs.length)
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe(faqs[0].answer)
  })

  it('publishes no price for any service, even with one stored', () => {
    const { itemListElement } = servicesSchema([
      {
        name: 'Retainer',
        slug: 'retainer',
        category: 'technical',
        startingPrice: 3000,
        priceLabel: 'per month',
      },
      {
        name: 'Audit',
        slug: 'audit',
        category: 'technical',
        startingPrice: 1500,
      },
      {
        name: 'Fractional CTO',
        slug: 'fractional-cto',
        category: 'consulting',
        startingPrice: 7500,
      },
    ])
    for (const offer of itemListElement)
      expect(offer).not.toHaveProperty('priceSpecification')
    expect(itemListElement.map((o) => o.itemOffered.name)).toEqual([
      'Retainer',
      'Audit',
      'Fractional CTO',
    ])
  })
})

describe('server HTML that crawlers read', () => {
  it('ships every FAQ answer while the accordion is closed', () => {
    const html = renderToStaticMarkup(<FAQ />)
    for (const { answer } of faqs) expect(html).toContain(answer.slice(0, 40))
  })

  it('renders each stat once, not twice', () => {
    const { container } = render(<Stats />)
    expect(container.textContent).not.toMatch(/22 ?Companies|40\+40\+/)
    expect(container.textContent).toContain('2Companies Founded')
    expect(container.textContent).toContain('2.2xDaily Laptop Setups')
    expect(container.textContent).not.toMatch(/40\+|Engineers Mentored/)
  })
})
