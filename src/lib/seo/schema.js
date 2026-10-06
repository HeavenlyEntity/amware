/* Schema.org JSON-LD for the human site. Every value comes from
   content/site/identity.js, content/site/faq.js or the Payload services
   collection, so the structured data says exactly what the visible pages
   say. Two rules, both from Google's structured-data policy and both about
   trust: mark up only what a visitor can see on the page, and only what is
   true. That is why there is no Review or AggregateRating here: the site's
   testimonials are not collected reviews. */

import { identity } from '../../content/site/identity'
import { siteOrigin } from '../site-origin'

export const ids = {
  person: siteOrigin + '/#alec',
  organization: siteOrigin + '/#amware',
  website: siteOrigin + '/#website',
}

const knowsAbout = [
  'Fractional CTO services',
  'Technical leadership',
  'Software architecture',
  'AI systems',
  'AI integration planning',
  'Next.js',
  'React',
  'TypeScript',
  'Oracle NetSuite integrations',
  'Technical due diligence',
]

export function personSchema() {
  return {
    '@type': 'Person',
    '@id': ids.person,
    name: identity.name,
    url: siteOrigin + '/about',
    jobTitle: identity.role,
    worksFor: [
      { '@id': ids.organization },
      {
        '@type': 'Organization',
        name: 'Kingdom Kode',
        url: 'https://www.kingdomkode.com',
      },
    ],
    homeLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Phoenix',
        addressRegion: 'AZ',
        addressCountry: 'US',
      },
    },
    alumniOf: {
      '@type': 'CollegeOrUniversity',
      name: identity.education.institution,
    },
    hasCredential: [
      {
        '@type': 'EducationalOccupationalCredential',
        name: 'Master of Business Administration',
        credentialCategory: 'degree',
        recognizedBy: {
          '@type': 'CollegeOrUniversity',
          name: identity.education.institution,
        },
        dateCreated: identity.education.completed,
      },
      {
        '@type': 'EducationalOccupationalCredential',
        name: 'Certified Full-Stack Software Developer',
        credentialCategory: 'certificate',
        recognizedBy: { '@type': 'EducationalOrganization', name: 'Woz U' },
        dateCreated: '2019-02',
      },
    ],
    knowsAbout,
    sameAs: [
      identity.linkedin,
      identity.github,
      identity.x,
      identity.instagram,
    ],
  }
}

export function organizationSchema() {
  return {
    '@type': 'ProfessionalService',
    '@id': ids.organization,
    name: identity.organization,
    legalName: identity.legalName,
    url: siteOrigin,
    description: identity.summary,
    founder: { '@id': ids.person },
    email: identity.email,
    image: siteOrigin + '/images/og/amware/home.png',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Phoenix',
      addressRegion: 'AZ',
      addressCountry: 'US',
    },
    areaServed: [
      { '@type': 'Country', name: 'United States' },
      { '@type': 'City', name: 'Phoenix, Arizona' },
    ],
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '18:00',
    },
    knowsAbout,
    sameAs: [identity.x],
  }
}

export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': ids.website,
    url: siteOrigin,
    name: 'AMWARE',
    publisher: { '@id': ids.organization },
    about: { '@id': ids.person },
  }
}

/* Site-wide graph: rendered once in the (site) layout. */
export function siteGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [organizationSchema(), personSchema(), websiteSchema()],
  }
}

export function faqSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }
}

/* One Service + Offer per published Payload service. Price and its period
   come from the CMS, so the markup follows a price change with no deploy. */
export function servicesSchema(docs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    '@id': siteOrigin + '/services#catalog',
    name: 'AMWARE engagements',
    url: siteOrigin + '/services',
    itemListElement: docs.map((doc) => {
      const monthly = /month/i.test(doc.priceLabel ?? '')
      return {
        '@type': 'Offer',
        url: siteOrigin + '/services#' + doc.slug,
        itemOffered: {
          '@type': 'Service',
          name: doc.name,
          ...(typeof doc.summary === 'string' && doc.summary
            ? { description: doc.summary }
            : {}),
          serviceType: doc.name,
          provider: { '@id': ids.organization },
          areaServed: { '@type': 'Country', name: 'United States' },
        },
        ...(typeof doc.startingPrice === 'number'
          ? {
              priceSpecification: {
                '@type': 'UnitPriceSpecification',
                price: doc.startingPrice,
                priceCurrency: 'USD',
                ...(monthly ? { unitCode: 'MON', unitText: 'month' } : {}),
              },
            }
          : {}),
      }
    }),
  }
}
