import { getPayloadClient } from '@/lib/getPayloadClient'
import { getOnly, handleRenewalJob } from '@/lib/commerce/renewalJob'

/* The daily renewal job. Vercel's schedule calls it with GET and
   `Authorization: Bearer <CRON_SECRET>`; anyone else is refused. Never
   cached. Every other method is a JSON 405. */
export const dynamic = 'force-dynamic'

export const GET = (request) => handleRenewalJob(request, getPayloadClient)

export const POST = getOnly
export const PUT = getOnly
export const PATCH = getOnly
export const DELETE = getOnly
export const HEAD = getOnly
export const OPTIONS = getOnly
