import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { projects } from '../../../content/site/projects'
import { toPayload } from '../cms'

vi.mock('react', () => ({ cache: (fn) => fn }))
const find = vi.fn()
vi.mock('../../getPayloadClient', () => ({
  getPayloadClient: async () => ({ find }),
}))

const { loadProjects, loadProjectsForPage } = await import('../load')

const docs = projects.map((p, i) => ({ ...toPayload(p, i), id: i + 1 }))

describe('loading projects', () => {
  beforeEach(() => {
    find.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('counts the bench from the checkbox, not the position', async () => {
    const twoOnBench = docs.map((d, i) => ({ ...d, onBench: i < 2 }))
    find.mockResolvedValue({ docs: twoOnBench })
    const { projects: list, benchCount } = await loadProjects()
    expect(benchCount).toBe(2)
    expect(list).toHaveLength(projects.length)
    expect(list.slice(0, 2).map((p) => p.key)).toEqual(
      projects.slice(0, 2).map((p) => p.key)
    )
  })

  it('uses the static file while the collection is empty', async () => {
    find.mockResolvedValue({ docs: [] })
    expect(await loadProjects()).toEqual({ projects, benchCount: 3 })
  })

  it('falls back to the static file on a database error', async () => {
    find.mockRejectedValue(new Error('down'))
    expect(await loadProjects()).toEqual({ projects, benchCount: 3 })
  })

  it('rethrows on the page during a production regeneration', async () => {
    find.mockRejectedValue(new Error('down'))
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PHASE', 'phase-production-server')
    await expect(loadProjectsForPage()).rejects.toThrow('down')
  })

  it('falls back on the page in dev', async () => {
    find.mockRejectedValue(new Error('down'))
    vi.stubEnv('NODE_ENV', 'development')
    expect(await loadProjectsForPage()).toEqual({ projects, benchCount: 3 })
  })

  it('allows an empty bench', async () => {
    find.mockResolvedValue({
      docs: docs.map((d) => ({ ...d, onBench: false })),
    })
    const { projects: list, benchCount } = await loadProjects()
    expect(benchCount).toBe(0)
    expect(list).toHaveLength(projects.length)
  })

  it('falls back on the page at build, with no good page to keep', async () => {
    find.mockRejectedValue(new Error('down'))
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PHASE', 'phase-production-build')
    expect(await loadProjectsForPage()).toEqual({ projects, benchCount: 3 })
  })
})
