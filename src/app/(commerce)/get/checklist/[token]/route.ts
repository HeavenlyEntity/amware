import { getPayloadClient } from '@/lib/getPayloadClient'
import { readChecklistToken } from '@/lib/checklist-link'
import { AI_SEARCH_CHECKLIST_SUBJECT } from '@/lib/contact-intents'
import { recordContact } from '@/lib/leads/record'
import { AI_SEARCH_CHECKLIST } from '@/content/site/ai-search-checklist'

export const dynamic = 'force-dynamic'

/* The AI search checklist's emailed link (owner decision 2026-11-14).
   Opening it shows one button; pressing it proves a person owns the inbox,
   so that POST is where the sign-up joins the Leads list (Build & support)
   before forwarding to the PDF. The button matters: mail security scanners
   open every link in a message, but they do not submit forms, so a scan
   never makes a lead. A token we did not sign, or one for any other
   submission, is a 404. A failed lead write is logged and the PDF still
   opens. Rotating PAYLOAD_SECRET retires every link already sent. */

type Ctx = { params: Promise<{ token: string }> }

async function submissionFor(token: string) {
  let id: string | null = null
  try {
    id = readChecklistToken(token)
  } catch {
    id = null
  }
  if (!id) return null
  try {
    const payload = await getPayloadClient()
    const doc: any = await payload.findByID({
      collection: 'contact-submissions',
      id: Number(id),
      depth: 0,
    })
    return doc?.subject === AI_SEARCH_CHECKLIST_SUBJECT
      ? { payload, doc }
      : null
  } catch {
    return null
  }
}

const notFound = () => new Response('Not found', { status: 404 })

const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Your checklist · AMWARE</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d1013;color:#e4e4e7;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
  main{max-width:26rem;padding:32px 24px;text-align:center}
  p.k{font:600 11px/1 ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase;color:#3ce8ce;margin:0}
  h1{margin:10px 0 8px;font-size:1.5rem;color:#fafafa}
  p{color:#a1a1aa;line-height:1.5}
  button{margin-top:16px;min-height:44px;padding:0 22px;border:0;border-radius:999px;background:#3ce8ce;color:#09090b;font-weight:700;font-size:15px;cursor:pointer}
  button:focus-visible{outline:2px solid #fafafa;outline-offset:3px}
</style></head>
<body><main>
<p class="k">AMWARE · Free checklist</p>
<h1>Does AI name your business?</h1>
<p>Your three-page checklist is ready.</p>
<form method="post"><button type="submit">Open the checklist</button></form>
</main></body></html>`

export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params
  if (!(await submissionFor(token))) return notFound()
  return new Response(PAGE, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex',
    },
  })
}

export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params
  const found = await submissionFor(token)
  if (!found) return notFound()
  const { payload, doc } = found
  try {
    await recordContact(payload as any, {
      name: doc.name,
      email: doc.email,
      message: doc.message,
      track: 'build',
    })
  } catch (err) {
    console.error('Recording the checklist lead failed:', err)
  }
  return Response.redirect(new URL(AI_SEARCH_CHECKLIST.pdfPath, req.url), 303)
}
