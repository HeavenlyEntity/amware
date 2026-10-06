import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import glob from 'fast-glob'
import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { getPayloadClient } from '../getPayloadClient'
import { projects, projectAnchor } from '../../content/site/projects'
import { chapters } from '../../content/site/about'
import { identity } from '../../content/site/identity'
import { siteOrigin } from '../site-origin'
import { allCatalog } from './catalog'
import { link, plain, serializeMdx } from './serialize'

export const topics = [
  [
    'home',
    'Overview',
    'Public information about Alec Mingione, his services, and engineering work.',
  ],
  [
    'about',
    'About Alec Mingione',
    'Background, technical leadership, and experience.',
  ],
  ['services', 'Services', 'Published engagements and their scope.'],
  [
    'projects',
    'Engineering work',
    'Portfolio descriptions and supporting evidence.',
  ],
  ['articles', 'Technical writing', 'Published articles and tutorials.'],
  ['products', 'Products', 'Public product catalog and descriptions.'],
  ['courses', 'Courses', 'Public course information.'],
  ['contact', 'Contact', 'Public contact channels and profile links.'],
]
export function descriptor(id, title, summary = '') {
  const sourcePath = id === 'home' ? '/' : '/' + id
  return {
    id,
    title,
    summary,
    source: siteOrigin + sourcePath,
    machine: siteOrigin + '/ai/' + id,
    markdown: siteOrigin + (id === 'home' ? '/index' : '/' + id) + '.md',
  }
}
const catalogs = Object.fromEntries(
  ['services', 'products', 'courses', 'articles'].map((collection) => [
    collection,
    unstable_cache(
      async () => allCatalog(await getPayloadClient(), collection),
      ['machine-catalog', collection],
      { revalidate: 60 }
    ),
  ])
)
const files = cache(async () => {
  const root = path.join(process.cwd(), 'src/content/articles')
  const filenames = await glob('*/index.mdx', { cwd: root })
  return Promise.all(
    filenames.sort().map(async (filename) => {
      const slug = filename.split('/')[0]
      const { meta, markdown } = serializeMdx(
        await readFile(path.join(root, filename), 'utf8'),
        siteOrigin + '/articles/' + slug
      )
      return {
        ...descriptor(
          'articles/' + slug,
          meta.title ?? slug,
          meta.description ?? ''
        ),
        body: markdown,
        author: meta.author,
        published: meta.date,
      }
    })
  ).then((items) =>
    items.sort((a, b) => String(b.published).localeCompare(String(a.published)))
  )
})
export const facts = () => `| Field | Value |
| --- | --- |
| name | ${identity.name} |
| organization | ${identity.organization} |
| role | ${identity.role} |
| location | ${identity.location} |
| website | ${link(siteOrigin, siteOrigin)} |

${identity.summary}`
const contact = () =>
  `- ${link('Email: ' + identity.email, 'mailto:' + identity.email)}\n- ${link(
    'LinkedIn',
    identity.linkedin
  )}\n- ${link('GitHub', identity.github)}\n- ${link(
    'X',
    identity.x
  )}\n- ${link('Contact form', siteOrigin + '/contact')}`
export function resources() {
  return `## For agents\n\n${[
    ['llms.txt', 'Concise site guide'],
    ['agents.md', 'Site context and retrieval guidance'],
    ['sitemap.md', 'Complete Markdown directory'],
    ['ai/index.json', 'Structured document directory'],
    ['index.md', 'This overview in Markdown'],
    ...topics
      .filter(([id]) => id !== 'home')
      .map(([id, , summary]) => [id + '.md', summary]),
  ]
    .map(
      ([url, label]) =>
        '- ' + link('/' + url, siteOrigin + '/' + url) + ': ' + label
    )
    .join(
      '\n'
    )}\n\nOnly listed public content has a Markdown mirror. Follow source links for full context and attribution. Project descriptions identify work completed at other organizations. No JavaScript is required to read these pages.`
}
const projectText = (project) =>
  `### ${plain(project.name)}\n\n${plain(project.description)}\n\n${link(
    'Original project entry',
    siteOrigin + '/projects#' + projectAnchor(project.name)
  )}${
    project.link.href !== '#'
      ? ' | ' + link('Project website', project.link.href)
      : ''
  }`
