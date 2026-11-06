import Image from 'next/image'
import { Eye, Lock, Mail, MapPin, Send } from 'lucide-react'

import { identity } from '@/content/site/identity'
import { GitHubIcon, LinkedInIcon, TwitterIcon } from '@/components/SocialIcons'
/* A square crop of portrait.jpg centred on the face. The full photo is a tall
   2:3 shot, so squaring it into the 56px circle kept the torso and left the
   face small and high. 224px is 4x the circle, for sharp retina rendering. */
import portrait from '@/images/portrait-headshot.jpg'

const SOCIALS = [
  {
    label: 'Follow on X',
    icon: TwitterIcon,
    href: 'https://x.com/AmwareDotDev',
  },
  { label: 'Follow on LinkedIn', icon: LinkedInIcon, href: identity.linkedin },
  {
    label: 'Follow on GitHub',
    icon: GitHubIcon,
    href: 'https://github.com/HeavenlyEntity',
  },
]

/**
 * The rail: who reads it, what happens next (one step further once sent), and
 * the plain facts. `replyBy` is the promised date, computed in Phoenix, or
 * null before the browser has worked it out.
 */
export function ReviewRail({ sent, replyBy }) {
  const steps = [
    {
      icon: Send,
      title: 'You send the read',
      body: 'Your answers, your note, and only the lines you left ticked.',
      done: sent,
      now: !sent,
    },
    {
      icon: Eye,
      title: 'I read it against the band',
      body: 'Seat, stage and terms, the same benchmarks the tools use.',
      done: false,
      now: sent,
    },
    {
      icon: Mail,
      title: 'You get a written read',
      body: `${
        replyBy ? `By ${replyBy}` : 'Within two business days'
      }: what to push on, what to leave, and the counter.`,
      done: false,
      now: false,
    },
  ]
  return (
    <aside
      className="rv-rail rv-rise"
      style={{ '--d': '.42s' }}
      aria-label="About the review"
    >
      <div className="rv-railcard">
        <div className="rv-who">
          <Image
            src={portrait}
            alt="Alec, who reads every offer review"
            width={56}
            height={56}
            sizes="56px"
          />
          <div className="min-w-0">
            <p className="rv-who-name m-0">Alec · AMWARE</p>
            <p className="rv-who-role m-0">
              Fractional CTO. Reads every review himself.
            </p>
          </div>
        </div>
        <p className="rv-reply m-0">
          <span className="rv-pulse" aria-hidden="true" />
          Replies within two business days
        </p>
      </div>

      <div className="rv-railcard">
        <p className="amw-kicker m-0">What happens next</p>
        <ol className="rv-steps">
          {steps.map(({ icon: Icon, title, body, done, now }) => (
            <li
              key={title}
              data-done={done}
              data-now={now}
              aria-current={now ? 'step' : undefined}
            >
              <span className="rv-sdot" aria-hidden="true">
                <Icon className="size-3.5" strokeWidth={2.25} />
              </span>
              <span>
                <b>{title}</b>
                <span className="rv-sd">{body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rv-railcard rv-facts-card">
        <p className="rv-line m-0">
          <Lock className="size-4" aria-hidden="true" />
          Nothing leaves this browser until you press send.
        </p>
        <p className="rv-line m-0">
          <MapPin className="size-4" aria-hidden="true" />
          Phoenix, Arizona. Mon to Fri, 9:00 am to 6:00 pm (MST).
        </p>
        <div className="rv-else">
          <p className="amw-kicker m-0">Elsewhere</p>
          <div className="flex items-center gap-3">
            {SOCIALS.map(({ label, icon: Icon, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="rv-social"
                aria-label={label}
              >
                <Icon className="h-4 w-4 fill-current" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
