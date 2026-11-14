import type { CalEvent } from './calcom'
import type { LeadTrack } from './calcom'
import { normalizeEmail, stageFor } from './calcom'
import { withLeadLock } from './lock'
import { advanceStage } from './stages'

/* Writes to the Leads list. One lead per email, created or updated, never
   duplicated. Booking answers fill the profile; the notes, the fit call and
   any stage set by hand stay the owner's. Each write holds the lead lock
   (lock.ts), so two events for one person never overwrite each other.
   `payload` is Payload's local API (or a fake with the same
   find/create/update in tests). */

type PayloadLike = {
  find: (args: any) => Promise<{ docs: any[] }>
  create: (args: any) => Promise<any>
  update: (args: any) => Promise<any>
}

const COLLECTION = 'leads'

/* Every query inside the lock runs on its connection. */
const onTx = (tx: { req?: any }) => (tx.req ? { req: tx.req } : {})

async function findLead(
  payload: PayloadLike,
  email: string,
  tx: { req?: any }
) {
  const { docs } = await payload.find({
    collection: COLLECTION,
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    ...onTx(tx),
  })
  return docs[0] ?? null
}

/** Keeps the array items' ids so Payload updates them in place. */
const callsOf = (lead: any): any[] =>
  Array.isArray(lead?.calls) ? lead.calls.map((c: any) => ({ ...c })) : []

type Result = 'created' | 'updated' | 'unchanged' | 'ignored'

/** Filled in by recordCalEvent: whether this booking gave the lead its
    first intro call, the one that earns the free downloads. A retried,
    late or out-of-order BOOKING_CREATED, or a re-booking after a cancel,
    finds an intro call already there and earns nothing twice. */
export type RecordMeta = { firstIntro?: boolean }

export async function recordCalEvent(
  payload: PayloadLike,
  event: CalEvent,
  meta: RecordMeta = {}
): Promise<Result> {
  if (event.action === 'ignored') return 'ignored'
  return withLeadLock(payload, event.email, (tx) =>
    applyCalEvent(payload, event, tx, meta)
  )
}

async function applyCalEvent(
  payload: PayloadLike,
  event: Exclude<CalEvent, { action: 'ignored' }>,
  tx: { req?: any },
  meta: RecordMeta = {}
): Promise<Result> {
  const lead = await findLead(payload, event.email, tx)

  if (event.action === 'ended') {
    if (!lead) return 'ignored'
    const calls = callsOf(lead)
    const call = calls.find((c) => c.bookingUid === event.bookingUid)
    if (!call) return 'ignored'
    call.status = 'completed'
    const next = stageFor(call.kind, 'ended')
    await payload.update({
      collection: COLLECTION,
      id: lead.id,
      data: {
        calls,
        ...(next ? { stage: advanceStage(lead.stage, next) } : {}),
      },
      ...onTx(tx),
    })
    return 'updated'
  }

  const { call } = event
  const calls = callsOf(lead)
  const matchUid =
    event.action === 'rescheduled' && call.previousUid
      ? call.previousUid
      : call.bookingUid
  const existing =
    calls.find((c) => c.bookingUid === matchUid) ??
    calls.find((c) => c.bookingUid === call.bookingUid)

  if (event.action === 'cancelled') {
    if (!existing) return lead ? 'unchanged' : 'ignored'
    if (existing.status === 'cancelled') return 'unchanged'
    existing.status = 'cancelled'
    await payload.update({
      collection: COLLECTION,
      id: lead.id,
      data: { calls },
      ...onTx(tx),
    })
    return 'updated'
  }

  // Booked or rescheduled. A retried BOOKING_CREATED changes nothing.
  if (event.action === 'booked' && existing) return 'unchanged'
  meta.firstIntro =
    event.action === 'booked' &&
    call.kind === 'intro' &&
    !calls.some((c) => c.kind === 'intro')
  if (existing) {
    existing.bookingUid = call.bookingUid
    existing.startsAt = call.startsAt
    existing.status = 'rescheduled'
  } else {
    calls.push({
      kind: call.kind,
      status: event.action === 'rescheduled' ? 'rescheduled' : 'booked',
      startsAt: call.startsAt,
      bookingUid: call.bookingUid,
    })
  }

  const next = stageFor(call.kind, 'booked')
  const profile = {
    ...(event.phone ? { phone: event.phone } : {}),
    ...event.answers,
  }

  if (!lead) {
    await payload.create({
      collection: COLLECTION,
      data: {
        email: event.email,
        name: event.name,
        source: 'calcom',
        track: event.track,
        stage: next ?? 'contacted',
        ...profile,
        calls,
      },
      ...onTx(tx),
    })
    return 'created'
  }

  /* An email sign-up (the AI search checklist) has only the address to
     name the lead with; the booking's real name replaces it. A name typed
     by hand or from an earlier booking stays. */
  const unnamed = !lead.name || normalizeEmail(lead.name) === lead.email
  /* The first booking decides the track: it is a stronger signal than a
     download or a contact-form message. After that it stays, so a
     consulting lead who later books the build call stays consulting unless
     it is changed by hand. */
  const firstBooking = callsOf(lead).length === 0
  await payload.update({
    collection: COLLECTION,
    id: lead.id,
    data: {
      ...(unnamed && event.name ? { name: event.name } : {}),
      ...(!lead.track || firstBooking ? { track: event.track } : {}),
      ...profile,
      calls,
      ...(next ? { stage: advanceStage(lead.stage, next) } : {}),
    },
    ...onTx(tx),
  })
  return 'updated'
}

/** A contact-form message starts a lead at "Contacted", or leaves the lead
    already there for that email as it is. */
export async function recordContact(
  payload: PayloadLike,
  {
    name,
    email,
    message,
    track = 'consulting',
  }: { name: string; email: string; message?: string; track?: LeadTrack }
): Promise<'created' | 'unchanged'> {
  const address = normalizeEmail(email)
  if (!address) return 'unchanged'
  return withLeadLock(payload, address, async (tx) => {
    if (await findLead(payload, address, tx)) return 'unchanged'
    await payload.create({
      collection: COLLECTION,
      data: {
        email: address,
        name: name || address,
        source: 'contact-form',
        stage: 'contacted',
        track,
        ...(message ? { helpWith: message } : {}),
      },
      ...onTx(tx),
    })
    return 'created'
  })
}
