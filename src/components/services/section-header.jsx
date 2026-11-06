/* The numbered section header the services board draws for "Two ways in."
   (the design system's SectionHeader): the `// SEC.nn / LABEL` eyebrow over
   a dashed rule with the meta on the right, then the Layer heading and its
   copy. Taken from the homepage's (HomeContent.legacy.jsx), left-aligned as
   that one is. The "// SEC.nn /" prefix is decoration and is hidden from
   assistive tech; the label is what is read. */

export function SectionHeader({ id, index, eyebrow, meta, title, copy }) {
  return (
    <div className="svc-section-header">
      <div className="border-[var(--amw-line)] flex items-baseline justify-between gap-4 border-b border-dashed pb-4">
        <p className="amw-eyebrow svc-eyebrow">
          <span aria-hidden="true">{`// SEC.${index} / `}</span>
          {eyebrow}
        </p>
        {meta ? (
          <span className="amw-kicker hidden sm:block">{meta}</span>
        ) : null}
      </div>
      <h2 id={id} className="svc-h2 mt-8">
        {title}
      </h2>
      {copy ? (
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          {copy}
        </p>
      ) : null}
    </div>
  )
}
