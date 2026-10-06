import { Avatar } from './avatar'
import { masonryGridColsClass } from './masonry-grid'

/* Ported from the studio template's MasonryTestimonials: every
   testimonial not already in the bento, as a wall of quote cards whose
   column count never strands one card alone on the last row. It renders
   nothing when nothing is left over. In production it holds the
   employment references, which stay out of the bento. */

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
                  className="size-11 ring-[var(--amw-line)] ring-1"
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
