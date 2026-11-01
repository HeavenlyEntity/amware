import { getPayloadClient } from '@/lib/getPayloadClient'
import { handleStatus, methodNotAllowed } from '@/lib/commerce/licenseReport'

/* `warekit license status` asks what a key covers here. Public and uncached,
   with no CORS headers. Rate limiting is a Vercel Firewall rule, not code.
   Only POST answers; every other method is a JSON 405. */
export const dynamic = 'force-dynamic'

export const POST = (request) => handleStatus(request, getPayloadClient)

export const GET = methodNotAllowed
export const PUT = methodNotAllowed
export const PATCH = methodNotAllowed
export const DELETE = methodNotAllowed
export const HEAD = methodNotAllowed
export const OPTIONS = methodNotAllowed
