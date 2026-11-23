import { describe, expect, it } from 'vitest'
import {
  cmsSocialImage,
  withSocialImage,
  withProductSocialImage,
} from '../metadata'
import catalog from '../og-catalog.json'

describe('AMWare share metadata', () => {
  it('adds matching large previews while retaining existing page and social copy', () => {
    const page = {
      title: 'Products',
      description: 'Page description',
      alternates: { canonical: '/products' },
      openGraph: {
        title: 'Products | AMWare',
        description: 'Social description',
        url: '/products',
      },
      twitter: { site: '@AmwareDotDev', description: 'Twitter description' },
    }
    const result = withSocialImage(page, 'products')
    expect(result.alternates).toEqual(page.alternates)
    expect(result.title).toBe('Products')
    expect(result.openGraph).toMatchObject({
      ...page.openGraph,
      images: [
        {
          url: '/images/og/amware/products.png',
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: 'Products | AMWare',
        },
      ],
    })
    expect(result.twitter).toMatchObject({
      ...page.twitter,
      card: 'summary_large_image',
      images: [
        { url: '/images/og/amware/products.png', alt: 'Products | AMWare' },
      ],
    })
    expect(page.openGraph).not.toHaveProperty('images')
  })

  it.each(
    catalog
      .filter((item) => item.path.startsWith('/products/'))
      .map((item) => [item.path.split('/').pop(), item.key])
  )('selects edition artwork for %s', (slug, key) => {
    const result = withProductSocialImage({ title: slug }, { slug })
    expect(result.openGraph.images[0].url).toBe(`/images/og/amware/${key}.png`)
  })

  it.each(['unknown-kit', '__proto__', '../../access/private'])(
    'uses catalog artwork for unknown key %s',
    (key) => {
      const result = withSocialImage({ title: 'New product' }, key)
      expect(result.openGraph.images[0].url).toBe(
        '/images/og/amware/products.png'
      )
    }
  )

  it('honors a populated CMS image in both previews without inventing dimensions', () => {
    const image = cmsSocialImage({
      id: 7,
      url: '/api/media/file/article.png',
      alt: 'Article cover',
    })
    const result = withSocialImage({ title: 'Article' }, 'blog', image)
    expect(result.openGraph.images).toEqual([
      { url: '/api/media/file/article.png', alt: 'Article cover' },
    ])
    expect(result.twitter.images).toEqual([
      { url: '/api/media/file/article.png', alt: 'Article cover' },
    ])
  })

  it('retains valid CMS dimensions and falls back for an unpopulated image relationship', () => {
    expect(
      cmsSocialImage({ url: '/custom.jpg', width: 800, height: 500, alt: null })
    ).toEqual({ url: '/custom.jpg', width: 800, height: 500 })
    for (const value of [null, undefined, 7, '7', { url: '' }, { url: null }]) {
      const result = withSocialImage(
        { title: 'Article' },
        'blog',
        cmsSocialImage(value)
      )
      expect(result.openGraph.images[0].url).toBe('/images/og/amware/blog.png')
    }
  })

  it('preserves MDX custom art and article fields instead of replacing them with category art', () => {
    const result = withSocialImage(
      {
        title: 'Engineering notes',
        openGraph: {
          type: 'article',
          publishedTime: '2026-09-13',
          authors: ['Alec Mingione'],
          tags: ['Engineering'],
        },
      },
      'articles',
      { url: 'https://www.amware.dev/custom-cover.jpg', alt: 'Original cover' }
    )
    expect(result.openGraph).toMatchObject({
      type: 'article',
      publishedTime: '2026-09-13',
      authors: ['Alec Mingione'],
      tags: ['Engineering'],
    })
    expect(result.openGraph.images[0].url).toBe(
      'https://www.amware.dev/custom-cover.jpg'
    )
    expect(result.twitter.images[0].alt).toBe('Original cover')
  })

  it('uses the absolute homepage title in accessible image text', () => {
    const result = withSocialImage(
      { title: { absolute: 'AMWare home' } },
      'home'
    )
    expect(result.openGraph.images[0].alt).toBe('AMWare home | AMWare')
  })
})

describe('product social image precedence', () => {
  it('prefers an explicit CMS preview over kit artwork and hero', () => {
    const result = withProductSocialImage(
      { title: 'Kit' },
      {
        slug: 'warekit-react-netsuite-lite',
        ogImage: { url: '/custom.png' },
        heroImage: { url: '/hero.png' },
      }
    )
    expect(result.openGraph.images[0].url).toBe('/custom.png')
    expect(result.twitter.images[0].url).toBe('/custom.png')
  })
  it.each([undefined, null, 42, { url: '' }])(
    'falls back to edition artwork for unpopulated or missing OG data %s',
    (ogImage) => {
      const result = withProductSocialImage(
        { title: 'Kit' },
        {
          slug: 'warekit-next-netsuite-team',
          ogImage,
          heroImage: { url: '/hero.png' },
        }
      )
      expect(result.openGraph.images[0].url).toBe(
        '/images/og/amware/next-team.png'
      )
    }
  )
  it('uses non-kit hero imagery, or neutral branding when no image is available', () => {
    const metadata = { title: 'Switch Clone guide' }
    expect(
      withProductSocialImage(metadata, {
        slug: 'switch-clone',
        heroImage: { url: '/switch.png' },
      }).openGraph.images[0].url
    ).toBe('/switch.png')
    expect(
      withProductSocialImage(metadata, { slug: 'switch-clone', heroImage: 3 })
        .openGraph.images[0].url
    ).toBe('/images/og/amware/home.png')
  })
})

describe('the WareKit social cards', () => {
  it('do not sell the kits on sessions, Postgres or a database', () => {
    const kits = catalog.filter((entry) => /warekit/i.test(entry.title ?? ''))
    expect(kits.length).toBeGreaterThan(0)
    for (const { title, subtitle } of kits) {
      expect(`${title} ${subtitle}`).not.toMatch(/session|postgres|database/i)
    }
  })
})
