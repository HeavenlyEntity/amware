# /services: tracks, studio testimonials and the website-build section — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/services` gets two tabs, **Consulting** and **Build & support**, driven by a new Payload `category` field. The Build & support tab carries the studio template's hover micro-interaction section. Below the tabs go the template's testimonial bento and wall. The template's placeholder testimonials render only in dev and on previews; production renders the four real ones.

**Architecture:**

- **Pure modules** do the logic: grouping services by track, choosing testimonials by environment, and holding the copy. They are unit-tested in isolation.
- **Template components** are ported from TSX to the site's JSX by compiler type-stripping, then edited for brand, honesty and accessibility.
- **The services page** stays a server component. It hands server-rendered panels to one small client tab component.

**Tech Stack:** Next.js 16 App Router, React 19 (JSX components), Payload 3 on Postgres, `motion/react`, three.js through `@react-three/fiber` and `drei`, Tailwind CSS 4, and Vitest with Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-25-services-template-port-design.md`. Read it before starting.

**Template (read-only source):** `/Users/mipi-founder/Documents/GitHub/templates/design-development-studio-template`, referred to below as `$T`.

## Global Constraints

These apply to every task.

**Project rules**

- **Repo and branch:** work in `/Users/mipi-founder/Documents/GitHub/my-next-spotlight`, on branch `services-testimonials`.
- **Never start a dev server.** Never run `pnpm dev` or `pnpm sim`. Never read `.env.local`.
- **`motion` comes from `motion/react`**, never `framer-motion`, and only in client components.
- **Components are `.jsx`.** Only `src/collections/*.ts`, `src/payload-types.ts` and `src/app/(site)/services/page.tsx` stay TypeScript.
- **Reduced motion:** always use `useReducedMotion` from `@/components/AccessibilityProvider`. It covers the OS setting and the footer's "Pause continuous animations". Never use motion's own `useReducedMotion`.
- **No `setState` inside an effect body.** ESLint's `react-hooks/set-state-in-effect` is active. Read browser state with `useSyncExternalStore`, the pattern in `src/hooks/use-client-value.js`. `useMounted()` from that file is true only after hydration.

**Honesty rules**

- **Placeholder testimonials never render in production.** Selection goes only through `showPlaceholders({ nodeEnv, vercelEnv })`, which is true only when `nodeEnv === 'development'` or `vercelEnv === 'preview'`.
- **No stock or generated faces for real people.** Real people show initials. The consultation card uses Alec's own photo (`@/images/photos/at-the-desk.jpg`, alt text on the About page: "Alec at his desk mid-thought"), not the template's stock webcam person. This is the spec's Photos rule applied to the call mock.
- **None of the template's fake social proof survives.** That means no "Trusted by 100+ companies", no company logos, and no globe markers.
- **Illustrations are decoration.** The root element gets `aria-hidden="true"`, and nothing inside is tabbable. Mock buttons get `tabIndex={-1}`, and mock links become `<span>`s.

**Styling map.** Template → site:

| Template                                       | Site                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| `bg-primary` on small UI                       | `bg-[var(--amw-accent)]` with `text-zinc-950`                    |
| `text-primary`, `[color:var(--color-primary)]` | `text-[var(--amw-accent-ink)]`                                   |
| `bg-gray-100` cards                            | `bg-[var(--amw-muted)]`                                          |
| `bg-white` quote cards                         | `bg-[var(--amw-card)]`                                           |
| `ring-black/10` on quote cards                 | `ring-[var(--amw-line)]`                                         |
| `font-display`, `font-body` on body-size text  | removed, so the site default applies                             |
| headings                                       | keep the landing's `style={{ fontFamily: 'Layer, sans-serif' }}` |
| `text-foreground`                              | `text-zinc-900 dark:text-zinc-100`                               |

The featured testimonial card deviates from the spec. It is **`bg-zinc-950` with `dark:ring-1 dark:ring-white/10`**, not `--amw-ink`, because `--amw-ink` flips to `#f4f4f5` in dark mode and would put white text on a near-white card. Illustration mock UIs keep the template's neutral palette: they are pictures of screens.

**Tests**

- **Vitest projects:**
  - **`engine`:** `src/lib/**/__tests__/**/*.test.js`. Node environment, relative imports only.
  - **`ui`:** `src/components/**/__tests__/**/*.test.jsx` and `src/app/**/__tests__/**/*.test.jsx`. jsdom, with the `@/` alias.
- **What the `ui` setup stubs:**
  - `next/image` renders an `<img>` with `src` as a string.
  - `IntersectionObserver` reports every element in view on the next tick.
  - `matchMedia` reports `matches: false`.

**Every task, before its commit**

- `npx vitest run <its test files>`
- `npx eslint <changed files>`
- `npx prettier --write <changed files>`, never `pnpm-lock.yaml`
- `npx tsc --noEmit`

Commits use gitmoji, and every message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Database.** The `category` column is created by the **owner**, with the SQL in the spec's "Database" section, before the preview check and before merge. No task applies DDL.

## File map

| File                                                                                                                        | Status      | Responsibility                                                         |
| --------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------- |
| `src/lib/services/tracks.js`                                                                                                | new         | Track ids, labels and hashes, plus `groupServices` and `trackFromHash` |
| `src/collections/Services.ts`                                                                                               | edit        | The `category` select field                                            |
| `src/payload-types.ts`                                                                                                      | edit        | Hand-edited `category` types                                           |
| `src/app/(site)/page.jsx`                                                                                                   | edit        | Homepage services query filtered to consulting                         |
| `src/components/services/service-tracks.jsx`                                                                                | new         | Client tabs, with hash deep links and hidden panels                    |
| `src/content/site/testimonial-placeholders.js`                                                                              | new         | The template's nine placeholder testimonials (dev and preview only)    |
| `src/lib/testimonials/services-testimonials.js`                                                                             | new         | `showPlaceholders` and `servicesTestimonials`                          |
| `src/components/ui/pattern.jsx`                                                                                             | new         | The template's diagonal hatch                                          |
| `src/components/testimonials/avatar.jsx`                                                                                    | new         | Photo or initials                                                      |
| `src/components/testimonials/masonry-grid.js`                                                                               | new         | `masonryGridColsClass`                                                 |
| `src/components/testimonials/big-testimonial.jsx`                                                                           | new         | The bento                                                              |
| `src/components/testimonials/masonry-testimonials.jsx`                                                                      | new         | The wall                                                               |
| `src/components/website-package/{icons,grid-lines,keyboard,designing,microinteractions,copywriting,consultation,globe}.jsx` | new, ported | Illustrations                                                          |
| `src/components/website-package/globe-card.jsx`                                                                             | new         | Lazy, client-only, still-or-slow globe                                 |
| `src/content/site/website-package.js`                                                                                       | new         | The section's copy, awaiting owner sign-off                            |
| `src/components/website-package/index.jsx`                                                                                  | new         | The website-build section                                              |
| `src/app/(site)/services/page.tsx`                                                                                          | edit        | Tabs, then the section, then the testimonials                          |
| `next.config.mjs`                                                                                                           | edit        | Scoped `images.remotePatterns`                                         |
| `src/components/ui/testimonials-with-carousel.jsx` and its test                                                             | delete      | Replaced by the bento and the wall                                     |

---

### Task 1: The `category` field, `groupServices`, and the homepage filter

**Files:**

- Create: `src/lib/services/tracks.js`
- Test: `src/lib/services/__tests__/tracks.test.js`
- Modify: `src/collections/Services.ts` (the `status` field at the end of `fields`, and `admin.defaultColumns`)
- Modify: `src/payload-types.ts` (the `Service` interface, line 489 `status?:`, and `ServicesSelect`, line 923 `status?: T`)
- Modify: `src/app/(site)/page.jsx:74-80`, the `payload.find({ collection: 'services', … })` call

**Interfaces:**

- Produces:

  - `SERVICE_TRACKS: Array<{ id: 'consulting'|'technical', label: string, hash: string }>`
  - `groupServices(docs = []) => { consulting: Doc[], technical: Doc[] }`
  - `trackFromHash(hash: string) => 'consulting'|'technical'|null`

- [ ] **Step 1: Write the failing test.** Create `src/lib/services/__tests__/tracks.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { SERVICE_TRACKS, groupServices, trackFromHash } from '../tracks.js'

describe('groupServices', () => {
  it('splits services by category and keeps their order', () => {
    const { consulting, technical } = groupServices([
      { slug: 'advisor', category: 'consulting' },
      { slug: 'site', category: 'technical' },
      { slug: 'cto', category: 'consulting' },
    ])
    expect(consulting.map((d) => d.slug)).toEqual(['advisor', 'cto'])
    expect(technical.map((d) => d.slug)).toEqual(['site'])
  })

  it('treats a missing or unknown category as consulting', () => {
    const { consulting, technical } = groupServices([
      { slug: 'a' },
      { slug: 'b', category: 'mystery' },
    ])
    expect(consulting.map((d) => d.slug)).toEqual(['a', 'b'])
    expect(technical).toEqual([])
  })

  it('copes with no services', () => {
    expect(groupServices()).toEqual({ consulting: [], technical: [] })
  })
})

