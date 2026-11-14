import { siteOrigin } from '@/lib/site-origin'
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api/',
          '/access/',
          '/checkout/',
          '/machine-export/',
          // The free downloads a booking earns: unlisted, never indexed.
          '/downloads/',
          '/get/',
        ],
      },
    ],
    sitemap: siteOrigin + '/sitemap.xml',
  }
}
