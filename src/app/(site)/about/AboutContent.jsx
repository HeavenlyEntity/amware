'use client'

import { identity } from '@/content/site/identity'
import { chapters } from '@/content/site/about'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, Mail, MapPin } from 'lucide-react'
import { motion } from 'motion/react'

import {
  TwitterIcon,
  InstagramIcon,
  GitHubIcon,
  LinkedInIcon,
} from '@/components/SocialIcons'
import ProfileCard from '@/components/ProfileCard'
import PhotoStrip from '@/components/about/photo-strip'
import {
  ExperienceRecord,
  EducationRecord,
  MentorshipRecord,
  SkillsRecord,
  PRIOR_EMPLOYERS,
} from '@/components/about/service-records'
import { StackRecord } from '@/components/about/stack-record'
import { StoryFan } from '@/components/about/story-fan'
import { SectionEyebrow } from '@/components/landing/section-eyebrow'
import portraitImage from '@/images/portrait-bg-removed.png'
import amwareLogo from '@/images/logos/AMWARE-Crown-Black.svg'
import crownMark from '@/images/logos/amware-crown-mark.webp'

/* About page in the "minimal" landing template's grammar: a centred
   header over the photo strip, then the template's Features split (a
   sticky profile column beside a fan of story cards), then the service
   record on the template's section rhythm, closing on link cards. */

const easeOut = [0.16, 1, 0.3, 1]

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.8, ease: easeOut },
}

const socialLinks = [
  {
    label: 'Follow on X',
    icon: TwitterIcon,
    href: 'https://x.com/AmwareDotDev',
  },
  {
    label: 'Follow on Instagram',
    icon: InstagramIcon,
    href: 'https://www.instagram.com/amware.dev/',
  },
  {
    label: 'Follow on GitHub',
    icon: GitHubIcon,
    href: 'https://github.com/HeavenlyEntity',
  },
  {
    label: 'Follow on LinkedIn',
    icon: LinkedInIcon,
    href: identity.linkedin,
  },
]

/* Sticky offset for a column that may be taller than the viewport: pin
   to the header line when it fits, otherwise pin bottom-aligned so the
   business card (the part with the actions) is always the visible end. */
function useStickyTop(ref, offset = 96, gap = 24) {
  const [top, setTop] = useState(offset)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      setTop(Math.min(offset, window.innerHeight - el.offsetHeight - gap))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ref, offset, gap])
  return top
}

