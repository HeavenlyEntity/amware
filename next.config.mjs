import nextMDX from '@next/mdx'
import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        // GitHub avatars, shown so a buyer can confirm the account that will
        // receive repository access is theirs. Scoped to this one host and
        // path: a wildcard here would let any URL in the app proxy arbitrary
        // remote images through our own optimiser.
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/u/**',
      },
      {
        // The studio template's placeholder testimonial avatars. They only
        // ever render in local dev and on Vercel previews, never in
        // production (src/lib/testimonials/services-testimonials.js).
        protocol: 'https',
        hostname: 'assets.aceternity.com',
        pathname: '/avatars/**',
      },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        ...[
          'index',
          'about',
          'services',
          'projects',
          'articles',
          'blog',
          'products',
          'courses',
          'contact',
          'agents',
          'sitemap',
        ].map((name) => ({
          source: `/${name}.md`,
          destination: `/machine-export/${name}.md`,
        })),
        ...['articles', 'blog', 'products', 'courses'].map((name) => ({
          source: `/${name}/:slug.md`,
          destination: `/machine-export/${name}/:slug.md`,
        })),
      ],
    }
  },
  experimental: {
    scrollRestoration: true,
    /* Prerendering is database-bound here, not CPU-bound: most pages are one
       Payload query. One worker per core would open more Postgres
       connections than Supabase's session pooler allows in total, so the
       cap is set by the database, not the machine. See the pool note in
       payload.config.ts. */
    cpus: 4,
  },
}

const withMDX = nextMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: ['remark-gfm'],
    rehypePlugins: ['@mapbox/rehype-prism'],
  },
})

export default withPayload(withMDX(nextConfig))