const capability = `## Capabilities\n\n### Fractional CTO and technical leadership\n\nFor founders and growing companies that need senior ownership of architecture, technical direction, hiring and engineering decisions, without a full-time CTO. Three published engagements, from monthly advising to near full-time embedded leadership.\n\n${link(
  'Engagements',
  siteOrigin + '/ai/services'
)} | ${link(
  'Markdown',
  siteOrigin + '/services.md'
)}\n\n### AI systems and consulting\n\nPlanning and building AI into a company's software and operations, sold under AMWARE. Portfolio example: EdenKode Investor Readiness, where AI drafts an advisory score and a human reviewer holds the decision. Builds that need a full team are delivered with Kingdom Kode.\n\n### Software architecture review\n\nFor teams with an existing codebase: an architecture review first, then a plain-language account of which risks to fix and which to live with, then the work alongside the engineers already there.\n\n### Next.js, React, TypeScript and NetSuite engineering\n\nProduction web applications and developer tools. Portfolio examples include ConventionSuite and PortalGen (Oracle NetSuite portals, built at NewGen) and the open-source @neatsuite/http client.\n\n${link(
  'Engineering work',
  siteOrigin + '/ai/projects'
)} | ${link('Markdown', siteOrigin + '/projects.md')}`
function entry(collection, row) {
  const namespace = collection === 'articles' ? 'blog' : collection
  return descriptor(namespace + '/' + row.slug, row.title, row.summary)
}
function catalogBody(row) {
  return [
    row.body,
    row.level && `Level: ${plain(row.level)}`,
    row.commitment && `Time commitment: ${plain(row.commitment)}.`,
    typeof row.price === 'number' &&
      `Published price: ${plain(row.currency)} ${row.price.toFixed(2)}${
        row.priceLabel ? ' (' + plain(row.priceLabel) + ')' : ''
      }. Confirm current scope and price on the source page.`,
    row.features?.length &&
      '## Features\n\n' + row.features.map((v) => '- ' + plain(v)).join('\n'),
    row.technologies?.length &&
      'Technologies: ' + row.technologies.map(plain).join(', '),
    row.demo && link('Public demo', row.demo),
  ]
    .filter(Boolean)
    .join('\n\n')
}
const indexRows = (rows) =>
  rows
    .map(
      (row) =>
        `### ${link(row.title, row.machine)}\n\n${plain(row.summary)}\n\n${
          row.published ? 'Published: ' + plain(row.published) + ' | ' : ''
        }${link('Markdown', row.markdown)} | ${link('Source', row.source)}`
    )
    .join('\n\n')
