'use client'

import { useCallback, useRef, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'

import { projects, projectAnchor } from '@/content/site/projects'
import { heroStats, timelineYears } from '@/lib/projects/archive'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { Pattern } from '@/components/ui/pattern'
import { ProjectsHero } from '@/components/projects/projects-hero'
import { BenchFeature } from '@/components/projects/bench-feature'
import { ProjectArchive } from '@/components/projects/project-archive'
import { CaseStudyDrawer } from '@/components/projects/case-study-drawer'

/* Projects page, "Field evidence", from the approved redesign
   (docs/design/2026-10-27-portfolio-upgrade): a dithered hero with live
   counts and a timeline of every build, the three newest builds "on the
   bench", the archive as filterable cards or a sortable list, a closing
   band, and a case-study drawer for any build. Styles: styles/projects.css.

   The drawer is driven by the URL hash (the existing projectAnchor), so a
   story can be shared and the AI documents' /projects#anchor links open
   it. The hash is read as an external store: the server renders closed. */

const FEATURED_COUNT = 3
const featured = projects.slice(0, FEATURED_COUNT)
const archive = projects.slice(FEATURED_COUNT)
const indexByAnchor = new Map(
  projects.map((p, i) => [`#${projectAnchor(p.name)}`, i])
)

const hashListeners = new Set()
function subscribeHash(fn) {
  hashListeners.add(fn)
  window.addEventListener('hashchange', fn)
  return () => {
    hashListeners.delete(fn)
    window.removeEventListener('hashchange', fn)
  }
}
const getHash = () => window.location.hash
const getServerHash = () => ''
/* replaceState keeps the back button for leaving the page, and does not
   fire hashchange, so listeners are told directly. */
function setHash(hash) {
  const url = `${window.location.pathname}${window.location.search}${hash}`
  window.history.replaceState(window.history.state, '', url)
  hashListeners.forEach((fn) => fn())
}

const REVEAL = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.12 },
}

export default function ProjectsContent({ currentYear }) {
  const reduced = useReducedMotion()
  const hash = useSyncExternalStore(subscribeHash, getHash, getServerHash)
  const openIndex = indexByAnchor.get(hash) ?? -1
  const openerRef = useRef(null)
  const stats = heroStats(projects, currentYear)
  const years = timelineYears(projects, currentYear)
  const reveal = reduced
    ? { duration: 0 }
    : { duration: 0.8, ease: [0.16, 1, 0.3, 1] }

  const open = useCallback((key, opener) => {
    const project = projects.find((p) => p.key === key)
    if (!project) return
    openerRef.current = opener ?? null
    setHash(`#${projectAnchor(project.name)}`)
  }, [])
  const close = useCallback(() => setHash(''), [])
  const step = useCallback(
    (dir) => {
      if (openIndex < 0) return
      const next =
        projects[(openIndex + dir + projects.length) % projects.length]
      setHash(`#${projectAnchor(next.name)}`)
    },
    [openIndex]
  )

  return (
    /* overflow-x-clip: BorderGlow paints its glow 40px outside each card,
       which would otherwise scroll sideways on phones. */
    <div className="amw pj overflow-x-clip pb-24 pt-4 md:pt-8">
      <ProjectsHero
        total={projects.length}
        stats={stats}
        years={years}
        onOpen={open}
      />

      <section
        id="pj-bench"
        aria-labelledby="pj-bench-title"
        className="pj-wrap pj-section"
      >
        <motion.div {...REVEAL} transition={reveal}>
          <p className="pj-kicker">01 · On the bench</p>
          <h2 id="pj-bench-title" className="pj-h2">
            What I&apos;m building now.
          </h2>
          <p className="pj-lead">
            The three newest builds. Founder products first, then the client
            work that keeps the playbook sharp.
          </p>
        </motion.div>
        <div className="pj-feats">
          {featured.map((project, index) => (
            <BenchFeature
              key={project.key}
              project={project}
              index={index}
              onOpen={open}
            />
          ))}
        </div>
      </section>

      <ProjectArchive list={archive} onOpen={open} />

      <motion.section
        id="pj-close"
        aria-labelledby="pj-close-title"
        className="pj-wrap pj-section"
        {...REVEAL}
        transition={reveal}
      >
        <div className="pj-close">
          <Pattern className="pj-hatch" />
          <div>
            <p className="pj-kicker pj-kicker--accent">Next build</p>
            <h2 id="pj-close-title">Have a build in mind?</h2>
            <p className="pj-close-copy">
              Tell me what you&apos;re shipping and where you&apos;re stuck. The
              same playbook behind these builds goes into yours.
            </p>
          </div>
          <div className="pj-close-acts">
            <Link href="/contact" className="pj-btn pj-btn--across">
              <span>Get in touch</span>
              <span className="pj-btn-dot">
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
            <Link href="/products" className="pj-ghost">
              Or start from the boilerplates <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </motion.section>

      <AnimatePresence>
        {openIndex >= 0 && (
          <CaseStudyDrawer
            key="drawer"
            projects={projects}
            index={openIndex}
            returnFocusRef={openerRef}
            onClose={close}
            onStep={step}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
