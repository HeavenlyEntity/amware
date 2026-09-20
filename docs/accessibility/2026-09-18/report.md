# AMWare accessibility remediation

Published to https://www.amware.dev on September 18, 2026. Target: WCAG 2.2 Level AA. This is an engineering audit and remediation record, not a declaration of full WCAG conformance or legal ADA certification.

## Scope

The 26 public routes and states listed in [pages-after.json](./pages-after.json), plus navigation open/close, contact field focus, equity calculator steps, keyboard slider changes, and job-offer results. Portfolio, articles, storefront, contact forms, Founders’ Desk, story, and checkout landing/error states are included. `/ai/*` is excluded as requested. Authenticated CMS administration, private purchase/access-token states, and completed third-party payment/scheduling flows were not audited.

The requested high-end-visual-design, design-taste-frontend, and Product Design audit guidance informed the work. Existing typography, brand colors, and layouts were retained where possible; `/story` now presents the existing narrative in readable sections with optional, user-controlled silent clips.

## Resolved findings

| Area                  | Change                                                                                                                                                                             | Relevant WCAG criteria                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Navigation            | Skip link focuses main content; open navigation contains keyboard focus, makes background inert, restores focus on Escape, and removes closing links immediately                   | 2.1.1, 2.4.1, 2.4.3, 4.1.2                                           |
| Focus                 | Visible two-color focus indication, scroll clearance below fixed navigation, forced-colors support, inset indication inside joined controls                                        | 2.4.7, 2.4.11                                                        |
| Forms and calculators | Sliders name the actual interactive thumb, expose formatted values and hints, retain arrow-key operation; step headings receive focus forwards and backwards                       | 1.3.1, 2.1.1, 2.4.3, 4.1.2                                           |
| Contrast              | Stronger muted metadata, article links, code punctuation, placeholders, and input boundaries; article links have underlines                                                        | 1.4.1, 1.4.3, 1.4.11                                                 |
| Motion                | Pause controls for continuous effects, shared reduced-motion preference, static accessible counter values, hidden visual digit reels                                               | 2.2.2, 1.3.1; reduced-motion support also improves comfort beyond AA |
| Structure             | One page-level heading on audited routes, article subheadings, product-list heading, FAQ question headings, consistent footer heading levels, redundant repeated landmarks removed | 1.3.1, 2.4.6                                                         |
| Reflow                | Job-offer result scenario controls wrap at narrow widths; slider targets are at least 24px and slider rows 44px                                                                    | 1.4.10, 2.5.8                                                        |
| Contact alternative   | Direct email remains available when a visitor cannot use the CAPTCHA; verification stays enforced on form submissions                                                              | Alternative contact path                                             |
| Story                 | Narrative is server-rendered and independent of JavaScript/video; native controls replace scroll-driven playback                                                                   | 1.3.1, 2.1.1, 2.2.2                                                  |

## Verification

- **689 tests passed**, including new focus-trap, immediate menu dismissal, slider naming/keyboard operation, motion preference, counter semantics, and forward/back wizard-focus regressions.
- Changed-file ESLint: **zero errors**; four existing image-optimization warnings. Prettier and TypeScript checks passed. Production build passed locally and on Vercel.
- Required code-quality review completed. Its menu-exit and wizard-return focus findings were fixed and covered by regression tests.
- **26 captured routes/states: zero axe semantic violations** in [semantic-after.json](./semantic-after.json). The checker runs axe on hydrated HTML in jsdom, applies browser-captured visibility, and disables color-contrast because jsdom has no browser layout. Incomplete checks remain listed; this is not a full browser axe certification.
- Every captured route has one `main` and one `h1`. All 26 views fit a **320 CSS-pixel viewport without page-wide horizontal scrolling**: [reflow-after.json](./reflow-after.json). This is reflow evidence, not a substitute for every zoom/text-spacing/browser combination.
- Browser-computed text-color/background checks covered light and dark themes. Confirmed article-link and code-punctuation failures were corrected and rechecked in both themes. Complex image/gradient/hover states still require manual visual assessment.
- Browser keyboard checks confirmed skip-link focus, menu wrapping/restoration, named slider increments, and incoming calculator heading focus. The contact email field has a clearly visible focus ring.
- Live deployment verified: skip link and modal menu behavior, readable story with six non-autoplay controlled clips, direct-email fallback, and the CAPTCHA reporting **“Security check complete.”** No contact message or payment was submitted.

Production deployment: `dpl_Eg84YPm1gtjpQx6jxA2FnbHubiE2`. Source was deployed from an isolated snapshot containing these changes and the existing CAPTCHA work, excluding unrelated local files.

## Visual evidence

- [Original menu](./02-menu-before.png)
- [Live updated menu](./03-menu-after.png)
- [Mobile contact focus](./04-contact-mobile-after.png)
- [Mobile results and focus](./05-calculator-mobile-after.png)
- [Live readable story](./06-story-after.png)

## Remaining conformance work

A full conformance claim still requires hands-on VoiceOver/Safari and NVDA/Firefox or Chrome testing, complete workflows with real licensed access, third-party CAPTCHA/payment/scheduling accessibility review, and manual evaluation of all success criteria, including text-spacing overrides, forced-colors rendering, media alternatives, and non-default interactive states. Automated tests and selected browser checks cannot establish ADA legal compliance. New CMS content and third-party changes can also introduce new failures.

Reference standards: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/), and [DOJ web accessibility guidance](https://www.ada.gov/resources/web-guidance/).
