import { Github, Settings, ShieldCheck, Terminal } from 'lucide-react'

import { setupCopy } from '@/lib/commerce/kitEditions'
import { Reveal } from './reveal'

const STEP_ICONS = {
  github: Github,
  terminal: Terminal,
  settings: Settings,
  shield: ShieldCheck,
}

export function SetupSteps({ sale }) {
  const { kicker, steps } = setupCopy(sale)
  return (
    <section aria-labelledby="pr-setup-title" className="pj-wrap pj-section">
      <Reveal>
        <p className="pj-kicker">{kicker}</p>
        <h2 id="pr-setup-title" className="pj-h2">
          From purchase to a working local example.
        </h2>
        <p className="pj-lead">
          Running on fixtures is not the same as validated in your account. The
          path keeps the two apart.
        </p>
        <ol className="pr-steps">
          {steps.map(({ icon, title, copy }, i) => {
            const Icon = STEP_ICONS[icon]
            return (
              <li
                key={title}
                className="pr-step"
                style={{ '--d': `${i * 0.15}s` }}
              >
                <span className="pr-step-ico">
                  <Icon width={20} height={20} aria-hidden="true" />
                </span>
                <b>{title}</b>
                <span>{copy}</span>
              </li>
            )
          })}
        </ol>
      </Reveal>
    </section>
  )
}
