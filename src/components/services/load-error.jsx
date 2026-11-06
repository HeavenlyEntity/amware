'use client'

/* What the engagements panel shows when the services could not be read: the
   page still renders (a public page degrades, never throws), says so, and
   offers the one thing that might fix it. The hero and the band fall back
   to the contact form in the meantime. */

export function EngagementsLoadError() {
  return (
    <div role="status" className="svc-load-error">
      <p className="amw-mono text-sm text-zinc-700 dark:text-zinc-300">
        The engagements couldn’t be loaded just now.
      </p>
      <button
        type="button"
        className="amw-cta svc-cta mt-5"
        onClick={() => window.location.reload()}
      >
        Refresh
      </button>
    </div>
  )
}
