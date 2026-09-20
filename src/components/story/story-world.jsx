import Link from 'next/link'

/* The narrative is available without JavaScript, scrolling effects or video.
   Silent decorative clips are optional; the adjacent text carries the message. */

const SECTIONS = [
  {
    id: 'grind',
    label: 'The Grind',
    still: '/story/still_1.webp',
    clip: '/story/vid/dive_1.mp4',
    accent: '#3ce8ce',
    eyebrow: 'SOUND FAMILIAR',
    title: 'Your product is dying in the plumbing.',
    body: 'Auth, billing, deploys, admin. Months of runway spent rebuilding what every product already has, while the thing only you can build waits.',
    tags: ['auth again', 'billing again', 'still not live'],
  },
  {
    id: 'cost',
    label: 'The Cost',
    still: '/story/still_2.webp',
    clip: '/story/vid/dive_2.mp4',
    accent: '#3ce8ce',
    eyebrow: 'EVERY WEEK YOU WAIT',
    title: 'Slow shipping is the silent killer.',
    body: 'Every week not live is interest paid on nothing: no users, no feedback, no revenue. The market does not wait for polish.',
    tags: ['runway burns daily'],
  },
  {
    id: 'forge',
    label: 'The Forge',
    still: '/story/still_3.webp',
    clip: '/story/vid/dive_3.mp4',
    accent: '#3ce8ce',
    eyebrow: 'THE MECHANISM',
    title: 'Forged where failure was expensive.',
    body: "Factory floors that could not stop. A bank's production code that could not break. Two startups of my own. The playbook survived because it had to.",
    tags: ['since 2017', 'schwab-grade', '2 companies founded'],
  },
  {
    id: 'catalog',
    label: 'The Catalog',
    still: '/story/still_4.webp',
    clip: '/story/vid/dive_4.mp4',
    accent: '#3ce8ce',
    scroll: 1.6,
    linger: 0.45,
    eyebrow: 'THE STACK',
    title: 'Skip the first three months.',
    body: 'Production boilerplates with auth, billing, CMS and deploys already wired, plus a fractional CTO who has shipped them before. Days to launch, not quarters.',
    tags: ['boilerplates', 'fractional cto', 'ship in days'],
  },
  {
    id: 'proof',
    label: 'Field Evidence',
    still: '/story/still_5.webp',
    clip: '/story/vid/dive_5.mp4',
    accent: '#3ce8ce',
    eyebrow: 'FIELD EVIDENCE',
    title: 'Shipped, not staged.',
    body: 'Kingdom Kode, MiPi, client builds that are live and earning. The same foundations you would be starting on.',
    tags: ['live products', 'real deadlines'],
  },
  {
    id: 'desk',
    label: 'The Creed',
    still: '/story/still_6.webp',
    clip: '/story/vid/dive_6.mp4',
    accent: '#3ce8ce',
    scroll: 1.7,
    linger: 0.5,
    eyebrow: 'THE CREED',
    title: 'A Masterpiece Will Always Require Effort.',
    body: 'That is the name: AMWARE. Bring the effort and I bring everything I have already built. If the foundations do not save you time, I will make it right.',
    cta: {
      primary: { label: 'work with me', href: '/services' },
      secondary: { label: 'browse boilerplates', href: '/products' },
    },
  },
]

export default function StoryWorld() {
  return (
    <article className="amw mx-auto max-w-5xl px-6 py-12 text-zinc-900 dark:text-zinc-100 sm:px-8">
      <header className="mb-12 max-w-3xl">
        <p className="amw-eyebrow">The AMWARE story</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          A Masterpiece Will Always Require Effort.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          From the midnight grind to shipped products. Read the story below;
          each silent scene is optional and plays only when you choose.
        </p>
      </header>
      <nav aria-label="Story chapters" className="mb-12">
        <ol className="flex flex-wrap gap-x-6 gap-y-2">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#story-${section.id}`}
                className="min-h-11 inline-flex items-center underline underline-offset-4"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="space-y-16">
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={`story-${section.id}`}
            aria-labelledby={`story-title-${section.id}`}
          >
            <p className="amw-eyebrow">{section.eyebrow}</p>
            <h2
              id={`story-title-${section.id}`}
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              {section.title}
            </h2>
            <p
              id={`story-copy-${section.id}`}
              className="mt-4 max-w-3xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400"
            >
              {section.body}
            </p>
            <div className="mt-6 overflow-hidden rounded-xl bg-[#0b0b0f]">
              {/* These silent clips illustrate, rather than add to, the adjacent text. */}
              <video
                controls
                muted
                playsInline
                preload="none"
                poster={section.still}
                aria-label={`${section.label}: optional silent illustration`}
                aria-describedby={`story-copy-${section.id}`}
                className="aspect-video w-full object-contain"
              >
                <source src={section.clip} type="video/mp4" />
                Your browser cannot play this optional scene. The complete story
                is in the text above.
              </video>
            </div>
            {section.cta && (
              <div className="mt-6 flex flex-wrap gap-4">
                {Object.values(section.cta).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="min-h-11 inline-flex items-center rounded-md border border-zinc-500 px-5 py-3 font-medium underline underline-offset-4"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </article>
  )
}
