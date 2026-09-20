// Semantic audit of browser-captured HTML. Layout/contrast require browser review.
import { JSDOM } from 'jsdom'
import axe from 'axe-core'
import fs from 'node:fs/promises'
import path from 'node:path'
const dir = process.argv[2]
const suffix = process.argv[3] ?? 'before'
const reports = []
for (const file of (await fs.readdir(dir)).filter(
  (f) => !f.startsWith('ai-') && f.endsWith(`-${suffix}.html`)
)) {
  const html = (await fs.readFile(path.join(dir, file), 'utf8')).replace(
    /style="([^"]*)"/g,
    (_, css) =>
      `style="${css.replace(/(?:^|;)\s*background(?:-[\w-]+)?\s*:[^;]*/g, '')}"`
  )
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://www.amware.dev',
  })
  // Apply only computed visibility captured with this exact DOM snapshot.
  // jsdom cannot load the browser's responsive stylesheet itself.
  try {
    const hidden = JSON.parse(
      await fs.readFile(
        path.join(dir, file.replace('.html', '-hidden.json')),
        'utf8'
      )
    )
    const elements = dom.window.document.querySelectorAll('*')
    for (const index of hidden) elements[index]?.setAttribute('hidden', '')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  dom.window.eval(axe.source)
  const result = await dom.window.axe.run(dom.window.document, {
    runOnly: {
      type: 'tag',
      values: [
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
        'wcag22aa',
        'best-practice',
      ],
    },
    rules: { 'color-contrast': { enabled: false } },
  })
  reports.push({
    page: file,
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map((n) => ({
        html: n.html,
        target: n.target,
        failureSummary: n.failureSummary,
      })),
    })),
    incomplete: result.incomplete.map((v) => v.id),
  })
  dom.window.close()
}
await fs.writeFile(
  path.join(dir, `semantic-${suffix}.json`),
  JSON.stringify(reports, null, 2)
)
console.log(
  JSON.stringify(
    reports.filter((r) => r.violations.length),
    null,
    2
  )
)
