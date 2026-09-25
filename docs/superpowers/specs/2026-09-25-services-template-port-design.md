# /services: the studio template's testimonials and website-build section — design

**Date:** 2026-09-25 · **Branch:** `services-testimonials` · **Status:** approved in chat

Source template: `~/Documents/GitHub/templates/design-development-studio-template`
(`components/big-testimonial.tsx`, `components/masonry-testimonials.tsx`,
`components/services/*`, `components/pattern.tsx`, `components/icons/general.tsx`,
`constants/testimonials.tsx`).

## Goal

Add two sections to `/services`:

1. **The template's testimonials**: a spotlight bento, followed by a masonry wall. This replaces the
   three-up carousel built earlier on this branch, which was never pushed.
2. **What a website build includes**: the template's services section, with its hover
   micro-interaction cards, a globe card and a feature list. It shows buyers what the
   website-building package delivers.

Page order: intro → engagement cards → website-build section → testimonials.

## Decisions (from the owner, 2026-09-25)

- **Port the template verbatim, then rebrand.** Keep its layout and interactions, converted from
  TSX to the site's JSX and mapped onto the `--amw-*` tokens. Nothing new is invented.
- **Package copy:** the template's list, reworded in Alec's voice. The owner confirms or strikes
  each item before merge (see "Owner sign-off").
- **Testimonial content by environment:**
  - **Local dev and Vercel previews** render the template's placeholder testimonials exactly,
    with their names, quotes and stock avatars, so the layout can be judged as designed.
  - **Production** never renders them. It renders the four real testimonials from
    `src/content/site/testimonials.js` in the same bento. Invented testimonials shown to buyers
    would be fake reviews, which the FTC rule on consumer reviews and testimonials prohibits.
- **Photos:** no AI-generated or stock faces for real people. They show initials until they
  supply a headshot, or permission to use one. The owner asked for generated pictures, and that
  request was declined for the same reason.
- **Removed as fake social proof:** the template's "Trusted by 100+ companies worldwide", its
  made-up company logos, and the globe's stock-avatar markers.

## Testimonials

### Placeholder data

`src/content/site/testimonial-placeholders.js` holds the template's nine testimonials. They
are copied as they are, each with `placeholder: true`. A header comment says the file is never
rendered in production.

### Choosing what to render

`src/content/site/services-testimonials.js` is a plain module, not `'use client'`, so server
components can import it.

```js
showPlaceholders({ nodeEnv, vercelEnv })
// true only for nodeEnv === 'development' or vercelEnv === 'preview';
// production, and unknown environments, get the real list

servicesTestimonials(env)
// → { featured, supporting: { topLeft, bottomLeft, topRight, bottomRight }, wall }
```

- **Placeholders:** the template's own assignment (featured id 6, supporting 1/8/0/5), with the
  rest on the wall.
- **Real testimonials:**
  - **Featured:** Mark Schilling, whose "A Brand Foundation, Not a Website" is the
    website-build quote.
  - **Supporting:** topLeft Grace L., bottomLeft Mike Pryke, bottomRight Dewayne K.
  - **Order:** Dewayne's employment reference sits last, per the provenance note.
  - **Wall:** empty.
- **Mapping:** real items map onto the template's shape (`excerpt` ← `description`,
  `designation` ← `role`, no `image`). Real quotes are never trimmed: the featured card shows
  Mark's full quote, not an editorial cut.
- **Quotation markup** is used only when `verbatim` is true, the same rule as the homepage rail.

### Components (`src/components/testimonials/`)

- **`big-testimonial.jsx`:** the template's bento.
  - **Layout:** a dark featured card between two columns of supporting cards, on a 3-column
    grid at `md` and stacked on mobile.
  - **Scroll-reveal:** the featured quote's words reveal as you scroll (`useScroll` and
    `useTransform` from `motion/react`).
  - **Reduced motion:** uses the site's `useReducedMotion` (`@/components/AccessibilityProvider`),
    so the footer's pause toggle also turns the reveal off and the quote renders as plain text.
  - **`PartnerLink` pill:** kept for placeholders. For real people it shows a company name only
    when one is known, without a link until a URL is given. Otherwise it is hidden. Mark's
    practice name is still outstanding, per the provenance note, so for now the featured card
    shows no pill.
- **`masonry-testimonials.jsx`:** the template's wall, including its orphan-avoiding
  `masonryGridColsClass`. It renders nothing when the wall is empty.
- **`avatar.jsx`:** shows the person's `image` when they have one (placeholders only for now),
  otherwise initials. Both are `aria-hidden`, because the name sits beside them.

