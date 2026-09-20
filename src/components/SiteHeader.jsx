'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useRootTheme } from '@/hooks/use-client-value'
import {
  MotionToggle,
  useReducedMotion,
} from '@/components/AccessibilityProvider'
import { ArrowUpRight, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

import { GitHubIcon, LinkedInIcon, TwitterIcon } from '@/components/SocialIcons'
import { menuCards } from '@/lib/site-nav'
import avatarImage from '@/images/avatar.png'

/* The site header, ported from the "minimal" template's header.tsx: a
   fixed floating bar (brand + Menu) that widens as you scroll and expands
   into a card grid holding the whole navigation. Rebranded onto the amw
   tokens: the bar is the inverse surface (black on light, white on dark),
   cards are a translucent tier on it, the one accent is the teal badge
   and the primary CTA. Four cards instead of the template's three, one
   job each: Catalog, Founders' Desk, Explore, Contact. The avatar stays as
   the home link at the left of the bar. */

const easeOut = [0.16, 1, 0.3, 1]
const easeInOut = [0.65, 0, 0.35, 1]
const spring = { type: 'spring', stiffness: 100, damping: 20, mass: 1 }
const DESKTOP_BREAKPOINT = 700

const SOCIAL_ICONS = {
  x: TwitterIcon,
  linkedin: LinkedInIcon,
  github: GitHubIcon,
}

function useIsDesktop() {
  return useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
      mq.addEventListener('change', callback)
      return () => mq.removeEventListener('change', callback)
    },
    () => window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`).matches,
    () => true
  )
}

function SunIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M8 12.25A4.25 4.25 0 0 1 12.25 8v0a4.25 4.25 0 0 1 4.25 4.25v0a4.25 4.25 0 0 1-4.25 4.25v0A4.25 4.25 0 0 1 8 12.25v0Z" />
      <path
        d="M12.25 3v1.5M21.5 12.25H20M18.791 18.791l-1.06-1.06M18.791 5.709l-1.06 1.06M12.25 20v1.5M4.5 12.25H3M6.77 6.77 5.709 5.709M6.77 17.73l-1.061 1.061"
        fill="none"
      />
    </svg>
  )
}

function MoonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M17.25 16.22a6.937 6.937 0 0 1-9.47-9.47 7.451 7.451 0 1 0 9.47 9.47ZM12.75 7C17 7 17 2.75 17 2.75S17 7 21.25 7C17 7 17 11.25 17 11.25S17 7 12.75 7Z"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* Same theme logic the old header used, restyled for the inverse bar. */
export function ModeToggle({ className }) {
  const theme = useRootTheme()
  function disableTransitionsTemporarily() {
    document.documentElement.classList.add('[&_*]:transition-none!')
    window.setTimeout(() => {
      document.documentElement.classList.remove('[&_*]:transition-none!')
    }, 0)
  }

  function toggleMode() {
    disableTransitionsTemporarily()
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const isSystemDarkMode = darkModeMediaQuery.matches
    const isDarkMode = document.documentElement.classList.toggle('dark')
    if (isDarkMode === isSystemDarkMode) {
      delete window.localStorage.isDarkMode
    } else {
      window.localStorage.isDarkMode = isDarkMode
    }
  }

  return (
    <button
      type="button"
      aria-label="Dark mode"
      aria-pressed={theme === 'dark'}
      onClick={toggleMode}
      className={clsx(
        'group flex h-11 w-11 items-center justify-center rounded-md transition-colors hover:bg-white/10 dark:hover:bg-zinc-900/10',
        className
      )}
    >
      <SunIcon className="h-5 w-5 fill-transparent stroke-current dark:hidden" />
      <MoonIcon className="hidden h-5 w-5 fill-transparent stroke-current dark:block" />
    </button>
  )
}

function HamburgerIcon({ isOpen }) {
  return (
    <span className="relative flex h-2.5 w-6 flex-col justify-between">
      <motion.span
        className="block h-0.5 w-full origin-center rounded-full bg-current"
        animate={isOpen ? { rotate: 45, y: 4 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.4, ease: easeOut }}
      />
      <motion.span
        className="block h-0.5 w-full origin-center rounded-full bg-current"
        animate={isOpen ? { rotate: -45, y: -4 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.4, ease: easeOut }}
      />
    </span>
  )
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: easeOut } },
}

function MenuCard({ card, pathname, onNavigate }) {
  const isActive = (href) =>
    pathname === href || (href !== '/' && pathname?.startsWith(`${href}/`))
  return (
    <motion.div
      className="min-h-48 dark:bg-zinc-950/[0.05] xl:min-h-64 rounded-2xl bg-white/[0.06] p-5"
      variants={cardVariants}
    >
      <span className="amw-eyebrow mb-0">{`// ${card.title}`}</span>

      {card.id === 'contact' && (
        <div className="mt-5 flex h-[calc(100%-2rem)] flex-col justify-between pb-2">
          {/* break-all chopped the address mid-word: the xl grid is four up,
              which leaves the card 223px while 20px type needs 269px, so it
              rendered as "amware.develop@gmai / l.com". The size steps down
              where the card narrows, and the only break opportunity is after
              the @, so a longer address wraps somewhere a reader expects
              instead of anywhere. <wbr> adds no characters, so copy and paste
              still yields the plain address. */}
          <a
            href={`mailto:${card.email}`}
            onClick={onNavigate}
            className="text-lg font-semibold tracking-tight text-current no-underline transition-opacity [overflow-wrap:anywhere] hover:opacity-70 md:text-xl xl:text-base"
          >
            {(() => {
              const at = card.email.indexOf('@')
              if (at < 0) return card.email
              return (
                <>
                  {card.email.slice(0, at + 1)}
                  <wbr />
                  {card.email.slice(at + 1)}
                </>
              )
            })()}
          </a>
          <div className="mt-auto flex items-center gap-3 pt-8">
            {card.socials.map((social) => {
              const Icon = SOCIAL_ICONS[social.id]
              return (
                <a
                  key={social.id}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="dark:bg-zinc-950/10 dark:hover:bg-zinc-950/20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-current transition-all duration-300 hover:scale-110 hover:bg-white/20 motion-reduce:hover:scale-100"
                >
                  <Icon className="h-5 w-5 fill-current" />
                </a>
              )
            })}
          </div>
        </div>
      )}

      {card.links.length > 0 && (
        <ul className="m-0 mt-5 list-none p-0">
          {card.links.map((link, index) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={onNavigate}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className="group flex items-center justify-between py-3 text-lg font-semibold tracking-tight text-current no-underline transition-all duration-300 hover:opacity-70 md:text-xl"
              >
                <span className="flex items-center gap-3 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0">
                  {link.label}
                  {link.badge && (
                    <span className="bg-[var(--amw-accent)] amw-mono text-zinc-950 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-widest">
                      {link.badge}
                    </span>
                  )}
                  {isActive(link.href) && (
                    <span className="sr-only">(current page)</span>
                  )}
                </span>
                <ArrowUpRight
                  className={clsx(
                    'h-5 w-5 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100',
                    isActive(link.href) ? 'opacity-100' : 'opacity-50'
                  )}
                  aria-hidden="true"
                />
              </Link>
              {index < card.links.length - 1 && (
                <div className="dark:bg-zinc-950/10 h-px bg-white/10" />
              )}
            </li>
          ))}
        </ul>
      )}

      {card.footnote && (
        <p className="amw-mono mt-4 text-[10px] uppercase tracking-widest opacity-80">
          {card.footnote}
        </p>
      )}
    </motion.div>
  )
}