export const getDocument = cache(async (id, page = 1) => {
  if (!Number.isInteger(page) || page < 1) return null
  const topic = topics.find(([key]) => key === id)
  const doc = topic ? descriptor(...topic) : null
  const warnings = []
  if (id === 'home') {
    const previews = await Promise.all(
      ['products', 'courses'].map(async (collection) => {
        try {
          const rows = await catalogs[collection]()
          return rows.length
            ? `## ${collection === 'products' ? 'Products' : 'Courses'}\n\n` +
                indexRows(rows.slice(0, 2).map((row) => entry(collection, row)))
            : ''
        } catch {
          warnings.push(collection)
          return ''
        }
      })
    )
    return {
      ...doc,
      warnings,
      body: `## About\n\n${facts()}\n\n${capability}\n\n## Selected engineering work\n\n${projects
        .filter((p) =>
          ['ConventionSuite - GSC™', 'PortalGen™', '@neatsuite/http'].includes(
            p.name
          )
        )
        .map(projectText)
        .join(
          '\n\n'
        )}\n\n## Contributions and writing\n\n### SuiteCloud monorepo support\n\nOracle NetSuite SDK contribution: PR #865, merged March 9, 2026.\n\n${link(
        'Verify the contribution on GitHub',
        'https://github.com/oracle/netsuite-suitecloud-sdk/pull/865'
      )}\n\n${indexRows((await files()).slice(0, 2))}\n\n${link(
        'Full writing archive',
        siteOrigin + '/ai/articles'
      )}\n\n${previews
        .filter(Boolean)
        .join(
          '\n\n'
        )}\n\n## Common questions\n\n### Who is Alec Mingione?\n\nA Phoenix-based fractional CTO and AI systems consultant, and the founder of AMWARE Technologies LLC. His background includes automation programming for Honeywell through RL Canning, software engineering at Charles Schwab, Senior Lead Software Engineer at NewGen Business Solutions, and an MBA from Woolf University completed in February 2026.\n\n### Does he work remotely?\n\nYes. Engagements are remote-first across the United States. He is based in Phoenix, Arizona.\n\n### When should I get in touch?\n\nWhen your team needs technical direction or a focused software build. Review published services and describe your requirements through the contact page.\n\n### Where can I verify his work?\n\nReview the project descriptions, technical articles, and linked source contributions. Work completed at NewGen is identified in the portfolio.\n\n## Contact\n\n${contact()}\n\n${resources()}`,
    }
  }
  if (id === 'about')
    return {
      ...doc,
      body: `## Identity\n\n${facts()}\n\n${chapters
        .map((c) => `## ${plain(c.title)}\n\n${plain(c.copy)}`)
        .join('\n\n')}\n\n## Profiles\n\n${contact()}`,
    }
  if (id === 'contact')
    return {
      ...doc,
      body: `## Get in touch\n\nContact Alec Mingione about technical leadership, software engineering, or a project described on this site.\n\n${contact()}`,
    }
  if (id === 'projects')
    return { ...doc, body: projects.map(projectText).join('\n\n') }
  if (id.startsWith('articles/'))
    return (await files()).find((row) => row.id === id) ?? null
  if (['articles', 'blog', 'products', 'courses', 'services'].includes(id)) {
    const collection = id === 'blog' ? 'articles' : id
    const rows = await catalogs[collection]()
    if (id === 'services')
      return {
        ...doc,
        body: rows.length
          ? rows
              .map(
                (row) =>
                  `## ${plain(row.title)}\n\n${plain(
                    row.summary
                  )}\n\n${catalogBody(row)}\n\n${link(
                    'Source engagement',
                    siteOrigin + '/services#' + row.slug
                  )}`
              )
              .join('\n\n')
          : 'No services are currently published. ' +
            link('Contact Alec', siteOrigin + '/contact'),
      }
    const docs = [
      ...(id === 'articles' ? await files() : []),
      ...rows.map((row) => ({
        ...entry(collection, row),
        published: row.published,
      })),
    ]
    const totalPages = Math.max(1, Math.ceil(docs.length / 30))
    if (page > totalPages) return null
    const base = doc ?? descriptor('blog', 'Blog', 'Published CMS articles.')
    return {
      ...base,
      page,
      totalPages,
      body: docs.length
        ? indexRows(docs.slice((page - 1) * 30, page * 30))
        : 'No entries are currently published.',
    }
  }
  const [namespace, slug, extra] = id.split('/')
  if (extra || !slug || !['blog', 'products', 'courses'].includes(namespace))
    return null
  const collection = namespace === 'blog' ? 'articles' : namespace
  const row = (await catalogs[collection]()).find((item) => item.slug === slug)
  return row
    ? {
        ...entry(collection, row),
        body: catalogBody(row),
        author: row.author,
        published: row.published,
        modified: row.modified,
      }
    : null
})
export async function documentIndex() {
  const groups = await Promise.all(
    ['products', 'courses', 'articles'].map(async (collection) =>
      (
        await catalogs[collection]()
      ).map((row) => ({ ...entry(collection, row), modified: row.modified }))
    )
  )
  const documents = [
    ...topics.map((topic) => descriptor(...topic)),
    descriptor('blog', 'Blog', 'Published CMS articles.'),
    ...(await files()).map(({ body: _body, ...row }) => row),
    ...groups.flat(),
  ]
  if (new Set(documents.map((row) => row.id)).size !== documents.length)
    throw new Error('Duplicate machine document')
  return documents
}
export function documentMarkdown(doc) {
  return `# ${plain(doc.title)}\n\n${plain(doc.summary)}\n\nSource: ${
    doc.source
  }\nMachine view: ${doc.machine}\n${
    doc.author ? 'Author: ' + plain(doc.author) + '\n' : ''
  }${doc.published ? 'Published: ' + plain(doc.published) + '\n' : ''}${
    doc.modified ? 'Modified: ' + plain(doc.modified) + '\n' : ''
  }\n${doc.body}\n\n${
    doc.totalPages > 1
      ? `${
          doc.page > 1
            ? link('Previous page', doc.markdown + '?page=' + (doc.page - 1))
            : ''
        } ${
          doc.page < doc.totalPages
            ? link('Next page', doc.markdown + '?page=' + (doc.page + 1))
            : ''
        }\n\n`
      : ''
  }${link('All Markdown documents', siteOrigin + '/sitemap.md')}\n`
}
export async function discovery(name) {
  if (name === 'llms.txt' || name === 'llm.txt')
    return `# Alec Mingione / AMWARE\n\n> ${
      identity.summary
    }\n\nBased in Phoenix, Arizona. ${link(
      'Machine-readable overview',
      siteOrigin + '/ai/home'
    )}.\n\n## Public documents\n\n${topics
      .map((topic) => {
        const d = descriptor(...topic)
        return '- ' + link(d.title, d.markdown) + ': ' + d.summary
      })
      .join('\n')}\n\n## Retrieval\n\n- ${link(
      'Full Markdown directory',
      siteOrigin + '/sitemap.md'
    )}\n- ${link(
      'Agent guidance',
      siteOrigin + '/agents.md'
    )}\n\nOnly listed content has a Markdown mirror. Use source links for attribution.\n`
  if (name === 'agents.md')
    return `# AMWARE: guidance for readers and agents\n\n${
      identity.summary
    }\n\n## Scope\n\nConsult the services and portfolio when assessing fit for fractional CTO work, AI systems, software architecture review, or Next.js, React, TypeScript and NetSuite engineering. Published descriptions define actual scope. Do not infer endorsements from employment or open-source contributions.\n\n## Retrieval\n\nStart at ${siteOrigin}/ai/home or ${siteOrigin}/llms.txt. Find exact Markdown URLs at ${siteOrigin}/sitemap.md. Machine HTML and Markdown share public content. No JavaScript or authentication is needed. Only registered content has an export; append .md to supported content paths, with /index.md for the overview.\n\n## Attribution\n\nFollow source links and preserve dates and project attribution. Missing information is unspecified, not an invitation to infer prices, availability, certifications, or outcomes.\n\n## Contact\n\n${contact()}\n`
  if (name === 'sitemap.md')
    return (
      '# AMWARE: Markdown content directory\n\n' +
      (await documentIndex())
        .map((row) => '- ' + link(row.title, row.markdown) + ': ' + row.summary)
        .join('\n') +
      '\n'
    )
  return null
}