## Website-build section (`src/components/website-package/`)

- **Ported pieces:** `index.jsx` (the section), `designing.jsx`, `microinteractions.jsx`,
  `copywriting.jsx`, `consultation.jsx`, `globe.jsx`, `grid-lines.jsx` and `keyboard.jsx` (used by
  copywriting and designing), plus `pattern.jsx` and the needed icons from `icons/general.tsx`.
- **Hover:** cards keep the template's `whileHover="animate"` variants.
- **Reduced motion:** under reduced motion the illustrations render their resting state, and the
  globe does not auto-rotate.
- **Globe:** loaded with `next/dynamic` and `ssr: false`, as the homepage dither cursor is. It
  mounts only in the browser.
- **Remote images:** the illustrations load three, from Aceternity, DiceBear and Unsplash. They
  stay remote via `images.remotePatterns` in `next.config.mjs`. Copying them into `public/` is
  a follow-up.
- **Heading:** "Everything a website build includes, start to finish".
- **CTA:** "Start a website build" → `/contact`. There is no package price or booking link yet.

### Copy, for owner sign-off

| Card               | Title                         | Description                                                                                                          |
| ------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Designing          | Design and build              | From wireframes to a shipped Next.js site, designed and built by the same engineer.                                  |
| Micro-interactions | Micro-interactions and motion | Considered animation, with 3D where it earns its place, and reduced-motion support built in.                         |
| Copywriting        | Copy, SEO and AI search       | Crawlable pages, metadata and machine-readable exports, so you can be found on Google and in ChatGPT and Perplexity. |
| Consultation       | Strategy call first           | Goals, audience, and what the site has to do for the business, before anything is designed.                          |
| Globe (full width) | Launch and beyond             | Deployment, hosting, maintenance, revisions and the design system.                                                   |

Feature list:

- Responsive on every screen
- Dark and light mode
- Modern stack (Next.js, React, Tailwind)
- Regular check-ins
- Built to change after launch
- Design and development by one engineer

## Styling map

| Template                     | Site                                                           |
| ---------------------------- | -------------------------------------------------------------- |
| `font-display`               | the site's display face (`Layer`), as the landing headings use |
| `text-foreground`            | `text-zinc-900 dark:text-zinc-100`                             |
| `bg-primary` (featured card) | `--amw-ink`                                                    |
| `bg-tertiary` glow           | `--amw-accent` at low opacity                                  |
| `bg-gray-100` cards          | `--amw-muted`                                                  |
| `bg-white` quote cards       | `--amw-card`                                                   |
| `ring-black/10`              | `--amw-line`                                                   |
| `--pattern-fg`               | derived from `--amw-grid`                                      |

Both themes must hold, and dark values come from the `.amw` scope.

## Accessibility

- **Landmarks:** every section is a `section` named by a heading or `aria-label`.
- **Quotes:** testimonials use `figure`, with a `blockquote` only for verbatim quotes, and
  `figcaption`.
- **Motion:** nothing moves on its own. The scroll-reveal is tied to scrolling, and hover effects
  to hovering. The globe rotates slowly, so under reduced motion it stays still, and it is
  decorative (`aria-hidden`).
- **Illustrations** are decorative (`aria-hidden`). The card titles and descriptions carry the
  meaning.

## Testing

- **The environment switch:** placeholders are never selected in production or when the
  environment is unknown, and they are selected in dev and preview.
- **Bento assignment:** the real set puts Mark first, has Dewayne last, and leaves the wall
  empty. The placeholder set matches the template's IDs, and the wall excludes the bento.
- **`masonryGridColsClass`:** counts 1 to 9 give the template's classes.
- **Featured quote:** under reduced motion it renders as plain text, and in full.
- **Website-build section:** it renders the approved copy, and the CTA links to `/contact`.
- **Removed:** the carousel component and its test go. `src/content/site/testimonials.js` stays.
- **Visual check** of both sections, in light and dark, on the Vercel preview.

## Owner sign-off before merge

- [ ] Every card title and description in the copy table: confirm or strike.
- [ ] The featured testimonial (Mark) and the supporting order.
- [ ] Headshots or links for any of the four, if available.

## Out of scope and follow-ups

- **Package pricing and booking:** the section's CTA is `/contact` until a package exists in
  Payload or Whop.
- **Remote images:** copying the illustrations' remote images into `public/`.
- **New real testimonials:** Tavarse Green (EdenKode), Intch and LinkedIn. When they arrive, the
  wall fills.
