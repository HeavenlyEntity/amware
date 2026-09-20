export { priceText, typeMeta } from '@/components/commerce/catalog-meta'
export {
  CourseCard,
  ProductCard,
  ServiceCard,
} from '@/components/commerce/catalog-cards'

/* Store chrome shared by the catalog pages: the datasheet hero and the
   terminal-style empty state. The cards live in catalog-cards.jsx (client,
   motion) in the minimal template's grammar. */

/* ---- hero ---------------------------------------------------------------- */

export function StoreHero({ eyebrow, title, intro, meta }) {
  return (
    <div className="amw-ticks border-[var(--amw-line)] bg-[var(--amw-card)] relative overflow-hidden rounded-2xl border">
      <div
        className="amw-grid-bg amw-grid-fade absolute inset-0"
        aria-hidden="true"
      />
      <div className="relative px-6 py-12 sm:px-12 sm:py-16">
        <p className="amw-eyebrow">{eyebrow}</p>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-[3.25rem] sm:leading-[1.05]">
          {title}
        </h1>
        {intro && (
          <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            {intro}
          </p>
        )}
        {meta && <div className="mt-8 flex flex-wrap gap-2">{meta}</div>}
      </div>
    </div>
  )
}

/* ---- empty state (terminal boot) ---------------------------------------- */

export function StoreEmpty({ label = 'catalog' }) {
  return (
    <div className="border-[var(--amw-line-strong)] relative mt-10 overflow-hidden rounded-2xl border border-dashed">
      <div
        className="amw-grid-bg absolute inset-0 opacity-60"
        aria-hidden="true"
      />
      <div className="relative px-6 py-16 text-center">
        <p className="amw-mono text-[var(--amw-mut)] text-sm">
          <span className="text-[var(--amw-accent-ink)]">$</span> amware {label}{' '}
          --list
        </p>
        <p className="amw-mono amw-cursor mt-3 text-sm text-zinc-700 dark:text-zinc-300">
          0 published, provisioning
        </p>
        <p className="mx-auto mt-5 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
          This {label} is being prepared. Publish items in the admin to bring
          this page to life.
        </p>
      </div>
    </div>
  )
}
