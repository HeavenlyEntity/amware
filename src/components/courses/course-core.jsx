'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, Lock } from 'lucide-react'

import { PackIcon } from '@/components/icon-pack'
import { Pattern } from '@/components/ui/pattern'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { COURSE, LOOP, MODULES, PACES } from '@/content/site/courses'

const builtCount = MODULES.filter((m) => m.built).length

/* 01: the featured course. Stats, the Find / Rate / Fix loop, the module
   map with a selector, and the pace. `pace` is lifted so the track finder
   can set it. */
export function CourseCore({ pace, onPace }) {
  const reduced = useReducedMotion()
  const [moduleIndex, setModuleIndex] = useState(0)
  const mod = MODULES[moduleIndex]
  const chosenPace = PACES[pace]

  return (
    <section
      id="co-course"
      aria-labelledby="co-course-title"
      className="pj-wrap co-section"
    >
      <motion.div
        className="co-course"
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={
          reduced ? { duration: 0 } : { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
        }
      >
        <Pattern className="co-hatch" />
        <div className="co-course-top">
          <p className="pj-kicker">01 · Featured course · for developers</p>
          <span className="co-live">
            <i aria-hidden="true" />
            Pre-launch · waitlist open
          </span>
        </div>
        <h2 id="co-course-title" className="pj-h2">
          {COURSE.name}.
        </h2>
        <p className="pj-lead">{COURSE.summary}</p>

        <dl className="co-stats">
          {COURSE.stats.map((stat) => (
            <div key={stat.l} className="co-stat flex flex-col-reverse">
              <dt>{stat.l}</dt>
              <dd>{stat.v}</dd>
            </div>
          ))}
        </dl>
        <ul className="co-loop">
          {LOOP.map((step) => (
            <li key={step.t} className="co-host">
              <span className="co-tile" aria-hidden="true">
                <PackIcon name={step.icon} size={30} />
              </span>
              <div>
                <b>{step.t}</b>
                <span className="co-loop-d">{step.d}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="co-map">
          <div>
            <div className="co-prog">
              <span className="whitespace-nowrap">
                <b>
                  {builtCount} of {MODULES.length}
                </b>{' '}
                modules built
              </span>
              <span className="co-prog-bar" aria-hidden="true">
                <i
                  style={{ width: `${(builtCount / MODULES.length) * 100}%` }}
                />
              </span>
            </div>
            <div className="co-tiles" role="group" aria-label="Course modules">
              {MODULES.map((m, i) => (
                <button
                  key={m.title}
                  type="button"
                  className="co-mod"
                  aria-pressed={moduleIndex === i}
                  data-built={m.built}
                  onClick={() => setModuleIndex(i)}
                  aria-label={`Module ${i + 1}: ${m.short}, ${
                    m.built ? 'built' : 'outlined'
                  }`}
                >
                  <span className="co-mod-n">M{i + 1}</span>
                  <span className="co-mod-s" aria-hidden="true">
                    {m.built ? (
                      <Check className="h-3 w-3" strokeWidth={3.5} />
                    ) : (
                      <Lock className="h-[9px] w-[9px]" strokeWidth={2.5} />
                    )}
                  </span>
                  <span className="co-mod-t">{m.short}</span>
                </button>
              ))}
            </div>
          </div>
          {/* The live region stays mounted; the panel inside re-mounts per
              module so it pops in. */}
          <div aria-live="polite">
            <div key={moduleIndex} className="co-detail co-pop">
              <p className="pj-kicker pj-kicker--accent">
                Module {moduleIndex + 1} · {mod.built ? 'Built' : 'Outlined'}
              </p>
              <h3>{mod.title}</h3>
              <p className="co-goal">{mod.goal}</p>
              <ol className="co-weeks">
                {mod.weeks.map((week, i) => (
                  <li key={week}>
                    <span className="co-wk">Week {i + 1}</span>
                    <span>{week}</span>
                  </li>
                ))}
              </ol>
              <p className="co-project">
                <span className="co-tile co-tile--sm" aria-hidden="true">
                  <PackIcon name="system" size={22} />
                </span>
                <span>
                  <b>Project.</b> {mod.project}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="co-pace">
          <div className="co-seg" role="group" aria-label="Pace">
            {Object.entries(PACES).map(([key, p]) => (
              <button
                key={key}
                type="button"
                aria-pressed={pace === key}
                onClick={() => onPace(key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="co-pace-out" aria-live="polite">
            About <strong>{chosenPace.total}</strong> at {chosenPace.perModule}{' '}
            per module. Go at the pace where the quizzes stay easy.
          </p>
        </div>
      </motion.div>
    </section>
  )
}
