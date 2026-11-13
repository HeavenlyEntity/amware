import { getPayloadClient } from '@/lib/getPayloadClient'
import { parseCalEvent, verifyCalSignature } from '@/lib/leads/calcom'
import { recordCalEvent } from '@/lib/leads/record'

export const dynamic = 'force-dynamic'

/* Cal.com → the Leads list. Subscribed triggers: Booking Created, Booking
   Rescheduled, Booking Cancelled and Meeting Ended, on the intro and
   strategy calls. The secret set on the webhook in Cal.com is
   CALCOM_WEBHOOK_SECRET here. Anything unsigned is refused; anything signed
   but not about a lead is acknowledged and dropped, so Cal.com does not
   retry it. */
export async function POST(req: Request) {
  const raw = await req.text()
  if (raw.length > 65536) {
    return new Response('Payload too large', { status: 413 })
  }
  if (!verifyCalSignature(raw, req.headers.get('x-cal-signature-256'))) {
    return new Response('Invalid signature', { status: 401 })
  }

  let body
  try {
    body = JSON.parse(raw)
  } catch {
    return new Response('Bad JSON', { status: 400 })
  }

  const event = parseCalEvent(body)
  if (event.action === 'ignored') {
    return Response.json({ ok: true, result: 'ignored' })
  }

  try {
    const payload = await getPayloadClient()
    const result = await recordCalEvent(payload as any, event)
    return Response.json({ ok: true, result })
  } catch (err) {
    console.error('Cal.com lead webhook failed:', err)
    // A 500 lets any retry through, and a retry is safe: recording is idempotent.
    return new Response('Could not record the lead', { status: 500 })
  }
}