describe('tracks', () => {
  it('labels the stored values for the tabs', () => {
    expect(SERVICE_TRACKS.map((t) => [t.id, t.label, t.hash])).toEqual([
      ['consulting', 'Consulting', 'consulting'],
      ['technical', 'Build & support', 'build-support'],
    ])
  })

  it('reads a track from the URL hash', () => {
    expect(trackFromHash('#build-support')).toBe('technical')
    expect(trackFromHash('consulting')).toBe('consulting')
    expect(trackFromHash('#nope')).toBeNull()
    expect(trackFromHash('')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails.**
      Run: `npx vitest run src/lib/services/__tests__/tracks.test.js`
      Expected: FAIL, "Failed to resolve import ../tracks.js".

- [ ] **Step 3: Implement.** Create `src/lib/services/tracks.js`:

```js
/* The two ways into an engagement on /services, and which services sit
   under each. The value is stored on the Service (Payload `category`); the
   label is only ever displayed, so it can change without a migration. */

export const SERVICE_TRACKS = [
  { id: 'consulting', label: 'Consulting', hash: 'consulting' },
  { id: 'technical', label: 'Build & support', hash: 'build-support' },
]

const KNOWN = new Set(SERVICE_TRACKS.map((t) => t.id))

/* Anything without a known category counts as consulting: every service
   that existed before the field did is a consulting retainer. Input order
   is kept, and Payload already sorts by `order`. */
export function groupServices(docs = []) {
  const groups = { consulting: [], technical: [] }
  for (const doc of docs) {
    groups[KNOWN.has(doc?.category) ? doc.category : 'consulting'].push(doc)
  }
  return groups
}

export function trackFromHash(hash) {
  const clean = String(hash || '').replace(/^#/, '')
  return SERVICE_TRACKS.find((t) => t.hash === clean)?.id ?? null
}
```

- [ ] **Step 4: Run the test to confirm it passes.**
      Run: `npx vitest run src/lib/services/__tests__/tracks.test.js`
      Expected: PASS, 5 tests.

- [ ] **Step 5: Add the field.** In `src/collections/Services.ts`, the last field is `status` (`defaultValue: 'draft'`, `admin: { position: 'sidebar' }`). Append this after it, inside `fields`:

```ts
    {
      name: 'category',
      type: 'select',
      required: true,
      defaultValue: 'consulting',
      options: [
        { label: 'Consulting', value: 'consulting' },
        { label: 'Build & support', value: 'technical' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Which /services tab this engagement sits under.',
      },
    },
```

Then change `defaultColumns: ['name', 'startingPrice', 'priceLabel', 'status', 'order']` to `defaultColumns: ['name', 'startingPrice', 'priceLabel', 'status', 'category', 'order']`.

- [ ] **Step 6: Hand-edit the types.** `pnpm generate:types` is broken in this repo, so edit `src/payload-types.ts` directly.

  In `export interface Service`, directly after the line `status?: ('draft' | 'published') | null`, add:

```ts
/**
 * Which /services tab this engagement sits under.
 */
category: 'consulting' | 'technical'
```

In `export interface ServicesSelect<T extends boolean = true>`, directly after `status?: T`, add `category?: T`.

- [ ] **Step 7: Filter the homepage to consulting.** In `src/app/(site)/page.jsx`, change the services query to:

```js
      payload.find({
        collection: 'services',
        /* The homepage's retainer offers are the Consulting track only; a
           Build & support service belongs on /services' other tab. */
        where: {
          status: { equals: 'published' },
          category: { equals: 'consulting' },
        },
        sort: 'order',
        depth: 0,
        limit: 6,
      }),
```

- [ ] **Step 8: Verify.**
      Run: `npx vitest run src/lib/services/__tests__/tracks.test.js && npx tsc --noEmit && npx eslint src/lib/services "src/app/(site)/page.jsx"`
      Then run: `npx prettier --write src/lib/services src/collections/Services.ts src/payload-types.ts "src/app/(site)/page.jsx"`
      Expected: all pass, and `tsc` reports no errors.

- [ ] **Step 9: Commit.**

```bash
git add src/lib/services src/collections/Services.ts src/payload-types.ts "src/app/(site)/page.jsx"
git commit -m "$(printf '%s\n\n%s\n\n%s\n' "✨ feat(services): categorise services as Consulting or Build & support" "A required Payload select, defaulting to consulting, plus groupServices() and trackFromHash() for the /services tabs. The homepage offers read the Consulting track only. The column is the owner's SQL, in the spec." "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>")"
```

---

### Task 2: The Consulting and Build & support tabs on /services

**Files:**

- Create: `src/components/services/service-tracks.jsx`
- Test: `src/components/services/__tests__/service-tracks.test.jsx`
- Modify: `src/app/(site)/services/page.tsx`

**Interfaces:**

- Consumes:
  - `SERVICE_TRACKS` and `trackFromHash` from `@/lib/services/tracks` (Task 1)
  - `OfferTabs({ id, tabs, value, onChange, label })` and `offerPanelProps(id, tabId)` from `@/components/landing/offer-tabs`
- Produces: `ServiceTracks({ panels: { consulting: ReactNode, technical: ReactNode } })`

- [ ] **Step 1: Write the failing test.** Create `src/components/services/__tests__/service-tracks.test.jsx`:

```jsx
import { afterEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ServiceTracks } from '../service-tracks'

/* A buyer lands on /services and picks the track that is theirs. Both
   panels are in the page for search engines; only the chosen one shows,
   and the choice lives in the URL hash so a link can open either. */

const panels = {
  consulting: <p>Retainer cards</p>,
  technical: <p>Website build section</p>,
}

const panelOf = (text) => screen.getByText(text).closest('[role="tabpanel"]')

afterEach(() => window.history.replaceState(null, '', '/'))

describe('ServiceTracks', () => {
  it('opens on Consulting, with Build & support in the page but hidden', () => {
    render(<ServiceTracks panels={panels} />)
    expect(screen.getByRole('tab', { name: 'Consulting' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByText('Retainer cards')).toBeVisible()
    expect(panelOf('Website build section')).toHaveAttribute('hidden')
  })

  it('switches track and records the choice in the hash', () => {
    render(<ServiceTracks panels={panels} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Build & support' }))
    expect(
      screen.getByRole('tab', { name: 'Build & support' })
    ).toHaveAttribute('aria-selected', 'true')
    expect(panelOf('Website build section')).not.toHaveAttribute('hidden')
    expect(panelOf('Retainer cards')).toHaveAttribute('hidden')
    expect(window.location.hash).toBe('#build-support')
  })

  it('opens the tab a link points at', () => {
    window.history.replaceState(null, '', '/#build-support')
    render(<ServiceTracks panels={panels} />)
    expect(
      screen.getByRole('tab', { name: 'Build & support' })
    ).toHaveAttribute('aria-selected', 'true')
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails.**
      Run: `npx vitest run src/components/services/__tests__/service-tracks.test.jsx`
      Expected: FAIL, "Failed to resolve import ../service-tracks".

- [ ] **Step 3: Implement.** Create `src/components/services/service-tracks.jsx`:

```jsx
'use client'

import { useId, useSyncExternalStore } from 'react'
import { OfferTabs, offerPanelProps } from '@/components/landing/offer-tabs'
import { SERVICE_TRACKS, trackFromHash } from '@/lib/services/tracks'

/* /services splits into two tracks, using the homepage's accessible
   "Two Ways In" tabs. Unlike the homepage, both panels stay in the HTML and
   only the inactive one is hidden, so the Build & support content is
   still there for search engines.

   The selected tab is the URL hash, read as an external store: a link to
   #build-support opens that tab, and clicking a tab rewrites the hash with
   replaceState (no history entry, no scroll jump) and tells the store. */

const TRACK_EVENT = 'amw:service-track'

function subscribe(onChange) {
  window.addEventListener('hashchange', onChange)
  window.addEventListener(TRACK_EVENT, onChange)
  return () => {
    window.removeEventListener('hashchange', onChange)
    window.removeEventListener(TRACK_EVENT, onChange)
  }
}

const readHash = () => window.location.hash
const serverHash = () => ''

export function ServiceTracks({ panels }) {
  const id = useId()
  const hash = useSyncExternalStore(subscribe, readHash, serverHash)
  const tab = trackFromHash(hash) ?? SERVICE_TRACKS[0].id

  const choose = (next) => {
    const track = SERVICE_TRACKS.find((t) => t.id === next)
    window.history.replaceState(null, '', `#${track.hash}`)
    window.dispatchEvent(new Event(TRACK_EVENT))
  }

  return (
    <div className="mt-10 sm:mt-12">
      <div className="text-center">
        <OfferTabs
          id={id}
          tabs={SERVICE_TRACKS}
          value={tab}
          onChange={choose}
          label="Choose a track"
        />
      </div>
      {SERVICE_TRACKS.map((track) => (
        <div
          key={track.id}
          {...offerPanelProps(id, track.id)}
          hidden={tab !== track.id}
          className="mt-10 sm:mt-12"
        >
          {panels[track.id]}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run the test to confirm it passes.**
      Run: `npx vitest run src/components/services/__tests__/service-tracks.test.jsx`
      Expected: PASS, 3 tests.

- [ ] **Step 5: Use it on the page.** In `src/app/(site)/services/page.tsx`:

  First, add the imports:

```tsx
import { groupServices } from '@/lib/services/tracks'
import { ServiceTracks } from '@/components/services/service-tracks'
```

Next, after the `payload.find` call, add:

```tsx
const { consulting, technical } = groupServices(docs)
const cards = (list: typeof docs) => (
  <ul className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-8">
    {list.map((service, i) => (
      <ServiceCard
        key={service.id}
        service={service}
        index={i}
        description={
          <RichText data={service.description} className="prose-sm" />
        }
      />
    ))}
  </ul>
)
```

Then replace the whole `{docs.length === 0 ? (<StoreEmpty … />) : (<ul …>…</ul>)}` block with the following. The website-build section is added to `technical` in Task 7.

```tsx
<ServiceTracks
  panels={{
    consulting: consulting.length ? (
      cards(consulting)
    ) : (
      <StoreEmpty label="consulting engagements" />
    ),
    technical: technical.length ? cards(technical) : null,
  }}
/>
```

Leave the carousel and its imports alone. Task 4 replaces them.

- [ ] **Step 6: Verify.**
      Run: `npx vitest run src/components/services && npx tsc --noEmit && npx eslint src/components/services "src/app/(site)/services/page.tsx"`
      Then run: `npx prettier --write src/components/services "src/app/(site)/services/page.tsx"`
      Expected: all pass.

- [ ] **Step 7: Commit.**

```bash
git add src/components/services "src/app/(site)/services/page.tsx"
git commit -m "$(printf '%s\n\n%s\n\n%s\n' "✨ feat(services): Consulting and Build & support tabs on /services" "The homepage's accessible OfferTabs, with both panels kept in the HTML and the hash as the selection: #build-support opens that tab, and clicking a tab rewrites the hash with replaceState." "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>")"
```

---

### Task 3: Choosing the testimonials (placeholders in dev and preview only)

**Files:**

- Create: `src/content/site/testimonial-placeholders.js`
- Create: `src/lib/testimonials/services-testimonials.js`
- Test: `src/lib/testimonials/__tests__/services-testimonials.test.js`

**Interfaces:**

- Consumes: `testimonials` from `src/content/site/testimonials.js`. Each entry is `{ title, description, verbatim, name, role }`.
- Produces:

  - `showPlaceholders({ nodeEnv, vercelEnv } = {}) => boolean`
  - `servicesTestimonials(env) => { featured, supporting: { topLeft, bottomLeft, topRight, bottomRight }, wall }`
  - **Card shape:** `{ id, name, designation, excerpt, verbatim, image }`. `image` is a URL string or `null`, and placeholder cards also carry `placeholder: true`.
  - **Featured card:** a card plus `quote: string` and `partner: { name, letter, href } | null`.

- [ ] **Step 1: Write the failing test.** Create `src/lib/testimonials/__tests__/services-testimonials.test.js`:

```js
import { describe, expect, it } from 'vitest'
import {
  servicesTestimonials,
  showPlaceholders,
} from '../services-testimonials.js'

describe('showPlaceholders', () => {
  it.each([
    [{ nodeEnv: 'development' }, true],
    [{ nodeEnv: 'production', vercelEnv: 'preview' }, true],
    [{ nodeEnv: 'production', vercelEnv: 'production' }, false],
    [{ nodeEnv: 'production' }, false],
    [{ nodeEnv: 'test' }, false],
    [{}, false],
    [undefined, false],
  ])('%o → %s', (env, expected) => {
    expect(showPlaceholders(env)).toBe(expected)
  })
})

describe('servicesTestimonials in production', () => {
  const t = servicesTestimonials({
    nodeEnv: 'production',
    vercelEnv: 'production',
  })
  const all = [t.featured, ...Object.values(t.supporting), ...t.wall].filter(
    Boolean
  )

  it('shows only real people, with no stock photos', () => {
    expect(all.some((x) => x.placeholder)).toBe(false)
    expect(all.every((x) => x.image === null)).toBe(true)
  })

  it("features Mark's website-build quote, in full, with no partner pill", () => {
    expect(t.featured.name).toBe('Mark Schilling')
    expect(t.featured.quote).toMatch(/^I came in with a clear vision/)
    expect(t.featured.quote).toMatch(/not a website\.$/)
    expect(t.featured.partner).toBeNull()
  })

  it("keeps Dewayne's employment reference last", () => {
    expect(t.supporting.topLeft.name).toBe('Grace L.')
    expect(t.supporting.bottomLeft.name).toBe('Mike Pryke')
    expect(t.supporting.topRight).toBeNull()
    expect(t.supporting.bottomRight.name).toBe('Dewayne K.')
    expect(t.supporting.bottomRight.designation).toMatch(/Former supervisor/)
  })

  it('leaves the wall empty until there are more than four', () => {
    expect(t.wall).toEqual([])
  })
})

describe('servicesTestimonials on a preview', () => {
  const t = servicesTestimonials({
    nodeEnv: 'production',
    vercelEnv: 'preview',
  })

  it("uses the template's placeholder bento", () => {
    expect(t.featured.id).toBe(6)
    expect(t.featured.partner.name).toBe('Orbit Inference')
    expect(
      ['topLeft', 'bottomLeft', 'topRight', 'bottomRight'].map(
        (k) => t.supporting[k].id
      )
    ).toEqual([1, 8, 0, 5])
  })

  it('puts every other placeholder on the wall', () => {
    expect(t.wall.map((x) => x.id)).toEqual([2, 4, 7, 9])
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails.**
      Run: `npx vitest run src/lib/testimonials/__tests__/services-testimonials.test.js`
      Expected: FAIL, "Failed to resolve import ../services-testimonials.js".

- [ ] **Step 3: Create the placeholder data,** `src/content/site/testimonial-placeholders.js`. These fields are taken verbatim from `$T/constants/testimonials.tsx`; only Amelia Brooks's two-line JSX designation is joined with " · ".

```js
/* PLACEHOLDERS from the design-development-studio template's
   constants/testimonials.tsx: invented people, invented quotes, stock
   avatars. They exist so /services can be judged exactly as the template
   lays it out, and they are NEVER rendered in production:
   lib/testimonials/services-testimonials.js only selects them in local
   development and on Vercel previews. Shown to real buyers they would be
   fake reviews, which the FTC's rule on consumer reviews and testimonials
   prohibits.

   Real testimonials go in content/site/testimonials.js, never here. */

export const placeholderTestimonials = [
  {
    id: 0,
    excerpt:
      "The best front-end partner we've had. They took the brief and shipped a product our team is proud of.",
    name: 'Elena Vargas',
    designation: 'Founder at Northline',
    image: 'https://assets.aceternity.com/avatars/1.webp',
    placeholder: true,
  },
  {
    id: 1,
    excerpt:
      "Excellent communication and craft. Open to ideas, calm under scope changes, and we'd hire them again.",
    name: 'Marcus Chen',
    designation: 'CTO at Harbor Labs',
    image: 'https://assets.aceternity.com/avatars/2.webp',
    placeholder: true,
  },
  {
    id: 2,
    excerpt:
      'From a loose brief to a polished site in days. Strong taste, strong intuition, zero fluff.',
    name: 'Priya Nair',
    designation: 'President at Cobalt Analytics',
    image: 'https://assets.aceternity.com/avatars/3.webp',
    placeholder: true,
  },
  {
    id: 4,
    excerpt:
      'Development was flawless and they acted like partners, not vendors. Very happy we hired them.',
    name: 'Jonas Keller',
    designation: 'CMO at Fieldwork',
    image: 'https://assets.aceternity.com/avatars/4.webp',
    placeholder: true,
  },
  {
    id: 5,
    excerpt:
      'Talented, communicative, and fast across the board. Highly recommend.',
    name: 'Sofia Almeida',
    designation: 'Founder at Atelier Peak',
    image: 'https://assets.aceternity.com/avatars/5.webp',
    placeholder: true,
  },
  {
    id: 6,
    excerpt:
      'Turned our rough shell into a polished, friendly site with impeccable taste and startup-ready adaptability.',
    name: 'Daniel Cho',
    designation: 'Head of Product at Orbit Inference',
    image: 'https://assets.aceternity.com/avatars/6.webp',
    placeholder: true,
  },
  {
    id: 7,
    excerpt:
      'From rough concept to polished product: patient with feedback, great collaboration, delivery that matched our vision.',
    name: 'Amelia Brooks',
    designation: 'Founder at Signal Grove · Product Lead at Latticeware',
    image: 'https://assets.aceternity.com/avatars/7.webp',
    placeholder: true,
  },
  {
    id: 8,
    excerpt:
      'Quick to respond, very professional, and shipped a site within a week. Looking forward to the next collaboration.',
    name: 'Kenji Sato',
    designation: 'Founder / CTO at Parallax AI',
    image: 'https://assets.aceternity.com/avatars/8.webp',
    placeholder: true,
  },
  {
    id: 9,
    excerpt:
      'Excellent work on our website—they went above and beyond, with a smooth handoff so we could move forward confidently.',
    name: 'Riley Quinn',
    designation: 'Founder at Cedar App',
    image: 'https://assets.aceternity.com/avatars/9.webp',
    placeholder: true,
  },
]

/* The template's spotlight quote for Daniel Cho (id 6), trimmed to
   editorial length by the template itself ($T/components/big-testimonial.tsx). */
export const PLACEHOLDER_FEATURED_QUOTE =
  "I'd highly recommend Mainline for a site redesign. They turned our rough shell into a polished product with impeccable taste, real partnership, and the adaptability you need in a startup. We scoped a few pages; they delivered so well we expanded the engagement."

export const PLACEHOLDER_PARTNER = {
  name: 'Orbit Inference',
  letter: 'O',
  href: 'https://example.com',
}

/* The template's bento assignment ($T/components/big-testimonial.constants.ts). */
export const PLACEHOLDER_BENTO = {
  featured: 6,
  topLeft: 1,
  bottomLeft: 8,
  topRight: 0,
  bottomRight: 5,
}
```

- [ ] **Step 4: Implement the selection,** `src/lib/testimonials/services-testimonials.js`. It uses relative imports so the `engine` Vitest project can load it.

```js
import { testimonials } from '../../content/site/testimonials.js'
import {
  PLACEHOLDER_BENTO,
  PLACEHOLDER_FEATURED_QUOTE,
  PLACEHOLDER_PARTNER,
  placeholderTestimonials,
} from '../../content/site/testimonial-placeholders.js'

/* Which testimonials /services shows in the studio template's bento and
   wall. The template's placeholder people render only in local
   development and on Vercel previews; production, and any environment we
   cannot identify, gets the real list. */

export function showPlaceholders({ nodeEnv, vercelEnv } = {}) {
  return nodeEnv === 'development' || vercelEnv === 'preview'
}

/* Real testimonials in the template's card shape. Quotes run in full:
   trimming someone's words would put different words in their mouth. No
   image, so the card shows initials. */
function fromReal(t) {
  return {
    id: t.name,
    name: t.name,
    designation: t.role,
    excerpt: t.description,
    verbatim: Boolean(t.verbatim),
    image: null,
  }
}

function byName(name) {
  const t = testimonials.find((x) => x.name === name)
  return t ? fromReal(t) : null
}

/* Mark's is the website-build quote, so it leads. Dewayne's is an
   employment reference, not a client endorsement, so it sits last. */
function realSelection() {
  const featured = byName('Mark Schilling')
  const supporting = {
    topLeft: byName('Grace L.'),
    bottomLeft: byName('Mike Pryke'),
    topRight: null,
    bottomRight: byName('Dewayne K.'),
  }
  const used = new Set(
    [featured, ...Object.values(supporting)].filter(Boolean).map((t) => t.id)
  )
  return {
    featured: featured && {
      ...featured,
      quote: featured.excerpt,
      partner: null,
    },
    supporting,
    wall: testimonials.map(fromReal).filter((t) => !used.has(t.id)),
  }
}

function placeholderSelection() {
  const byId = (id) => {
    const t = placeholderTestimonials.find((x) => x.id === id)
    return t ? { ...t, verbatim: true } : null
  }
  const used = new Set(Object.values(PLACEHOLDER_BENTO))
  return {
    featured: {
      ...byId(PLACEHOLDER_BENTO.featured),
      quote: PLACEHOLDER_FEATURED_QUOTE,
      partner: PLACEHOLDER_PARTNER,
    },
    supporting: {
      topLeft: byId(PLACEHOLDER_BENTO.topLeft),
      bottomLeft: byId(PLACEHOLDER_BENTO.bottomLeft),
      topRight: byId(PLACEHOLDER_BENTO.topRight),
      bottomRight: byId(PLACEHOLDER_BENTO.bottomRight),
    },
    wall: placeholderTestimonials
      .filter((t) => !used.has(t.id))
      .map((t) => ({ ...t, verbatim: true })),
  }
}

export function servicesTestimonials(env) {
  return showPlaceholders(env) ? placeholderSelection() : realSelection()
}
```

- [ ] **Step 5: Run the test to confirm it passes.**
      Run: `npx vitest run src/lib/testimonials/__tests__/services-testimonials.test.js`
      Expected: PASS, 13 tests.

- [ ] **Step 6: Verify.**
      Run: `npx eslint src/lib/testimonials src/content/site/testimonial-placeholders.js && npx tsc --noEmit`
      Then run: `npx prettier --write src/lib/testimonials src/content/site/testimonial-placeholders.js`
      Expected: clean.

- [ ] **Step 7: Commit.**

```bash
git add src/lib/testimonials src/content/site/testimonial-placeholders.js
git commit -m "$(printf '%s\n\n%s\n\n%s\n' "✨ feat(testimonials): choose the /services testimonials, placeholders in dev and preview only" "servicesTestimonials() returns the template's bento and wall. Placeholders are selected only for nodeEnv development or vercelEnv preview. Production gets the real four: Mark featured in full, Dewayne's employment reference last, and an empty wall." "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>")"
```

---

### Task 4: The bento and the wall, replacing the carousel

**Files:**

- Create: `src/components/ui/pattern.jsx`
- Create: `src/components/testimonials/avatar.jsx`
- Create: `src/components/testimonials/masonry-grid.js`
- Create: `src/components/testimonials/big-testimonial.jsx`
- Create: `src/components/testimonials/masonry-testimonials.jsx`
- Test: `src/components/testimonials/__tests__/testimonials.test.jsx`
- Modify: `src/app/(site)/services/page.tsx`
- Modify: `next.config.mjs`, in `images.remotePatterns`
- Delete: `src/components/ui/testimonials-with-carousel.jsx` and `src/components/ui/__tests__/testimonials-with-carousel.test.jsx`

**Interfaces:**

- Consumes: `servicesTestimonials(env)` (Task 3)
- Produces:

  - `Pattern({ className })`
  - `Avatar({ person, className, size, tone })` and `initials(name)`
  - `masonryGridColsClass(count)`
  - `BigTestimonial({ featured, supporting })`
  - `MasonryTestimonials({ items })`

- [ ] **Step 1: Write the failing test.** Create `src/components/testimonials/__tests__/testimonials.test.jsx`:

```jsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const reduced = vi.hoisted(() => ({ current: false }))
vi.mock('@/components/AccessibilityProvider', () => ({
  useReducedMotion: () => reduced.current,
}))

import { BigTestimonial } from '../big-testimonial'
import { MasonryTestimonials } from '../masonry-testimonials'
import { masonryGridColsClass } from '../masonry-grid'
import { initials } from '../avatar'
import { servicesTestimonials } from '@/lib/testimonials/services-testimonials'

const live = servicesTestimonials({
  nodeEnv: 'production',
  vercelEnv: 'production',
})
const preview = servicesTestimonials({
  nodeEnv: 'production',
  vercelEnv: 'preview',
})

describe('BigTestimonial with the real four', () => {
  it('features Mark in full and keeps the reference last', () => {
    const { container } = render(<BigTestimonial {...live} />)
    expect(
      screen.getByRole('region', { name: 'Testimonials' })
    ).toBeInTheDocument()
    expect(container.textContent).toContain(live.featured.quote)
    const names = ['Grace L.', 'Mike Pryke', 'Dewayne K.'].map((n) =>
      screen.getByText(n)
    )
    expect(
      names[2].compareDocumentPosition(names[0]) &
        Node.DOCUMENT_POSITION_PRECEDING
    ).toBeTruthy()
    expect(
      screen.getByText('Former supervisor, RL Canning (Honeywell)')
    ).toBeInTheDocument()
  })

  it('shows initials, never photos, and no partner pill', () => {
    const { container } = render(<BigTestimonial {...live} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('MS')).toHaveAttribute('aria-hidden', 'true')
    expect(container.textContent).not.toMatch(/Orbit Inference/)
  })

  it('renders the featured quote as plain text under reduced motion', () => {
    reduced.current = true
    render(<BigTestimonial {...live} />)
    expect(screen.getAllByText(live.featured.quote)).toHaveLength(1)
    reduced.current = false
  })
})

describe('BigTestimonial with placeholders (dev and preview)', () => {
  it("lays out the template's bento with its avatars and partner", () => {
    const { container } = render(<BigTestimonial {...preview} />)
    expect(
      screen.getByRole('link', { name: /Orbit Inference/ })
    ).toHaveAttribute('href', 'https://example.com')
    expect(container.querySelectorAll('img').length).toBe(5)
  })
})

describe('MasonryTestimonials', () => {
  it('renders nothing when the wall is empty', () => {
    const { container } = render(<MasonryTestimonials items={live.wall} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('lays the leftovers out without a lone card on the last row', () => {
    const { container } = render(<MasonryTestimonials items={preview.wall} />)
    expect(screen.getAllByRole('figure')).toHaveLength(4)
    expect(container.querySelector('.grid')).toHaveClass('xl:grid-cols-2')
  })
})

describe('masonryGridColsClass', () => {
  it.each([
    [1, 'grid-cols-1 sm:grid-cols-1'],
    [2, 'grid-cols-1 sm:grid-cols-2'],
    [3, 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'],
    [4, 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-2'],
    [5, 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'],
    [6, 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'],
    [7, 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'],
    [8, 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'],
    [9, 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'],
  ])('%i cards → %s', (count, cls) => {
    expect(masonryGridColsClass(count)).toBe(cls)
  })
})

describe('initials', () => {
  it.each([
    ['Mark Schilling', 'MS'],
    ['Grace L.', 'GL'],
    ['Dewayne K.', 'DK'],
  ])('%s → %s', (name, expected) => {
    expect(initials(name)).toBe(expected)
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails.**
      Run: `npx vitest run src/components/testimonials`
      Expected: FAIL, "Failed to resolve import ../big-testimonial".

- [ ] **Step 3: Create `src/components/ui/pattern.jsx`.** This is `$T/components/pattern.tsx` with its layout effect replaced by an external-store read:

```jsx
'use client'

import { useSyncExternalStore } from 'react'

/* The studio template's diagonal hatch: two repeating gradients coloured
   by --pattern-fg. The template hides it on Apple Safari, where fixed
   gradients repaint badly; this reads that once as an external store
   rather than setting state in a layout effect. */

function isAppleSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) {
    if (!/Safari/.test(ua)) return false
    return !/CriOS|FxiOS|EdgiOS|OPiOS|EdgA/.test(ua)
  }
  if (!/Safari/.test(ua)) return false
  return !/\b(Chrome|Chromium|Edg)\b/.test(ua) && !/\bOPR\b/.test(ua)
}

const NEVER_CHANGES = () => () => {}

export function Pattern({ className }) {
  const hide = useSyncExternalStore(NEVER_CHANGES, isAppleSafari, () => false)
  if (hide) return null
  return (
    <div className={className} aria-hidden="true">
      <div className="bg-size-[5px_5px] absolute inset-0 h-full w-full bg-[repeating-linear-gradient(315deg,var(--pattern-fg)_0,var(--pattern-fg)_1px,transparent_0,transparent_50%)] bg-fixed" />
      <div className="bg-size-[5px_5px] absolute inset-0 h-full w-full bg-[repeating-linear-gradient(-315deg,var(--pattern-fg)_0,var(--pattern-fg)_1px,transparent_0,transparent_50%)] bg-fixed" />
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/testimonials/avatar.jsx`:**

```jsx
import Image from 'next/image'

/* A face when one is on file, otherwise initials. Real people get
   initials until they supply a photo: no stock or generated face ever
   stands in for someone real. Decoration either way; the name sits
   beside it. */

export function initials(name) {
  return String(name || '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

export function Avatar({ person, className = '', size = 44, tone = 'light' }) {
  if (person.image) {
    return (
      <span
        aria-hidden="true"
        className={`relative shrink-0 overflow-hidden rounded-full ${className}`}
      >
        <Image
          src={person.image}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover object-top"
        />
      </span>
    )
  }
  const colours =
    tone === 'dark'
      ? 'bg-white/15 text-white'
      : 'bg-[var(--amw-accent-soft)] text-[var(--amw-accent-ink)]'
  return (
    <span
      aria-hidden="true"
      className={`amw-mono flex shrink-0 items-center justify-center rounded-full text-xs font-medium ${colours} ${className}`}
    >
      {initials(person.name)}
    </span>
  )
}
```

- [ ] **Step 5: Create `src/components/testimonials/masonry-grid.js`:**

```js
/* The studio template's column rule for the testimonial wall: never leave
   a single card alone on the last row. */
export function masonryGridColsClass(count) {
  if (count <= 1) return 'grid-cols-1 sm:grid-cols-1'
  if (count <= 2) return 'grid-cols-1 sm:grid-cols-2'
  // Three columns strand a card when count % 3 === 1 (4 → 3 + 1).
  if (count % 3 !== 1) return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
  if (count % 2 === 0) return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-2'
  // Odd with count % 3 === 1 (7): 4 + 3 avoids the orphan 3 or 2 columns leave.
  if (count === 7) return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
  return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
}
```

- [ ] **Step 6: Create `src/components/testimonials/big-testimonial.jsx`.** This is the port of `$T/components/big-testimonial.tsx`, taking props instead of reading constants.

```jsx
'use client'

import { useMemo, useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { Pattern } from '@/components/ui/pattern'
import { Avatar } from './avatar'

/* Ported from the studio template's BigTestimonial: one featured quote in
   a dark card between two columns of supporting cards. The featured
   quote's words rise into place as the card scrolls through the viewport;
   that follows the visitor's own scrolling, and it turns off under reduced
   motion or the footer's pause, leaving plain text.

   The template's blue card is fixed zinc-950 here, not --amw-ink: ink is
   the text colour and turns near-white in dark mode. The glow is the
   brand accent. It renders what it is handed
   (lib/testimonials/services-testimonials.js): placeholders in dev and on
   previews, the real four in production. */

function RevealWord({ word, index, total, scrollYProgress }) {
  const t = Math.max(total, 1)
  const stagger = 0.78
  const start = (index / t) * stagger
  const end = Math.min(start + (1 / t) * (1 - stagger) + 0.12, 1)
  const opacity = useTransform(scrollYProgress, [0, start, end], [0.08, 0.2, 1])
  const y = useTransform(scrollYProgress, [0, start, end], [18, 8, 0])
  return (
    <motion.span className="inline-block" style={{ opacity, y }}>
      {word}
    </motion.span>
  )
}

function PartnerPill({ partner }) {
  const className =
    'inline-flex w-fit max-w-full items-center gap-2.5 rounded-full bg-white/10 px-3 py-2 ring-1 ring-white/15 backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-2.5'
  const body = (
    <>
      <span className="size-5 bg-white/15 sm:size-6 flex shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white sm:text-xs">
        {partner.letter ?? partner.name[0]}
      </span>
      <span className="min-w-0 border-l border-white/20 pl-2.5 text-left sm:pl-3">
        <span className="block text-xs font-semibold tracking-tight text-white sm:text-sm">
          {partner.name}
        </span>
      </span>
    </>
  )
  return partner.href ? (
    <a
      href={partner.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} hover:bg-white/15 transition-colors`}
    >
      {body}
    </a>
  ) : (
    <span className={className}>{body}</span>
  )
}

/* Quotation markup only where there is a quotation. */
function Quote({ verbatim, className, children }) {
  return verbatim ? (
    <blockquote className={className}>{children}</blockquote>
  ) : (
    <div className={className}>{children}</div>
  )
}

/* Role lines never truncate: "Former supervisor" is the context that keeps
   an employment reference from reading as a client endorsement. */
function SupportingCard({ testimonial }) {
  return (
    <figure className="bg-[var(--amw-card)] ring-[var(--amw-line)] relative flex h-full flex-col justify-between gap-5 overflow-hidden rounded-2xl p-5 shadow-sm shadow-black/10 ring-1 md:p-6">
      <Quote verbatim={testimonial.verbatim} className="relative">
        <p className="text-pretty text-[0.95rem]/6 md:text-base/7 font-medium tracking-tight text-zinc-800 dark:text-zinc-200">
          {testimonial.verbatim ? (
            <>&ldquo;{testimonial.excerpt}&rdquo;</>
          ) : (
            testimonial.excerpt
          )}
        </p>
      </Quote>
      <figcaption className="flex items-center gap-3">
        <Avatar person={testimonial} className="size-9" size={36} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {testimonial.name}
          </p>
          {testimonial.designation && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {testimonial.designation}
            </p>
          )}
        </div>
      </figcaption>
    </figure>
  )
}

export function BigTestimonial({ featured, supporting }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.88', 'end 0.35'],
  })
  const words = useMemo(
    () => (featured?.quote ?? '').split(/\s+/).filter(Boolean),
    [featured?.quote]
  )
  const footerReveal = useTransform(scrollYProgress, [0.22, 0.52], [0.4, 1])
  const footerY = useTransform(scrollYProgress, [0.22, 0.52], [14, 0])

  if (!featured) return null
  const { topLeft, bottomLeft, topRight, bottomRight } = supporting ?? {}
  const quoteClass =
    'relative text-pretty text-lg/7 font-medium tracking-[-0.02em] text-white/95 md:text-xl/8 lg:text-lg'

  return (
    <section
      aria-label="Testimonials"
      className="relative mx-auto max-w-[calc(72rem-6px)] px-1 pt-4 md:pt-10"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-stretch md:gap-1">
        <div className="order-2 flex flex-col gap-4 md:order-1 md:gap-1">
          {topLeft && <SupportingCard testimonial={topLeft} />}
          {bottomLeft && <SupportingCard testimonial={bottomLeft} />}
        </div>

        <figure
          ref={ref}
          className="bg-zinc-950 relative isolate order-1 overflow-hidden rounded-2xl py-6 text-white shadow-md shadow-black/10 [--pattern-fg:rgb(255_255_255/0.05)] dark:ring-1 dark:ring-white/10 md:order-2 md:py-10"
        >
          <div className="pointer-events-none absolute inset-0">
            <Pattern />
          </div>
          <div
            aria-hidden="true"
            className="bg-[var(--amw-accent)] h-112 md:w-md pointer-events-none absolute -top-24 right-[-10%] w-48 rounded-full opacity-40 blur-3xl"
          />
          <div className="relative z-10 flex h-full flex-col gap-8 px-5 md:gap-10 md:px-8">
            {featured.partner && <PartnerPill partner={featured.partner} />}
            <Quote verbatim={featured.verbatim} className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -left-1 -top-2 text-[clamp(2.5rem,8vw,4.5rem)] leading-none text-white/10 md:-left-2 md:-top-4"
              >
                &ldquo;
              </span>
              {reduce ? (
                <p className={quoteClass}>{featured.quote}</p>
              ) : (
                <p className={quoteClass}>
                  <span className="sr-only">{featured.quote}</span>
                  <span
                    aria-hidden="true"
                    className="[&>span]:mb-[0.35em] [&>span]:mr-[0.3em]"
                  >
                    {words.map((word, i) => (
                      <RevealWord
                        key={i}
                        word={word}
                        index={i}
                        total={words.length}
                        scrollYProgress={scrollYProgress}
                      />
                    ))}
                  </span>
                </p>
              )}
            </Quote>
            <motion.figcaption
              style={reduce ? undefined : { opacity: footerReveal, y: footerY }}
              className="mt-auto flex flex-row items-center gap-3 md:gap-4"
            >
              <Avatar
                person={featured}
                tone="dark"
                className="size-11 sm:size-12 ring-1 ring-white/20"
                size={48}
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-sm/5 font-semibold tracking-tight text-white">
                  {featured.name}
                </p>
                {featured.designation && (
                  <p className="text-xs/4 text-white/60">
                    {featured.designation}
                  </p>
                )}
              </div>
            </motion.figcaption>
          </div>
        </figure>

        <div className="order-3 flex flex-col gap-4 md:gap-1">
          {topRight && <SupportingCard testimonial={topRight} />}
          {bottomRight && <SupportingCard testimonial={bottomRight} />}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 7: Create `src/components/testimonials/masonry-testimonials.jsx`:**

```jsx
import { Avatar } from './avatar'
import { masonryGridColsClass } from './masonry-grid'

/* Ported from the studio template's MasonryTestimonials: every
   testimonial not already in the bento, as a wall of quote cards whose
   column count never strands one card alone on the last row. It renders
   nothing when nothing is left over, which in production is the case
   until there are more than four real testimonials. */

export function MasonryTestimonials({ items }) {
  if (!items?.length) return null
  return (
    <section aria-label="More testimonials" className="w-full pb-1 pt-1">
      <div className="mx-auto max-w-6xl px-1.5">
        <div className={`grid gap-1 ${masonryGridColsClass(items.length)}`}>
          {items.map((t) => (
            <figure
              key={t.id}
              className="bg-[var(--amw-card)] ring-[var(--amw-line)] flex h-full min-h-0 flex-col rounded-2xl p-6 shadow-sm shadow-black/10 ring-1"
            >
              {t.verbatim ? (
                <blockquote className="text-pretty min-h-0 flex-1 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                  &ldquo;{t.excerpt}&rdquo;
                </blockquote>
              ) : (
                <p className="text-pretty min-h-0 flex-1 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {t.excerpt}
                </p>
              )}
              <figcaption className="mt-4 flex shrink-0 items-center gap-3 pt-1">
                <Avatar
                  person={t}
                  className="size-11 ring-1 ring-black/10"
                  size={44}
                />
                <div className="flex min-w-0 flex-col items-start space-y-0.5">
                  <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {t.name}
                  </p>
                  {t.designation && (
                    <p className="text-left text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                      {t.designation}
                    </p>
                  )}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 8: Allow the placeholder avatars.** In `next.config.mjs`, add to the end of `images.remotePatterns`:

```js
      {
        // The studio template's placeholder testimonial avatars. They only
        // ever render in local dev and on Vercel previews, never in
        // production (src/lib/testimonials/services-testimonials.js).
        protocol: 'https',
        hostname: 'assets.aceternity.com',
        pathname: '/avatars/**',
      },
```

- [ ] **Step 9: Swap the carousel for the bento and the wall.** In `src/app/(site)/services/page.tsx`:

  First, remove these two imports:

  - `import { TestimonialsWithCarousel } from '@/components/ui/testimonials-with-carousel'`
  - `import { testimonials } from '@/content/site/testimonials'`

  Next, add:

```tsx
import { BigTestimonial } from '@/components/testimonials/big-testimonial'
import { MasonryTestimonials } from '@/components/testimonials/masonry-testimonials'
import { servicesTestimonials } from '@/lib/testimonials/services-testimonials'
```

After `groupServices(docs)`, add:

```tsx
const proof = servicesTestimonials({
  nodeEnv: process.env.NODE_ENV,
  vercelEnv: process.env.VERCEL_ENV,
})
```

Then replace the whole `<TestimonialsWithCarousel … />` element, and the comment above it, with:

```tsx
{
  /* Below both tracks, where the objection forms: what the people
            on the other side of the work said. */
}
;<div className="mt-24 sm:mt-32">
  <BigTestimonial featured={proof.featured} supporting={proof.supporting} />
  <MasonryTestimonials items={proof.wall} />
</div>
```

Finally, run: `git rm src/components/ui/testimonials-with-carousel.jsx src/components/ui/__tests__/testimonials-with-carousel.test.jsx`

- [ ] **Step 10: Run the tests and verify.**
      Run: `npx vitest run src/components/testimonials src/components/ui && npx tsc --noEmit && npx eslint src/components/testimonials src/components/ui/pattern.jsx "src/app/(site)/services/page.tsx" next.config.mjs`
      Then run: `npx prettier --write src/components/testimonials src/components/ui/pattern.jsx "src/app/(site)/services/page.tsx" next.config.mjs`
      Expected: PASS, and clean.

- [ ] **Step 11: Commit.**

```bash
git add src/components/testimonials src/components/ui "src/app/(site)/services/page.tsx" next.config.mjs
git commit -m "$(printf '%s\n\n%s\n\n%s\n' "✨ feat(testimonials): the studio template's bento and wall on /services" "Replaces the unpushed carousel. The featured quote rises word by word with scrolling, and is plain text under reduced motion or the footer pause. Real people show initials; placeholder avatars load only where placeholders render. Role lines never truncate." "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>")"
```

---

### Task 5: The four hover illustrations

**Files:**

- Create, as ports: `src/components/website-package/icons.jsx`, `grid-lines.jsx`, `keyboard.jsx`, `designing.jsx`, `microinteractions.jsx`, `copywriting.jsx`, `consultation.jsx`
- Test: `src/components/website-package/__tests__/illustrations.test.jsx`

**Interfaces:**

- Produces: `DesigningSkeleton()`, `Microinteractions()`, `Copywriting()`, `Consultation()`. Each root element is `aria-hidden="true"`, with no tabbable descendants.
- Produces, from `./icons`: `WebsiteDevelopment`, `MobileResponsive`, `DarkAndLightMode`, `TechStack`, `Communication`, `FutureUpdates`, `FileIcon`, `MousePointerIcon`, `SidebarIcon`, `WifiIcon`, `CelularIcon` and `BatteryIcon`. Each takes `(props) => <svg …>`.

- [ ] **Step 1: Write the failing test.** Create `src/components/website-package/__tests__/illustrations.test.jsx`:

```jsx
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { DesigningSkeleton } from '../designing'
import { Microinteractions } from '../microinteractions'
import { Copywriting } from '../copywriting'
import { Consultation } from '../consultation'

/* The four pictures on the website-build cards. They are decoration: the
   card title and description carry the meaning, so screen readers skip
   them and nothing inside takes keyboard focus. None of the template's
   brand, personas or borrowed claims survive the port. */

const TABBABLE =
  'a[href], button:not([tabindex="-1"]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

describe.each([
  ['DesigningSkeleton', DesigningSkeleton],
  ['Microinteractions', Microinteractions],
  ['Copywriting', Copywriting],
  ['Consultation', Consultation],
])('%s', (_, Illustration) => {
  it('is hidden from screen readers and out of the tab order', () => {
    const { container } = render(<Illustration />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelectorAll(TABBABLE)).toHaveLength(0)
  })

  it("carries none of the template's brand or personas", () => {
    const { container } = render(<Illustration />)
    expect(container.textContent).not.toMatch(
      /Mainline|\bAva\b|voice agents|free trial/i
    )
  })
})

it('puts Alec, not a stock face, on the strategy call', () => {
  const { container } = render(<Consultation />)
  const srcs = [...container.querySelectorAll('img')].map((img) =>
    img.getAttribute('src')
  )
  expect(srcs.some((s) => /at-the-desk/.test(s))).toBe(true)
  expect(srcs.some((s) => /webcam-person/.test(s))).toBe(false)
})
```

- [ ] **Step 2: Run the test to confirm it fails.**
      Run: `npx vitest run src/components/website-package/__tests__/illustrations.test.jsx`
      Expected: FAIL, "Failed to resolve import ../designing".

- [ ] **Step 3: Port mechanically,** stripping types with `tsc` (this keeps the JSX and its comments). `tsc` exits with code 2 because `@/` imports cannot resolve, but it still emits. That is expected.

```bash
T=/Users/mipi-founder/Documents/GitHub/templates/design-development-studio-template
O=$(mktemp -d)
npx tsc "$T/components/services/designing.tsx" "$T/components/services/microinteractions.tsx" \
  "$T/components/services/copywriting.tsx" "$T/components/services/consultation.tsx" \
  "$T/components/services/keyboard.tsx" "$T/components/services/grid-lines.tsx" \
  "$T/components/icons/general.tsx" \
  --jsx preserve --target esnext --module esnext --moduleResolution bundler \
  --skipLibCheck --noResolve --outDir "$O" || true
D=src/components/website-package; mkdir -p "$D"
for f in designing microinteractions copywriting consultation keyboard grid-lines; do
  cp "$O/services/$f.jsx" "$D/$f.jsx"
done
cp "$O/icons/general.jsx" "$D/icons.jsx"
npx prettier --write "$D"/*.jsx
```

If `tsc` emits into a different subfolder layout, run `find "$O" -name '*.jsx'` and adjust the `cp` source paths. The output files are the same.

- [ ] **Step 4: Edit `icons.jsx`.** Delete every export except `SidebarIcon`, `FileIcon`, `MousePointerIcon`, `WifiIcon`, `CelularIcon`, `BatteryIcon`, `WebsiteDevelopment`, `MobileResponsive`, `DarkAndLightMode`, `TechStack`, `Communication` and `FutureUpdates`. That deletes `CheckIcon`, `NextjsIcon`, `TailwindIcon`, `MotionLogo`, `People`, `Progress`, `DeliveryIcon` and `CustomSolutionIcon`.

  Then put this comment at the top of the file:

```jsx
/* Ported from the studio template's components/icons/general.tsx: only the
   glyphs the website-build section and its illustrations use. */
```

- [ ] **Step 5: Edit `grid-lines.jsx`.** Its `cn` import stays `@/lib/utils`, which the site has. In both components, replace `"[--color:var(--color-neutral-200)]"` with `'[--color:var(--amw-line)]'`.

- [ ] **Step 6: Edit `keyboard.jsx`.** No changes are needed beyond Prettier. Its `cn` comes from `@/lib/utils`.

- [ ] **Step 7: Edit `designing.jsx`.**

  **1. Imports.** Remove the imports of `next/link`, `@/lib/scroll-to-contact`, `@/components/logo` and `@/components/button`. Change `from "@/components/icons/general"` to `from './icons'`, and keep `from './grid-lines'`.

  **2. Replace `NAV_LINKS` and `MiniNavbar` with:**

```jsx
const NAV_LABELS = ['Services', 'Projects', 'Contact']

/* Scaled-down site header: brand, links and call to action, as text only. */
const MiniNavbar = () => (
  <div className="relative z-10 shrink-0 overflow-hidden px-2 pb-1 pt-2">
    <div className="flex items-center justify-between overflow-hidden rounded-lg bg-white px-2 py-1.5 shadow-sm shadow-black/5 ring-1 ring-black/5">
      <span className="flex shrink-0 items-center gap-0.5 text-[8px] font-semibold tracking-tight text-neutral-800">
        AMWARE
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 px-1">
        {NAV_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <span className="bg-[var(--amw-accent)] size-0.5 shrink-0 rounded-full" />
            )}
            <span className="truncate text-[6px] font-medium text-neutral-700">
              {label}
            </span>
          </div>
        ))}
      </div>
      <span className="bg-[var(--amw-accent)] text-zinc-950 shrink-0 rounded-md px-2 py-0.5 text-[6px] font-medium">
        Book a call
      </span>
    </div>
  </div>
)
```

**3. `TestimonialSkeletons`.** Remove `aria-label="Testimonials"` from its `<section>`, and replace `bg-primary` with `bg-[var(--amw-accent)]`.

**4. Replace `HeroContentMini` with:**

```jsx
/* Shared hero block for the site tab and the Figma frame. */
const HeroContentMini = ({ className }) => (
  <div
    className={cn(
      'mx-auto flex max-w-[36ch] flex-col items-center gap-2 px-2 pb-3 pt-4 text-center',
      className
    )}
  >
    <p className="text-balance max-w-[40ch] text-[9px] font-semibold leading-snug tracking-tight text-neutral-700 sm:text-[10px] md:text-[11px]">
      Design-led websites that
      <br />
      <span className="text-[var(--amw-accent-ink)]">earn trust</span> in the
      first scroll
    </p>
    <p className="text-pretty mt-0.5 max-w-[56ch] text-[6px] leading-relaxed text-neutral-500 sm:text-[7px] md:text-[8px]">
      Custom sites with clear hierarchy, intentional motion, and performance
      that holds up when real traffic shows up.
    </p>
    <div className="mt-1 flex flex-col items-center gap-1.5 sm:mt-1.5 sm:flex-row sm:gap-2">
      <span className="bg-[var(--amw-accent)] text-zinc-950 rounded-lg px-2 py-1 text-[6px] font-medium md:text-[7px]">
        Talk to Alec
      </span>
      <span className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[6px] font-medium text-neutral-700 md:text-[7px]">
        Explore work
      </span>
    </div>
  </div>
)
```

**5. Rename things.** In the file, rename `MainlinePageMini` to `SitePageMini`, and change the tab id `"mainline"` to `'site'`. That covers `useState('site')` and both comparisons. In `FigmaSidebarMini`, change `Agency v2.2` to `Client site v1`.

**6. `DesigningSkeleton`.** Add `aria-hidden="true"` to its outermost `<div>`. On both tab `<button>`s:

- remove `role="tab"` and `aria-selected={…}`;
- add `tabIndex={-1}`;
- replace `<LogoSVGNew className="size-2 shrink-0 text-neutral-900" />` with `<span className="flex size-2 shrink-0 items-center justify-center rounded-[2px] bg-zinc-900 text-[5px] font-bold text-white">A</span>`;
- change the label `Mainline — Crafting high-perf…` to `AMWARE — Websites that ship`.

**7. Tokens.** Remove every remaining `font-display` class.

- [ ] **Step 8: Edit `microinteractions.jsx`.**

  **1. Imports.** Change `from "@/components/icons/general"` to `from './icons'`. Add:

```jsx
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { useMounted } from '@/hooks/use-client-value'
```

**2. `Microinteractions`.** Add `aria-hidden="true"` to its outer `<div>`.

**3. The wallpaper `<Image>`.** Remove `priority`, and change its `alt` to `""`.

**4. The notification persona.** Change the notification name `Ava` to `Alec`, and the DiceBear URL's `seed=AvaReed` to `seed=Alec`.

**5. Replace the clock state in `ScreenContent`.** The clock stops under reduced motion or the footer pause, and it renders only after hydration so the server's time cannot mismatch the browser's. Replace the `useState(() => new Date())` and `useEffect(…setInterval…)` lines with:

```jsx
const reduce = useReducedMotion()
const mounted = useMounted()
const [now, setNow] = useState(() => new Date())

useEffect(() => {
  if (reduce) return
  const id = setInterval(() => setNow(new Date()), 1000)
  return () => clearInterval(id)
}, [reduce])
```

Then change `{formatLockScreenDate(now)}` to `{mounted ? formatLockScreenDate(now) : null}`, and `{formatLockScreenTime(now)}` to `{mounted ? formatLockScreenTime(now) : null}`.

**6. Tokens.** Remove `font-body` and every `font-display`.

- [ ] **Step 9: Edit `copywriting.jsx`.**

  **1. `Copywriting`.** Add `aria-hidden="true"` to its outer `<div>`.

  **2. The user avatar.** Rename `AVA_AVATAR_SRC` to `USER_AVATAR_SRC`, with the value `'https://api.dicebear.com/9.x/notionists/png?seed=Visitor'`. On that `<Image>`, set `alt=""`.

  **3. The chat.** Replace the user bubble text `best voice agents` with `how do sites get cited in AI answers?`. Replace the assistant `<div …>`'s two `<p>` children with:

```jsx
                <p className="text-neutral-800">
                  Clear structure, fast pages and plain-language copy make a
                  site easy to cite [1][2]. Structured data and
                  machine-readable exports tell Google and AI answer engines
                  exactly what you offer [3].
                </p>
                <p className="mt-2 border-t border-neutral-200/80 pt-2 text-[10px] leading-tight text-neutral-500">
                  <span className="font-medium text-neutral-600">References</span>{' '}
                  <span className="text-neutral-500">
                    [1] developers.google.com/search · [2] schema.org · [3]
                    llmstxt.org
                  </span>
                </p>
```

**4. The loader icon.** On the `IconLoader` `className`, append `motion-reduce:animate-none`.

- [ ] **Step 10: Edit `consultation.jsx`.**

  **1. Imports.** Add `import atTheDesk from '@/images/photos/at-the-desk.jpg'`.

  **2. `Consultation`.** Add `aria-hidden="true"` to its outer `<div>`.

  **3. The big call frame.** On its `<Image src="https://assets.aceternity.com/components/webcam-person.webp" …>`:

  - set `src={atTheDesk}` and `alt=""`;
  - remove `width` and `height`;
  - add `sizes="400px"`.

  **4. The small tile that appears on hover** (the second `webcam-person` `<Image>`). Set `src={atTheDesk}` and `alt=""`, remove `width` and `height`, and add `sizes="64px"`.

  **5. The DiceBear self-view tile.** Set `alt=""`, and change `seed=AvaReed` to `seed=Visitor`. This tile is the visitor, not a consultant.

  **6. Mock copy.**

  - `Build products people love.` becomes `Your product, built right.`
  - `Ship faster with a team that owns design through launch.` becomes `Design through launch, one engineer.`
  - `Ready to dive in?` becomes `Ready to start?`
  - `Start your free trial today.` becomes `Book a strategy call.`

  **7. Tokens.**

  - `bg-primary` becomes `bg-[var(--amw-accent)]`.
  - `text-primary` becomes `text-[var(--amw-accent-ink)]`.
  - Remove `font-display`.

- [ ] **Step 11: Run the test to confirm it passes, and verify.**
      Run: `npx vitest run src/components/website-package/__tests__/illustrations.test.jsx && npx eslint src/components/website-package && npx tsc --noEmit`
      Then run: `npx prettier --write src/components/website-package`
      Expected: PASS, 9 tests, and clean. If ESLint flags anything the removals left unused, delete it. That includes imports such as `React` or `Link`, and variables such as `screenContentVariants` and `CONTENT_TRANSITION` in `microinteractions.jsx`, which the template only referenced in commented-out code.

- [ ] **Step 12: Commit.**

```bash
git add src/components/website-package
git commit -m "$(printf '%s\n\n%s\n\n%s\n' "✨ feat(website-package): port the studio template's four hover illustrations" "Types stripped with tsc, then rebranded and made honest: AMWARE in place of Mainline, and Alec's own photo on the strategy call instead of a stock face. The AI-search chat explains citability without claiming an AI recommends us. Decorative and out of the tab order; the clock stops under reduced motion and renders only after hydration." "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>")"
```

---

### Task 6: The globe card

**Files:**

- Create, as a port: `src/components/website-package/globe.jsx`
- Create: `src/components/website-package/globe-card.jsx`
- Test: `src/components/website-package/__tests__/globe-card.test.jsx`

**Interfaces:**

- Produces: `Globe3D({ markers, config, className, onMarkerClick, onMarkerHover })` from `./globe` (unchanged from the template), and `GlobeCard({ className })` from `./globe-card`.

- [ ] **Step 1: Write the failing test.** Create `src/components/website-package/__tests__/globe-card.test.jsx`:

```jsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const reduced = vi.hoisted(() => ({ current: false }))
const globeProps = vi.hoisted(() => ({ current: null }))

vi.mock('@/components/AccessibilityProvider', () => ({
  useReducedMotion: () => reduced.current,
}))
vi.mock('next/dynamic', () => ({
  default: () =>
    function GlobeStub(props) {
      globeProps.current = props
      return <div data-testid="globe" />
    },
}))

import { GlobeCard } from '../globe-card'

/* The globe is decoration that loads only near the viewport. It turns
   slowly, holds still under reduced motion, and carries no markers: the
   template pinned stock avatars to cities as if they were clients. */

describe('GlobeCard', () => {
  it('turns slowly, with no markers', async () => {
    reduced.current = false
    const { container } = render(<GlobeCard />)
    await screen.findByTestId('globe')
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(globeProps.current.config.autoRotateSpeed).toBe(0.3)
    expect(globeProps.current.markers).toBeUndefined()
  })

  it('holds still under reduced motion', async () => {
    reduced.current = true
    render(<GlobeCard />)
    await screen.findByTestId('globe')
    expect(globeProps.current.config.autoRotateSpeed).toBe(0)
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails.**
      Run: `npx vitest run src/components/website-package/__tests__/globe-card.test.jsx`
      Expected: FAIL, "Failed to resolve import ../globe-card".

- [ ] **Step 3: Port the globe with `tsc`,** exactly as in Task 5, Step 3, then run Prettier:

```bash
T=/Users/mipi-founder/Documents/GitHub/templates/design-development-studio-template
O=$(mktemp -d)
npx tsc "$T/components/services/globe.tsx" --jsx preserve --target esnext --module esnext \
  --moduleResolution bundler --skipLibCheck --noResolve --outDir "$O" || true
cp "$(find "$O" -name 'globe.jsx')" src/components/website-package/globe.jsx
npx prettier --write src/components/website-package/globe.jsx
```

There are no content edits. The Earth textures stay on unpkg, loaded by three's `TextureLoader` rather than `next/image`, so `next.config` needs nothing. Put this comment at the top:

```jsx
/* Ported unchanged from the studio template's components/services/globe.tsx
   (types stripped). Used only through ./globe-card, which lazy-loads it,
   passes no markers, and stops the rotation under reduced motion. */
```

- [ ] **Step 4: Create `src/components/website-package/globe-card.jsx`:**

```jsx
'use client'

import dynamic from 'next/dynamic'
import { useRef } from 'react'
import { useInView } from 'motion/react'
import { useReducedMotion } from '@/components/AccessibilityProvider'

/* The globe is three.js. It loads only in the browser, and only once its
   card is near the viewport. A panel hidden behind the Consulting tab
   never intersects, so a visitor who never opens Build & support never
   downloads it. It is decoration: under reduced motion, or the footer's
   pause, it holds still instead of turning. No markers: the template
   pinned stock avatars to cities as if they were clients. */

const Globe3D = dynamic(() => import('./globe').then((m) => m.Globe3D), {
  ssr: false,
})

const GLOBE_CONFIG = {
  atmosphereColor: '#4da6ff',
  atmosphereIntensity: 20,
  bumpScale: 5,
}

export function GlobeCard({ className }) {
  const ref = useRef(null)
  const near = useInView(ref, { once: true, margin: '200px' })
  const reduce = useReducedMotion()
  return (
    <div ref={ref} aria-hidden="true" className={className}>
      {near && (
        <Globe3D
          className="h-full w-full"
          config={{ ...GLOBE_CONFIG, autoRotateSpeed: reduce ? 0 : 0.3 }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run the test to confirm it passes, and verify.**
      Run: `npx vitest run src/components/website-package/__tests__/globe-card.test.jsx && npx eslint src/components/website-package/globe.jsx src/components/website-package/globe-card.jsx && npx tsc --noEmit`
      Then run: `npx prettier --write src/components/website-package/globe.jsx src/components/website-package/globe-card.jsx`
      Expected: PASS, 2 tests, and clean.

- [ ] **Step 6: Commit.**

```bash
git add src/components/website-package/globe.jsx src/components/website-package/globe-card.jsx src/components/website-package/__tests__/globe-card.test.jsx
git commit -m "$(printf '%s\n\n%s\n\n%s\n' "✨ feat(website-package): a 3D globe that loads near the viewport and can hold still" "The template's globe, types stripped, behind a client-only lazy mount. It has no city markers, and it stops rotating under reduced motion or the footer pause." "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>")"
```

---

### Task 7: The website-build section, on the Build & support tab

**Files:**

- Create: `src/content/site/website-package.js`
- Create: `src/components/website-package/index.jsx`
- Test: `src/components/website-package/__tests__/website-package.test.jsx`
- Modify: `src/app/(site)/services/page.tsx`, in the `technical` panel
- Modify: `next.config.mjs`, in `images.remotePatterns`

**Interfaces:**

- Consumes:
  - `DesigningSkeleton`, `Microinteractions`, `Copywriting` and `Consultation` (Task 5)
  - the six feature icons from `./icons` (Task 5)
  - `GlobeCard` (Task 6)
  - `Pattern` (Task 4)
- Produces:

  - `WebsitePackage()`
  - `WEBSITE_PACKAGE`, shaped `{ heading: { lead, highlight }, cards: { designing, microinteractions, copywriting, consultation, launch }, features, cta }`. Each card is `{ title, description }`. `features` is `Array<{ icon, title }>`, and `cta` is `{ label, href }`.

- [ ] **Step 1: Write the failing test.** Create `src/components/website-package/__tests__/website-package.test.jsx`:

```jsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

vi.mock('../globe-card', () => ({
  GlobeCard: () => <div data-testid="globe" />,
}))

import { WebsitePackage } from '../index'
import { WEBSITE_PACKAGE } from '@/content/site/website-package'

/* The Build & support tab tells a buyer what a website build includes, in
   the words the owner signed off, and asks for the build. None of the
   template's borrowed social proof comes with it. */

describe('WebsitePackage', () => {
  it('says what a website build includes, in the approved words', () => {
    render(<WebsitePackage />)
    const section = screen.getByRole('region', {
      name: /everything a website build includes/i,
    })
    for (const card of Object.values(WEBSITE_PACKAGE.cards)) {
      expect(
        within(section).getByRole('heading', { name: card.title })
      ).toBeInTheDocument()
      expect(within(section).getByText(card.description)).toBeInTheDocument()
    }
    for (const feature of WEBSITE_PACKAGE.features) {
      expect(
        within(section).getByRole('heading', { name: feature.title })
      ).toBeInTheDocument()
    }
  })

  it('asks for the build and makes no borrowed claims', () => {
    render(<WebsitePackage />)
    expect(
      screen.getByRole('link', { name: /start a website build/i })
    ).toHaveAttribute('href', '/contact')
    expect(document.body.textContent).not.toMatch(
      /trusted by|100\+|companies worldwide/i
    )
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails.**
      Run: `npx vitest run src/components/website-package/__tests__/website-package.test.jsx`
      Expected: FAIL, "Failed to resolve import ../index".

- [ ] **Step 3: Create the copy,** `src/content/site/website-package.js`. It is the spec's table, verbatim.

```js
/* What a website build includes, as the /services "Build & support" tab
   shows it. The owner confirms or strikes each line before merge
   (docs/superpowers/specs/2026-09-25-services-template-port-design.md).
   Every line must be something the build actually delivers. */

export const WEBSITE_PACKAGE = {
  heading: {
    lead: 'Everything a website build includes,',
    highlight: 'start to finish',
  },
  cards: {
    designing: {
      title: 'Design and build',
      description:
        'From wireframes to a shipped Next.js site, designed and built by the same engineer.',
    },
    microinteractions: {
      title: 'Micro-interactions and motion',
      description:
        'Considered animation, with 3D where it earns its place, and reduced-motion support built in.',
    },
    copywriting: {
      title: 'Copy, SEO and AI search',
      description:
        'Crawlable pages, metadata and machine-readable exports, so you can be found on Google and in ChatGPT and Perplexity.',
    },
    consultation: {
      title: 'Strategy call first',
      description:
        'Goals, audience, and what the site has to do for the business, before anything is designed.',
    },
    launch: {
      title: 'Launch and beyond',
      description:
        'Deployment, hosting, maintenance, revisions and the design system.',
    },
  },
  features: [
    {
      icon: 'WebsiteDevelopment',
      title: 'Design and development by one engineer',
    },
    { icon: 'MobileResponsive', title: 'Responsive on every screen' },
    { icon: 'DarkAndLightMode', title: 'Dark and light mode' },
    { icon: 'TechStack', title: 'Modern stack (Next.js, React, Tailwind)' },
    { icon: 'Communication', title: 'Regular check-ins' },
    { icon: 'FutureUpdates', title: 'Built to change after launch' },
  ],
  cta: { label: 'Start a website build', href: '/contact' },
}
```

- [ ] **Step 4: Create the section,** `src/components/website-package/index.jsx`:

```jsx
'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import { Pattern } from '@/components/ui/pattern'
import { WEBSITE_PACKAGE } from '@/content/site/website-package'
import { DesigningSkeleton } from './designing'
import { Microinteractions } from './microinteractions'
import { Copywriting } from './copywriting'
import { Consultation } from './consultation'
import { GlobeCard } from './globe-card'
import * as Icons from './icons'

/* Ported from the studio template's Services section: four cards whose
   illustrations play when the card is hovered, a full-width card with a
   3D globe, and a feature list. Rebranded onto the amw tokens and reworded
   to say what a website build with Alec includes. The template's "Trusted
   by 100+ companies", made-up logos and avatar pins are gone; the globe
   card carries the call to action instead. */

function Card({ children, className = '' }) {
  return (
    <motion.div
      whileHover="animate"
      initial="initial"
      className={`bg-[var(--amw-muted)] relative rounded-2xl ${className}`}
    >
      {children}
    </motion.div>
  )
}

function CardText({ title, description }) {
  return (
    <div className="mt-4 px-8 pb-8">
      <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      <p className="text-base text-zinc-700 dark:text-zinc-300">
        {description}
      </p>
    </div>
  )
}

export function WebsitePackage() {
  const { heading, cards, features, cta } = WEBSITE_PACKAGE
  return (
    <section
      aria-labelledby="website-package-heading"
      className="relative mx-auto max-w-[calc(72rem-10px)] overflow-hidden py-4 [--pattern-fg:var(--amw-grid)] md:py-16"
    >
      <div className="mask-b-from-50% absolute inset-0">
        <Pattern />
      </div>

      <h2
        id="website-package-heading"
        style={{ fontFamily: 'Layer, sans-serif' }}
        className="text-balance relative mx-auto max-w-[40ch] px-4 text-center text-xl font-semibold tracking-tight text-zinc-700 dark:text-zinc-200 md:max-w-[35ch] md:px-8 md:text-2xl"
      >
        {heading.lead}{' '}
        <span className="bg-[var(--amw-accent)] text-zinc-950">
          {heading.highlight}
        </span>
      </h2>

      <div className="relative mt-6 px-4 md:mt-12">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <div className="h-80">
              <DesigningSkeleton />
            </div>
            <CardText {...cards.designing} />
          </Card>
          <Card>
            <div className="h-80">
              <Microinteractions />
            </div>
            <CardText {...cards.microinteractions} />
          </Card>
          <Card>
            <div className="h-80">
              <Copywriting />
            </div>
            <CardText {...cards.copywriting} />
          </Card>
          <Card>
            <div className="h-80">
              <Consultation />
            </div>
            <CardText {...cards.consultation} />
          </Card>
          <Card className="min-h-100 col-span-1 overflow-hidden md:col-span-2">
            <GlobeCard className="size-160 md:size-180 md:-bottom-70 absolute -bottom-96 -right-72 z-10" />
            <div className="relative z-20 mt-6 flex flex-col px-8 pb-8">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                {cards.launch.title}
              </h3>
              <p className="text-balance max-w-md text-base text-zinc-700 dark:text-zinc-300">
                {cards.launch.description}
              </p>
              <Link
                href={cta.href}
                className="bg-[var(--amw-accent)] text-zinc-950 group mt-8 inline-flex w-fit items-center gap-3 rounded-md py-2.5 pl-5 pr-2.5 font-medium no-underline transition-all duration-500 hover:rounded-[50px]"
              >
                <span>{cta.label}</span>
                <span className="text-zinc-950 flex h-8 w-8 items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100">
                  <ChevronRight
                    className="relative left-px h-4 w-4"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </div>
          </Card>
        </div>

        <ul className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-10 px-4 md:mt-24 md:grid-cols-3 md:gap-5 md:px-8">
          {features.map((feature) => {
            const Icon = Icons[feature.icon]
            return (
              <li
                key={feature.title}
                className="flex flex-row items-center gap-2 md:flex-col md:items-start md:gap-4"
              >
                <Icon
                  className="size-6 text-zinc-600 dark:text-zinc-400"
                  aria-hidden="true"
                />
                <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                  {feature.title}
                </h3>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Put it on the tab.** In `src/app/(site)/services/page.tsx`, add `import { WebsitePackage } from '@/components/website-package'`. Then change the `technical` panel to:

```tsx
            technical: (
              <>
                {technical.length > 0 && cards(technical)}
                <WebsitePackage />
              </>
            ),
```

- [ ] **Step 6: Allow the illustrations' images.** In `next.config.mjs`, add to `images.remotePatterns`:

```js
      {
        // Illustrated DiceBear "notionists" avatars inside the website-build
        // illustrations: drawings, not photographs of anyone.
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/9.x/notionists/**',
      },
      {
        // The phone wallpaper in the micro-interactions illustration.
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/photo-1540206395-68808572332f',
      },
```

- [ ] **Step 7: Run the test to confirm it passes, and verify.**
      Run: `npx vitest run src/components/website-package src/components/services && npx tsc --noEmit && npx eslint src/components/website-package src/content/site/website-package.js "src/app/(site)/services/page.tsx" next.config.mjs`
      Then run: `npx prettier --write src/components/website-package src/content/site/website-package.js "src/app/(site)/services/page.tsx" next.config.mjs`
      Expected: PASS, and clean.

- [ ] **Step 8: Commit.**

```bash
git add src/components/website-package src/content/site/website-package.js "src/app/(site)/services/page.tsx" next.config.mjs
git commit -m "$(printf '%s\n\n%s\n\n%s\n' "✨ feat(website-package): what a website build includes, on the Build & support tab" "The studio template's services section, rebranded, with the owner's copy in content/site/website-package.js awaiting sign-off. Its CTA is Start a website build, linking to /contact, and it carries none of the template's social proof. Remote hosts are scoped by path." "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>")"
```

---

### Task 8: Verify, push, and hand over for the owner's steps

**Files:** none new.

- [ ] **Step 1: Run the whole suite and the static checks.**
      Run: `npx vitest run && npx tsc --noEmit && npx eslint src next.config.mjs`
      Expected: every test file passes, `tsc` reports no errors, and ESLint shows no errors. Warnings that already existed may remain.

  Do not run `pnpm build` locally: it reads the shared database, which may not have the `category` column yet.

- [ ] **Step 2: Push and open the PR.**

```bash
git push -u origin services-testimonials
gh pr create --repo HeavenlyEntity/amware --base main --head services-testimonials \
  --title "✨ /services: Consulting and Build & support tabs, studio testimonials, website-build section" \
  --body-file <(printf '%s\n' "## Summary" "" "- A Payload \`category\` field splits /services into **Consulting** and **Build & support** tabs. Both panels stay in the HTML, and \`#build-support\` opens that tab. The homepage offers read Consulting only." "- The studio template's testimonial bento and wall. The template's placeholder testimonials render **only in dev and on previews**; production shows the four real ones, with initials and no photos." "- The website-build section, with four hover illustrations, a lazy globe that holds still under reduced motion, and a feature list. The CTA links to /contact." "" "## Before merging (owner)" "" "1. **Run the \`category\` SQL** from the spec's Database section, then re-run this PR's Vercel preview. The preview and production both read the shared database." "2. **Sign off the copy** in \`src/content/site/website-package.js\`: confirm or strike each line." "3. Until this merges, run \`pnpm dev\` only from this branch." "" "## Testing" "" "- Vitest, tsc and ESLint are clean. The visual check on the preview happens after step 1." "" "🤖 Generated with [Claude Code](https://claude.com/claude-code)")
```

- [ ] **Step 3: Stop and ask the owner to run the SQL,** then wait. The preview's page build reads `services.category`, so it fails with `errorMissingColumn` until the column exists. That failure is expected.

- [ ] **Step 4: Check the preview visually.** Once the preview is green, use the gstack `/browse` skill (the owner's CLAUDE.md requires it, never `claude-in-chrome`). On the preview URL's `/services`, check:

  - The tabs switch, and `#build-support` opens that tab.
  - Hovering each card plays its illustration.
  - The globe appears when scrolled near, and turns.
  - The bento shows the placeholders, with the scroll-reveal.
  - Both light and dark themes hold.
  - At phone width, there is no horizontal scroll.

  Take a screenshot of each tab in each theme, and report any defect as a follow-up commit on this branch.

- [ ] **Step 5: Hand over.** Report the PR URL, the preview findings, and the owner's sign-off list. The owner merges: the permission guard blocks an admin merge from Claude.
