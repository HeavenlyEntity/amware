import Link from 'next/link'
import { DepositCheckout } from '@/components/commerce/DepositCheckout'
import { SlashEyebrow } from '@/components/diagnostic/diagnostic-sections'
import { DIAGNOSTIC } from '@/content/site/codebase-diagnostic'
import { depositPlanId } from '@/lib/commerce/whopEnv'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { DIAGNOSTIC_SLUG } from '@/lib/services/deposit-terms'
import '@/styles/services.css'
import '@/styles/diagnostic.css'

/* The row can be published or changed at any time, and this page must not be
   cached at build. */
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Reserve your Diagnostic',
  robots: { index: false, follow: true },
}

/* /services/codebase-diagnostic/reserve: the link I send by hand after two
   calls. It hosts the existing deposit sheet for the one Diagnostic row and
   prints no figure; the sheet shows the amount before anything is charged.
   Nothing links here: not the nav, the sitemap, the public page or the AI
   documents. Any problem (no row, no plan for this Whop environment, a
   failed read) shows a "get in touch" fallback, never a dead button. */

async function loadDiagnosticRow() {
  try {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'services',
      where: {
        and: [
          { slug: { equals: DIAGNOSTIC_SLUG } },
          { status: { equals: 'published' } },
        ],
      },
      depth: 0,
      limit: 1,
    })
    return docs[0] ?? null
  } catch (err) {
    console.error('Diagnostic reserve lookup failed', err)
    return null
  }
}

export default async function DiagnosticReservePage() {
  const { reserve } = DIAGNOSTIC
  const row = await loadDiagnosticRow()
  const plan = row ? depositPlanId(row) : null

  return (
    <div className="amw svc dg">
      <section aria-labelledby="dg-reserve-title" className="svc-wrap">
        <div className="dg-reserve">
          <SlashEyebrow text={reserve.kicker} />
          <h1 id="dg-reserve-title" className="svc-hero-title">
            {plan ? reserve.title : reserve.fallbackTitle}
          </h1>
          {plan ? (
            <>
              <p className="svc-hero-lede">{reserve.lede}</p>
              <div className="dg-reserve-action">
                <DepositCheckout
                  planId={plan}
                  serviceName={row.name}
                  serviceSlug={DIAGNOSTIC_SLUG}
                  amount={
                    typeof row.depositAmount === 'number'
                      ? row.depositAmount
                      : 1500
                  }
                  bookingUrl={row.bookingUrl || null}
                  className="amw-cta svc-cta"
                >
                  <span>{reserve.cta}</span>
                </DepositCheckout>
              </div>
            </>
          ) : (
            <>
              <p className="svc-hero-lede">{reserve.fallbackCopy}</p>
              <div className="dg-reserve-action">
                <Link href="/contact" className="amw-cta svc-cta">
                  <span>{reserve.fallbackCta}</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
