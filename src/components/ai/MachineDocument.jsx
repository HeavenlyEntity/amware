import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm-modern'
import { topics } from '@/lib/ai/documents'
import { personSchema } from '@/lib/seo/schema'

function MachineTable({ node, children }) {
  const text = (n) =>
    n.type === 'text' ? n.value : (n.children ?? []).map(text).join('')
  const head = node.children.find((n) => n.tagName === 'thead')
  if (text(head ?? {}).replace(/\s/g, '') !== 'FieldValue')
    return <table>{children}</table>
  const rows =
    node.children
      .find((n) => n.tagName === 'tbody')
      ?.children.filter((n) => n.tagName === 'tr') ?? []
  return (
    <dl className="machine-facts">
      {rows.map((row, i) => {
        const cells = row.children.filter((n) => n.tagName === 'td')
        return (
          <div key={i}>
            <dt>{text(cells[0])}</dt>
            <dd>
              {cells[1].children.map((n, j) =>
                n.tagName === 'a' ? (
                  <a key={j} href={n.properties.href}>
                    {text(n)}
                  </a>
                ) : (
                  text(n)
                )
              )}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

export function MachineNavigation({ current }) {
  return (
    <nav className="machine-nav" aria-label="Machine pages">
      {topics.map(([id]) => (
        <a
          key={id}
          href={'/ai/' + id}
          aria-current={
            current === id ||
            current?.startsWith(id + '/') ||
            (id === 'articles' && current?.startsWith('blog'))
              ? 'page'
              : undefined
          }
        >
          /ai/{id}
        </a>
      ))}
    </nav>
  )
}
export function MachineUnavailable({ id }) {
  return (
    <>
      <MachineNavigation current={id} />
      <main id="machine-content">
        <h1>Source temporarily unavailable</h1>
        <p>
          This document could not be loaded. Its contents have not been reported
          as an empty catalog.
        </p>
        <a href={'/ai/' + id}>Refresh this page</a>
        <p>
          <a href="/ai/about">Read about Alec</a> or{' '}
          <a href="/ai/contact">get in touch</a>.
        </p>
      </main>
    </>
  )
}
/* Shown while a document's sources are being read. The navigation renders
   above it exactly as it does on a loaded page, so an agent or a person can
   move on without waiting.

   The body is a blinking block cursor rather than grey skeleton blocks.
   Skeletons are a light-UI convention that mimes a layout the reader has not
   seen yet; a terminal that is waiting shows a cursor and nothing else, and it
   does not pretend to know the shape of what is coming. Nothing here claims
   the document is empty. */
export function MachineLoading({ current }) {
  return (
    <>
      <MachineNavigation current={current} />
      <main id="machine-content" aria-busy="true">
        <p className="machine-sr" role="status">
          Loading document.
        </p>
        <span className="machine-cursor" aria-hidden="true" />
      </main>
    </>
  )
}
export function MachineDocument({ doc }) {
  const schema = doc.author
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: doc.title,
        author: { '@type': 'Person', name: doc.author },
        url: doc.source,
        ...(doc.published ? { datePublished: doc.published } : {}),
      }
    : {
        /* The same Person node the human site publishes, so both
           layers describe one entity under one @id. */
        '@context': 'https://schema.org',
        ...personSchema(),
      }
  return (
    <>
      <MachineNavigation current={doc.id} />
      <main id="machine-content">
        <article>
          <header className="machine-document-header">
            <h1>
              {doc.id === 'home'
                ? 'AMWARE :: machine-readable index'
                : doc.title}
            </h1>
            <p>{doc.summary}</p>
            {doc.id !== 'home' && (
              <p className="machine-meta">
                <a href={doc.source}>Original page</a>
                <a href={doc.markdown}>Read Markdown</a>
                {doc.author && <span>By {doc.author}</span>}
                {doc.published && (
                  <time dateTime={doc.published}>
                    {String(doc.published).slice(0, 10)}
                  </time>
                )}
              </p>
            )}
          </header>
          {doc.warnings?.length > 0 && (
            <aside className="machine-notice">
              <p>
                Some catalog previews are temporarily unavailable:{' '}
                {doc.warnings.join(', ')}. Other content remains available.
              </p>
              <a href={doc.machine}>Refresh this page</a>
            </aside>
          )}
          <div className="machine-prose">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: MachineTable,
                pre: ({ children }) => (
                  <pre tabIndex={0} aria-label="Code example">
                    {children}
                  </pre>
                ),
                img: ({ alt }) => (
                  <span className="machine-image-caption">
                    Image: {alt || 'illustration'}.{' '}
                    <a href={doc.source}>View on original page</a>
                  </span>
                ),
              }}
            >
              {doc.body}
            </Markdown>
          </div>
          {doc.totalPages > 1 && (
            <nav className="machine-pagination" aria-label="Document pages">
              {doc.page > 1 && (
                <a href={doc.machine + '?page=' + (doc.page - 1)}>
                  Previous page
                </a>
              )}
              <span>
                Page {doc.page} of {doc.totalPages}
              </span>
              {doc.page < doc.totalPages && (
                <a href={doc.machine + '?page=' + (doc.page + 1)}>Next page</a>
              )}
            </nav>
          )}
        </article>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
          }}
        />
      </main>
    </>
  )
}
