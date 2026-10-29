'use client'

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { ArrowUpRight, BookOpen, Lock } from 'lucide-react'

import { STATUS_LABELS } from '@/content/site/projects'
import { isPublicLink, privateNoteFor, yearOf } from '@/lib/projects/archive'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { ProjectCover, ProjectLogo } from './project-media'
import { countText, useCountUp } from './motion-hooks'

const REVEAL = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.12 },
}
const EASE = [0.16, 1, 0.3, 1]

/* One "On the bench" feature: the cover tilts toward the pointer (about
   6° at the edge) and the panel's ring glows in the status colour around
   the cursor. One solid action (the story); Visit is a text link. */
export function BenchFeature({ project, index, onOpen }) {
  const reduced = useReducedMotion()
  const statsRef = useRef(null)
  const inView = useInView(statsRef, { once: true, amount: 0.6 })
  const k = useCountUp(inView, { duration: 900 })
  const publicLink = isPublicLink(project.link.href)

  const glow = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  const tilt = (e) => {
    if (reduced) return
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--tx', `${(x * 12).toFixed(2)}deg`)
    el.style.setProperty('--ty', `${(-y * 12).toFixed(2)}deg`)
  }
  const untilt = (e) => {
    e.currentTarget.style.setProperty('--tx', '0deg')
    e.currentTarget.style.setProperty('--ty', '0deg')
  }

  return (
    <motion.article
      {...REVEAL}
      transition={reduced ? { duration: 0 } : { duration: 0.8, ease: EASE }}
      className="pj-feat"
      data-s={project.status}
      data-flip={index % 2 === 1}
      onMouseMove={glow}
      aria-labelledby={`pj-feat-${project.key}`}
    >
      <div className="pj-shot" onMouseMove={tilt} onMouseLeave={untilt}>
        <ProjectCover
          project={project}
          alt={`${project.name} screenshot`}
          sizes="(max-width: 900px) 100vw, 640px"
          priority={index === 0}
        />
        <span className="pj-num" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <div className="pj-feat-body">
        <div className="pj-id">
          <ProjectLogo project={project} />
          <div>
            <h3 id={`pj-feat-${project.key}`}>{project.name}</h3>
            <div className="pj-meta">
              <span>
                <i className="pj-dot" data-s={project.status} />
                {STATUS_LABELS[project.status]}
              </span>
              <span className="pj-sep" aria-hidden="true" />
              <span>{yearOf(project.date)}</span>
            </div>
          </div>
        </div>
        <p className="pj-desc">{project.description}</p>
        <dl ref={statsRef} className="pj-fstats">
          {project.story.results.slice(0, 3).map((r) => (
            <div key={r.l} className="flex flex-col-reverse">
              <dt>
                <span>{r.l}</span>
              </dt>
              <dd className="m-0">
                <strong>
                  <span aria-hidden="true">{countText(r.v, k)}</span>
                  <span className="sr-only">{r.v}</span>
                </strong>
              </dd>
            </div>
          ))}
        </dl>
        <div className="pj-tags">
          {project.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="pj-factions">
          <button
            type="button"
            className="pj-story"
            onClick={(e) => onOpen(project.key, e.currentTarget)}
            aria-label={`Read the story: ${project.name}`}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Read the story
          </button>
          {publicLink ? (
            <a
              href={project.link.href}
              className="pj-link"
              target="_blank"
              rel="noreferrer"
            >
              Visit {project.link.label}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            <p className="pj-private">
              <Lock className="h-4 w-4" aria-hidden="true" />
              {privateNoteFor(project)}
            </p>
          )}
        </div>
      </div>
    </motion.article>
  )
}