export default function AboutContent() {
  const columnRef = useRef(null)
  const stickyTop = useStickyTop(columnRef)

  return (
    <div className="amw">
      {/* Header + photo strip */}
      <section className="px-6 pt-16 md:pt-24">
        <div className="mx-auto max-w-6xl">
          <motion.div className="mb-10 text-center md:mb-14" {...fadeInUp}>
            <SectionEyebrow index="00" label="THE OPERATOR" />
            <h1
              style={{ fontFamily: 'Layer, sans-serif' }}
              className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-5xl lg:text-6xl"
            >
              Engineer. Architect. CTO.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
              I am Alec Mingione, in Phoenix, Arizona. I build the systems, and
              the businesses on top of them.
            </p>
            {/* The proof, in the first viewport. It used to live 5.4 viewports
                down, inside a collapsed panel: a visitor deciding whether to
                hire a fractional CTO wants one fact, and the page made them
                scroll most of its length to find it. Read from the record
                below, so the two can never disagree. */}
            <p className="amw-kicker mt-5">
              Previously {PRIOR_EMPLOYERS.join(' · ')}
            </p>
          </motion.div>
          <motion.div
            {...fadeInUp}
            transition={{ ...fadeInUp.transition, delay: 0.15 }}
          >
            <PhotoStrip />
          </motion.div>
        </div>
      </section>

      {/* Story: sticky profile column beside the chapter fan. The fan's
          outer cards are allowed past the column; the section is the paper,
          and the paper is where overflow gets cut. */}
      <section className="overflow-x-clip px-6 py-16 md:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
          <motion.div
            ref={columnRef}
            style={{ top: stickyTop }}
            className="flex flex-col items-center gap-6 lg:sticky lg:w-96 lg:shrink-0 lg:items-start lg:self-start"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: easeOut }}
          >
            <div className="max-w-68 flex w-full justify-center sm:max-w-xs lg:w-[325px] lg:max-w-none">
              <ProfileCard
                avatarUrl={portraitImage.src}
                name="Alec Mingione"
                title="Founder & Engineer"
                handle="AmwareDotDev"
                status="Engineering the Future"
                iconUrl={amwareLogo.src}
                behindGlowEnabled
                /* Teal, not the template's blue: a fourth accent family
                   behind a card that already sits on a teal system. */
                behindGlowColor="rgba(20, 187, 172, 0.55)"
                showUserInfo={false}
                cardHeightMobile="62svh"
                cardMaxHeightMobile="460px"
                cardHeightDesktop="52svh"
                cardMaxHeightDesktop="420px"
              />
            </div>

            {/* Virtual business card: everything that was loose under the
                avatar, on one 36px icon grid with hairline dividers. */}
            <div className="border-[var(--amw-line)] bg-[var(--amw-muted)] w-full max-w-xs rounded-2xl border p-5 lg:w-[325px] lg:max-w-none">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p
                    style={{ fontFamily: 'Layer, sans-serif' }}
                    className="truncate text-lg font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50"
                  >
                    Alec Mingione
                  </p>
                  <p className="amw-kicker mt-1">@AmwareDotDev</p>
                </div>
                <Image
                  src={crownMark}
                  alt=""
                  aria-hidden="true"
                  className="h-8 w-auto shrink-0 opacity-80 dark:invert"
                />
              </div>

              <div
                className="bg-[var(--amw-line)] my-4 h-px"
                aria-hidden="true"
              />

              <ul className="space-y-2">
                <li>
                  <a
                    href={'mailto:' + identity.email}
                    className="hover:text-[var(--amw-accent-ink)] min-h-11 group flex items-center gap-3 text-sm font-medium text-zinc-800 no-underline transition-colors dark:text-zinc-200"
                  >
                    <span
                      className="border-[var(--amw-line)] bg-[var(--amw-card)] text-[var(--amw-accent-ink)] inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                      aria-hidden="true"
                    >
                      <Mail className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="truncate">{identity.email}</span>
                  </a>
                </li>
                <li className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                  <span
                    className="border-[var(--amw-line)] bg-[var(--amw-card)] text-[var(--amw-accent-ink)] inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                    aria-hidden="true"
                  >
                    <MapPin className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span>Phoenix, Arizona</span>
                </li>
              </ul>

              <div
                className="bg-[var(--amw-line)] my-4 h-px"
                aria-hidden="true"
              />

              <div className="flex items-center justify-between gap-3">
                <p className="amw-kicker">Elsewhere</p>
                <div className="flex items-center gap-2">
                  {socialLinks.map(({ label, icon: Icon, href }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:bg-[var(--amw-accent)] hover:text-zinc-950 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900/10 text-zinc-800 transition-all duration-300 hover:scale-110 motion-reduce:hover:scale-100 dark:bg-white/10 dark:text-zinc-200"
                      aria-label={label}
                    >
                      <Icon className="h-4 w-4 fill-current" />
                    </a>
                  ))}
                </div>
              </div>

              <Link
                href="/services"
                className="bg-[var(--amw-accent)] text-zinc-950 group mt-5 inline-flex w-full items-center justify-center gap-3 rounded-md py-3 pl-5 pr-3 font-medium no-underline transition-all duration-500 ease-out hover:rounded-[50px] hover:shadow-lg"
              >
                <span>Work With Me</span>
                <span className="text-zinc-950 flex h-10 w-10 items-center justify-center rounded-full bg-white transition-all duration-300 group-hover:scale-110 dark:bg-zinc-900 dark:text-zinc-50">
                  <ChevronRight
                    className="relative left-px h-4 w-4"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </div>
          </motion.div>

          <div className="min-w-0 flex-1">
            <StoryFan chapters={chapters} />
          </div>
        </div>
      </section>

      {/* Service record */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div className="mb-10 text-center md:mb-14" {...fadeInUp}>
            <SectionEyebrow index="01" label="SERVICE RECORD" />
            <h2
              style={{ fontFamily: 'Layer, sans-serif' }}
              className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl lg:text-5xl"
            >
              The Record Behind the Playbook
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
            <motion.div className="flex flex-col gap-10" {...fadeInUp}>
              <ExperienceRecord />
              <EducationRecord />
              <MentorshipRecord />
            </motion.div>
            <motion.div
              className="flex flex-col gap-10"
              {...fadeInUp}
              transition={{ ...fadeInUp.transition, delay: 0.1 }}
            >
              <SkillsRecord />
              <StackRecord />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Ways in */}
      <section className="px-6 pb-8 md:pb-16">
        <motion.div
          className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2"
          {...fadeInUp}
        >
          {[
            {
              href: '/projects',
              title: 'See the work',
              copy: 'Products, platforms, and client builds, shipped and in production.',
            },
            {
              href: '/contact',
              title: 'Work With Me',
              copy: 'A question, a proposal, or just a hello. I answer every message myself.',
            },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="border-[var(--amw-line)] bg-[var(--amw-card)] hover:border-[var(--amw-accent)] group flex items-center justify-between gap-6 rounded-2xl border p-6 no-underline transition-colors duration-300"
            >
              <div>
                <h3 className="text-lg font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
                  {card.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {card.copy}
                </p>
              </div>
              <span className="bg-[var(--amw-accent)] text-zinc-950 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100">
                <ChevronRight
                  className="relative left-px h-4 w-4"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </motion.div>
      </section>
    </div>
  )
}
