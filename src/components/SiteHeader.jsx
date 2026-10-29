'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useRootTheme } from '@/hooks/use-client-value'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { ArrowUpRight, Check, ChevronRight, Copy, Mail } from 'lucide-react'
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
/* Reduced motion: cards and actions are simply there. MotionConfig's
   "user" mode drops the slide but would still fade them in. */
const stillVariants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0, transition: { duration: 0 } },
}
const actionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
}

/* One row style for every card (the design's Refactoring UI pass): 16px
   medium rows that never wrap, hierarchy from weight and colour rather
   than size. Muted is zinc-600 on the white bar and zinc-400 on the black
   one; both clear 4.5:1 on the card tier. */
const ROW =
  'group flex min-h-11 items-center justify-between gap-3 py-2.5 text-base/6 font-medium tracking-[-0.01em] no-underline transition-opacity duration-300'
const ROW_HOVER = 'text-current hover:opacity-70'
const LABEL =
  'flex min-w-0 items-center gap-2 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0'
const MUTED = 'text-zinc-400 dark:text-zinc-600'
const ICON = `h-4 w-4 shrink-0 ${MUTED}`
const SUB = `amw-mono m-0 mb-2 text-[10px] leading-none uppercase tracking-[0.14em] ${MUTED}`
const RULE = 'dark:bg-zinc-950/10 h-px bg-white/10'

function RowArrow({ on }) {
  return (
    <ArrowUpRight
      className={clsx(
        'h-4 w-4 shrink-0 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-current motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0',
        on ? 'text-current' : MUTED
      )}
      aria-hidden="true"
    />
  )
}

/* The chip tint is 10% rather than the design's 14%: at 14% over the grey
   card, #0b756c text measures 4.46:1 on the white bar, just under AA for
   10px text. */
function Badge({ children }) {
  return (
    <span className="amw-mono text-[var(--amw-accent-ink)] inline-flex h-[18px] shrink-0 items-center rounded-[0.4rem] bg-[rgba(20,187,172,0.1)] px-1.5 text-[10px] font-semibold uppercase leading-none tracking-[0.12em]">
      {children}
    </span>
  )
}

function Rows({ children }) {
  const items = [children].flat().filter(Boolean)
  /* role="list": Safari drops list semantics from list-style: none. */
  return (
    <ul role="list" className="m-0 mt-4 list-none p-0">
      {items.map((item, index) => (
        <li key={item.key}>
          {item}
          {index < items.length - 1 && <div className={RULE} />}
        </li>
      ))}
    </ul>
  )
}

/* Contact: two actions in the shared row style, then Follow. The copy
   button only claims success when the clipboard write resolved. */
function ContactCard({ card, onNavigate }) {
  const [copy, setCopy] = useState('idle')
  const timer = useRef(0)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      clearTimeout(timer.current)
    }
  }, [])

  /* An absent clipboard API (insecure context) throws inside the try and
     lands in the failed state too. */
  const copyEmail = async () => {
    let result = 'copied'
    try {
      await navigator.clipboard.writeText(card.email)
    } catch {
      result = 'failed'
    }
    if (!mounted.current) return
    setCopy(result)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopy('idle'), 2000)
  }

  const label = {
    idle: 'Copy email address',
    copied: 'Copied to clipboard',
    /* Shorter than "Couldn't copy, use Email me", which overruns the 4-up
       card at 1440 by 8px and would truncate mid-instruction. */
    failed: 'Copy failed, use Email me',
  }[copy]
  const announce = {
    idle: '',
    copied: 'Email address copied',
    failed: "Couldn't copy the email address. Use Email me instead.",
  }[copy]

  return (
    <>
      <Rows>
        <a
          key="mail"
          href={`mailto:${card.email}`}
          title={card.email}
          onClick={onNavigate}
          className={clsx(ROW, ROW_HOVER)}
        >
          <span className={LABEL}>
            <Mail className={ICON} aria-hidden="true" />
            <span className="truncate">Email me</span>
          </span>
          <RowArrow />
        </a>
        <button
          key="copy"
          type="button"
          onClick={copyEmail}
          className={clsx(
            ROW,
            ROW_HOVER,
            'w-full cursor-pointer border-0 bg-transparent px-0 text-left font-[inherit]'
          )}
        >
          <span className={LABEL}>
            {copy === 'copied' ? (
              <Check
                className="text-[var(--amw-accent-ink)] h-4 w-4 shrink-0"
                strokeWidth={2.25}
                aria-hidden="true"
              />
            ) : (
              <Copy className={ICON} aria-hidden="true" />
            )}
            <span className="truncate" title={label}>
              {label}
            </span>
          </span>
        </button>
      </Rows>
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
      <div className="mt-auto pt-6">
        <p className={SUB}>Follow</p>
        <div className="flex items-center gap-3">
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
    </>
  )
}

export function MenuCard({ card, pathname, onNavigate }) {
  const reduce = useReducedMotion()
  const soonId = useId()
  const isActive = (href) =>
    pathname === href || (href !== '/' && pathname?.startsWith(`${href}/`))
  return (
    <motion.div
      /* rounded-[16px], not rounded-2xl: a global rule in tailwind.css gives
         every .rounded-2xl a drop shadow, and these cards are flat. */
      className="min-h-48 dark:bg-zinc-950/[0.05] flex flex-col rounded-[16px] bg-white/[0.06] p-5"
      variants={reduce ? stillVariants : cardVariants}
    >
      <span className="amw-eyebrow">{`// ${card.title}`}</span>

      {card.id === 'contact' && (
        <ContactCard card={card} onNavigate={onNavigate} />
      )}

      {card.links.length > 0 && (
        <Rows>
          {card.links.map((link) =>
            link.soon ? (
              /* Not live yet: plain text, no arrow, not focusable. */
              <span key={link.href} className={clsx(ROW, MUTED)}>
                <span className="truncate">{link.label}</span>
                <span className="amw-mono shrink-0 text-[11px] tracking-[0.06em]">
                  Soon
                </span>
              </span>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={clsx(ROW, ROW_HOVER)}
              >
                <span className={LABEL}>
                  <span className="truncate">{link.label}</span>
                  {link.badge && <Badge>{link.badge}</Badge>}
                  {isActive(link.href) && (
                    <span className="sr-only">(current page)</span>
                  )}
                </span>
                <RowArrow on={isActive(link.href)} />
              </Link>
            )
          )}
        </Rows>
      )}

      {card.soon?.length > 0 && (
        <div className="mt-auto pt-5">
          <p id={soonId} className={SUB}>
            Coming soon
          </p>
          <ul
            role="list"
            aria-labelledby={soonId}
            className="m-0 flex list-none flex-wrap gap-1.5 p-0"
          >
            {card.soon.map((label) => (
              <li
                key={label}
                className={clsx(
                  'dark:border-zinc-950/[0.22] inline-flex h-[26px] items-center whitespace-nowrap rounded-[0.4rem] border border-dashed border-white/[0.22] px-2 text-[13px] leading-none',
                  MUTED
                )}
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}

function MenuActions({ onNavigate }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className="col-span-full flex flex-wrap items-center justify-center gap-3 pt-2"
      variants={reduce ? stillVariants : actionVariants}
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
                  className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 p-4"
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
