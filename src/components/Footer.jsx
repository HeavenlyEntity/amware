'use client'

import { MotionToggle } from '@/components/AccessibilityProvider'
import { identity } from '@/content/site/identity'
import { ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AmwareCreed from '@/components/brand/amware-creed'
import { GitHubIcon, LinkedInIcon, TwitterIcon } from '@/components/SocialIcons'

/* Ported from the "minimal" landing template (components/footer.tsx):
   an accent slab with rounded top corners, intro + primary action beside
   two link columns, a hairline, then the oversized sign-off headline
   with the copyright beside location and socials. The AMWARE creed sits
   under it all as the last thing on every page. The card renders in
   flow, as in the template; only the sections fade in as they enter. */

const easeOut = [0.16, 1, 0.3, 1]

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.5 },
  transition: { duration: 0.8, ease: easeOut },
}

const catalogLinks = [
  { label: 'Boilerplates', href: '/products' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Services', href: '/services' },
  { label: 'Projects', href: '/projects' },
  { label: 'Articles', href: '/articles' },
]

const companyLinks = [
  { label: 'About', href: '/about' },
  { label: 'Uses', href: '/uses' },
  { label: 'Contact', href: '/contact' },
]

const socialLinks = [
  {
    label: 'Follow on X',
    icon: TwitterIcon,
    href: 'https://x.com/AmwareDotDev',
  },
  {
    label: 'Follow on LinkedIn',
    icon: LinkedInIcon,
    href: identity.linkedin,
  },
  {
    label: 'Follow on GitHub',
    icon: GitHubIcon,
    href: 'https://github.com/HeavenlyEntity',
  },
]

function LinkColumn({ title, links, delay }) {
  return (
    <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay }}>
      <h2 className="amw-mono text-zinc-950/70 mb-4 text-xs font-semibold uppercase tracking-[0.14em]">
        {title}
      </h2>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-zinc-950/80 hover:text-zinc-950 min-h-11 min-w-11 inline-flex items-center no-underline transition-all duration-300 hover:translate-x-1 motion-reduce:hover:translate-x-0"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

function FooterCard() {
  return (
    <div className="bg-[var(--amw-accent)] rounded-tl-4xl rounded-tr-4xl text-zinc-950 px-6 py-10 md:px-12 md:py-12 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-20">
          <motion.div className="max-w-md" {...fadeInUp}>
            <p className="text-zinc-950/80 text-lg leading-relaxed">
              Ready to build something great? Grab a boilerplate or bring me
              onto the team. Either way, you ship on foundations that already
              survived production.
            </p>
            <Link
              href="/services"
              className="text-zinc-950 group mt-6 inline-flex items-center gap-3 rounded-md bg-white py-3 pl-4 pr-3 font-medium no-underline shadow-lg shadow-black/10 transition-all duration-500 ease-out hover:rounded-[50px] hover:bg-white/90 hover:shadow-xl hover:shadow-black/20"
            >
              <span>Work With Me</span>
              <span className="bg-[var(--amw-accent)] text-zinc-950 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110">
                <ChevronRight
                  className="relative left-px h-4 w-4"
                  aria-hidden="true"
                />
              </span>
            </Link>
          </motion.div>

          <div className="grid grid-cols-2 gap-8 lg:justify-items-end">
            <LinkColumn title="Catalog" links={catalogLinks} delay={0.1} />
            <LinkColumn title="Company" links={companyLinks} delay={0.2} />
          </div>
        </div>

        <div className="bg-zinc-950/10 my-8 h-px" aria-hidden="true" />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-20">
          <motion.div {...fadeInUp}>
            <h2
              style={{ fontFamily: 'Layer, sans-serif' }}
              className="text-6xl font-bold leading-none tracking-tight md:text-7xl lg:text-8xl"
            >
              Let’s
              <br />
              Build.
            </h2>
            <p className="text-zinc-950/70 mt-4 text-sm">
              &copy; {new Date().getFullYear()} Alec Mingione. All rights
              reserved.
            </p>
          </motion.div>

          <div className="flex flex-col justify-between gap-8 lg:items-end lg:text-right">
            <motion.div
              className="space-y-6"
              {...fadeInUp}
              transition={{ ...fadeInUp.transition, delay: 0.1 }}
            >
              <div>
                <h3 className="mb-1 font-semibold">Phoenix, Arizona</h3>
                <p className="text-zinc-950/70">
                  Fractional CTO, engineer, and founder
                  <br />
                  Working with teams everywhere, remote first
                  <br />
                  <span className="amw-mono text-sm">
                    Mon to Fri, 9:00 am to 6:00 pm (MST)
                  </span>
                </p>
              </div>
              <Link
                href="/contact"
                className="text-zinc-950 min-h-11 inline-flex items-center text-lg font-medium underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                Send a message
              </Link>
            </motion.div>

            <motion.div
              className="flex items-center gap-4 lg:justify-end"
              {...fadeInUp}
              transition={{ ...fadeInUp.transition, delay: 0.2 }}
            >
              {socialLinks.map(({ label, icon: Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[var(--amw-accent)] bg-zinc-950/10 text-zinc-950 hover:bg-zinc-950 flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 motion-reduce:hover:scale-100"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4 fill-current" />
                </a>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* The creed: last word on every page. It leaves the 6xl column so
          its hairlines run the full width of the card. */}
      <div
        id="amware-creed"
        className="-mx-6 mt-8 scroll-mt-24 px-6 md:-mx-12 md:px-12 lg:-mx-20 lg:px-20"
      >
        <AmwareCreed onAccent centered mark markHref="/ai/home" />
      </div>
    </div>
  )
}

export function Footer() {
  const pathname = usePathname()
  return (
    <footer
      className={`amw ${pathname === '/' ? '' : 'mt-32'}`}
      data-print="hide"
    >
      <FooterCard />
      <div className="flex justify-center py-4 text-zinc-700 dark:text-zinc-300">
        <MotionToggle />
      </div>
    </footer>
  )
}
