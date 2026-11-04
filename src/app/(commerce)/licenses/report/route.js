import { getPayloadClient } from '@/lib/getPayloadClient'
import { handleReport, methodNotAllowed } from '@/lib/commerce/licenseReport'

/* A deployed kit reports its NetSuite account here. Public and uncached, with
   no CORS headers: only a deploy script calls it. Rate limiting is a Vercel
   Firewall rule, not code. Only POST answers; every other method is a JSON
   405. */
export const dynamic = 'force-dynamic'

export const POST = (request) => handleReport(request, getPayloadClient)

export const GET = methodNotAllowed
export const PUT = methodNotAllowed
export const PATCH = methodNotAllowed
export const DELETE = methodNotAllowed
export const HEAD = methodNotAllowed
export const OPTIONS = methodNotAllowed