function MenuActions({ onNavigate }) {
  return (
    <motion.div
      className="col-span-full flex flex-wrap items-center justify-center gap-3 pt-2"
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: easeOut },
        },
      }}
    >
      <Link
        href="/contact"
        onClick={onNavigate}
        className="bg-[var(--amw-accent)] text-zinc-950 group inline-flex items-center gap-3 rounded-md py-2.5 pl-5 pr-2.5 text-base font-medium tracking-tight no-underline transition-all duration-500 hover:rounded-[50px]"
      >
        <span>Work with me</span>
        <span className="text-zinc-950 flex h-8 w-8 items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100">
          <ChevronRight
            className="relative left-px h-4 w-4"
            aria-hidden="true"
          />
        </span>
      </Link>
      <ModeToggle className="md:hidden" />
      <MotionToggle />
    </motion.div>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const reduce = useReducedMotion()
  const isDesktop = useIsDesktop()
  const menuId = useId()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)
  const buttonRef = useRef(null)
  const headerRef = useRef(null)
  const cards = menuCards()
  const heightDelay = isDesktop ? 0.2 : 0
  const cardsDelay = isDesktop ? 0.7 : 0.2

  useEffect(() => {
    const onScroll = () => setHasScrolled(window.scrollY > 50)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Close on route change and on Escape; return focus to the button. The route
     half is done during render (React's documented way to reset state when a
     prop changes) so navigation never paints one frame with the menu still
     open. */
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setIsMenuOpen(false)
  }

  useEffect(() => {
    if (!isMenuOpen) return
    const header = headerRef.current
    const outside = [
      document.getElementById('site-content'),
      document.querySelector('.skip-link'),
    ].filter(Boolean)
    const previousInert = outside.map((element) => element.inert)
    outside.forEach((element) => {
      element.inert = true
    })
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    buttonRef.current?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsMenuOpen(false)
        buttonRef.current?.focus()
      }
      if (event.key === 'Tab') {
        const controls = [
          ...header.querySelectorAll(
            'a[href], button:not(:disabled), [tabindex="0"]'
          ),
        ].filter((element) => {
          const style = getComputedStyle(element)
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            !element.closest('[hidden]')
          )
        })
        const first = controls[0]
        const last = controls.at(-1)
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !header.contains(document.activeElement))
        ) {
          event.preventDefault()
          last?.focus()
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !header.contains(document.activeElement))
        ) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      outside.forEach((element, index) => {
        element.inert = previousInert[index]
      })
      document.body.style.overflow = overflow
    }
  }, [isMenuOpen])

  const close = () => {
    setIsMenuOpen(false)
    buttonRef.current?.focus()
  }
  const width = !isDesktop
    ? '100%'
    : isMenuOpen
    ? '100%'
    : hasScrolled
    ? '56rem'
    : '42rem'

  return (
    <>
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
            onClick={close}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <motion.header
        ref={headerRef}
        role={isMenuOpen ? 'dialog' : undefined}
        aria-modal={isMenuOpen ? true : undefined}
        aria-label={isMenuOpen ? 'Site navigation' : undefined}
        data-print="hide"
        className="fixed left-0 top-0 z-50 flex w-full justify-center px-4 pt-4"
        initial={reduce ? false : { y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3, ease: easeOut }}
      >
        <motion.nav
          aria-label="Site"
          className="amw amw-panel-invert bg-zinc-950 dark:border-zinc-950/10 dark:text-zinc-950 flex max-w-6xl flex-col overflow-hidden rounded-md border border-white/10 text-white shadow-2xl shadow-black/20 dark:bg-white"
          initial={false}
          animate={{ width }}
          transition={
            reduce
              ? { duration: 0 }
              : { ...spring, delay: isMenuOpen ? 0 : 0.15 }
          }
        >
          <div className="flex w-full items-center justify-between py-2 pl-4 pr-2">
            <Link
              href="/"
              aria-label="AMWARE home"
              onClick={close}
              className="min-h-11 flex items-center gap-3 no-underline"
            >
              <span className="dark:ring-zinc-950/15 h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/10 p-0.5 ring-1 ring-white/20">
                <Image
                  src={avatarImage}
                  alt="Alec Mingione"
                  sizes="2.25rem"
                  className="h-full w-full rounded-full object-cover"
                  priority
                />
              </span>
              <span
                style={{ fontFamily: 'Layer, sans-serif' }}
                className="text-2xl font-extrabold tracking-tighter text-current"
              >
                AMWARE
              </span>
            </Link>

            <div className="flex items-center gap-1">
              <ModeToggle className="hidden md:flex" />
              <button
                ref={buttonRef}
                type="button"
                aria-expanded={isMenuOpen}
                aria-controls={isMenuOpen ? menuId : undefined}
                onClick={() => setIsMenuOpen((open) => !open)}
                className="flex h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-current transition-colors hover:bg-white/10 dark:hover:bg-zinc-900/10"
              >
                <HamburgerIcon isOpen={isMenuOpen} />
                <span className="text-lg font-medium tracking-tight">
                  {isMenuOpen ? 'Close' : 'Menu'}
                </span>
              </button>
            </div>
          </div>

          {isMenuOpen && (
            <motion.div
              id={menuId}
              className="overflow-hidden"
              style={{ maxHeight: 'calc(100dvh - 6rem)' }}
              initial={reduce ? { height: 'auto' } : { height: 0 }}
              animate={{
                height: 'auto',
                transition: reduce
                  ? { duration: 0 }
                  : { duration: 0.5, ease: easeInOut, delay: heightDelay },
              }}
              exit={{
                height: 0,
                transition: reduce
                  ? { duration: 0 }
                  : { duration: 0.4, ease: easeInOut },
              }}
            >
              <div className="scrollbar-hide max-h-[calc(100dvh-6rem)] overflow-y-auto">
                <motion.div
                  className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={{
                    hidden: {
                      transition: {
                        staggerChildren: 0.05,
                        staggerDirection: -1,
                      },
                    },
                    visible: {
                      transition: {
                        staggerChildren: reduce ? 0 : 0.1,
                        delayChildren: reduce ? 0 : cardsDelay,
                      },
                    },
                  }}
                >
                  {cards.map((card) => (
                    <MenuCard
                      key={card.id}
                      card={card}
                      pathname={pathname}
                      onNavigate={close}
                    />
                  ))}
                  <MenuActions onNavigate={close} />
                </motion.div>
              </div>
            </motion.div>
          )}
        </motion.nav>
      </motion.header>

      {/* In-flow spacer so page content starts below the floating bar. */}
      <div aria-hidden="true" className="h-20 md:h-24" />
    </>
  )
}
