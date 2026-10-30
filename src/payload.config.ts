import path from 'path'
import { fileURLToPath } from 'url'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Articles } from './collections/Articles'
import { Projects } from './collections/Projects'
import { Products } from './collections/Products'
import { Courses } from './collections/Courses'
import { Lessons } from './collections/Lessons'
import { Services } from './collections/Services'
import { ContactSubmissions } from './collections/ContactSubmissions'
import { Purchases } from './collections/Purchases'
import { PricingPage } from './globals/PricingPage'
import { creemPriceEndpoint } from './lib/commerce/creemPriceEndpoint'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      beforeDashboard: [
        '@/components/admin/AmwareAdminBrand#AmwareAdminDashboard',
      ],
      beforeLogin: [
        '@/components/admin/AmwareAdminBrand#AmwareAdminLoginIntro',
      ],
      beforeNav: ['@/components/admin/AmwareAdminBrand#AmwareAdminNavBrand'],
      graphics: {
        Icon: '@/components/admin/AmwareAdminBrand#AmwareAdminIcon',
        Logo: '@/components/admin/AmwareAdminBrand#AmwareAdminLogo',
      },
    },
    meta: {
      icons: {
        icon: '/favicon.ico',
      },
      titleSuffix: ' - Amware Admin',
    },
    user: Users.slug,
  },
  collections: [
    Users,
    Media,
    Articles,
    Projects,
    Products,
    Courses,
    Lessons,
    Services,
    ContactSubmissions,
    Purchases,
  ],
  globals: [PricingPage],
  editor: lexicalEditor(),
  endpoints: [creemPriceEndpoint],
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
      /* Supabase's session-mode pooler (port 5432) caps the whole project at
         15 client connections, shared by every process that connects.
         node-postgres defaults to max 10 per pool, and `next build` fans out
         one worker per core -- each with its own pool -- so the build asks
         for several times the ceiling and dies with EMAXCONNSESSION part way
         through prerendering. It gets worse with every page added to
         generateStaticParams, which is a nasty way to find out.

         The adapter keeps one pooled connection for good (connectWithReconnect
         never releases it), so a pool of N leaves N - 1 usable. Two is enough
         to build: prerendering only reads, in sequence. A save needs two
         usable, because it holds one for its transaction while Payload's
         document-lock check queries outside that transaction; with only one,
         every admin save deadlocks. So three at runtime.

         Raise it with DATABASE_POOL_MAX if the pooler plan grows, and keep
         workers x max under the ceiling. It applies to builds too. */
      max: Number(
        process.env.DATABASE_POOL_MAX ??
          (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD ? 2 : 3)
      ),
      // Hand connections back quickly rather than parking them while another
      // build worker waits for one.
      idleTimeoutMillis: 10_000,
    },
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        media: true,
      },
      bucket: process.env.S3_BUCKET || '',
      config: {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION,
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
      },
    }),
  ],
})
