# Whop Pixel events

The pixel snippet lives in `src/lib/analytics/whop-pixel.ts` and is rendered
into `<head>` by `src/app/(site)/layout.tsx`. Every event name lives in
`src/lib/analytics/whop.ts` (`WHOP_EVENT`); fire one with `whopTrack()`.

| Event            | Kind     | Fires from                                                                                                                     | `event_id`                                                 | Customer fields                              |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------- |
| `page`           | standard | head snippet on load; `WhopRouteEvents` on every client-side navigation                                                        | none                                                       | none                                         |
| `view_content`   | standard | `TrackView` on blog posts, articles, courses, kits, `/pricing`, `/services`                                                    | none                                                       | `content_type`, `content_id`, `content_name` |
| `lead`           | standard | `ContactForm` success handler                                                                                                  | `contact_<submission id>`                                  | `name`, `email`                              |
| `begin_checkout` | custom   | `BuyButton` `onSubmit`, before the redirect to Creem; `DepositCheckout` when the deposit sheet opens (`content_type: deposit`) | none (each press is an attempt)                            | `value`, `content_*`                         |
| `purchase`       | standard | `TrackPurchase` on `/checkout/success?r=` (downloads, unsigned); not on kits, whose signed link carries no pixel               | Creem `request_id`                                         | `value` (required, > 0), `currency`          |
| `kit_claimed`    | custom   | `ClaimFreeKit` when the claim succeeds                                                                                         | `free:<slug>:<username>` (the claim's own idempotency key) | `email`, `content_*`                         |
| `schedule`       | standard | `BookCallButton` on Cal.com's `bookingSuccessfulV2`                                                                            | booking `uid`                                              | `content_name`                               |

Rules that shaped this, from Whop's docs (`docs.whop.com/developer/ads/pixel`):

- **Never fire `purchase` for a sale Whop processed.** Creem is not Whop, so
  kit and download sales are the "own checkout" case Whop documents. The
  engagement deposits ARE Whop checkouts (`DepositCheckout`): Whop records
  and reports those itself, so nothing here fires `purchase` for them.
- **No pixel on a bearer link.** Nothing fires under `/access`, or on the
  signed `/checkout/onboarding?r=&s=` link, so Creem kit sales and upgrades
  never reach Whop. Whop's own `?ref=` and `?payment_id=` returns to that page
  keep the pixel. See `src/lib/analytics/privatePaths.js`.
- **`purchase` needs a positive `value`.** `whopTrack` refuses to send one
  without it rather than let it fail on Whop's side.
- **`event_id` is per conversion, not per type.** Whop counts each
  `(name, event_id)` once, which is what makes a page refresh, a retried form
  or a re-sent claim collapse into one event. Use an id the system already
  has; never invent one at fire time.
- **Customer fields are plain text.** A hashed email is dropped as invalid.
- Whop sends with `keepalive`, so firing just before a redirect is safe.

Verifying: open `whop.com/dashboard/biz_PGSOCOwANQSket/websites`, walk the
funnel on the site, and watch the events arrive against the domain.
