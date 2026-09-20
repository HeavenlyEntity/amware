import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'

function CaretIcon(props) {
  return (
    <svg viewBox="0 0 10 6" fill="none" aria-hidden="true" {...props}>
      <path
        d="M1 1l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const PillNav = ({
  logo,
  logoAlt = 'Logo',
  logoClassName = '',
  items,
  activeHref,
  className = '',
  ease = 'power3.easeOut',
  baseColor = '#fff',
  pillColor = '#060010',
  hoveredPillTextColor = '#060010',
  pillTextColor,
  onMobileMenuClick,
  initialLoadAnimation = true,
  theme = 'light',
  mobileBottomContent,
}) => {
  const isDark = theme === 'dark'
  const resolvedBaseColor = isDark ? pillColor : baseColor
  const resolvedPillColor = isDark ? baseColor : pillColor
  const resolvedHoveredText = isDark
    ? pillTextColor ?? baseColor
    : hoveredPillTextColor
  const resolvedPillText = isDark
    ? hoveredPillTextColor
    : pillTextColor ?? baseColor
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [mobileExpanded, setMobileExpanded] = useState(null)
  const logoImgRef = useRef(null)
  const logoTweenRef = useRef(null)
  const hamburgerRef = useRef(null)
  const mobileMenuRef = useRef(null)
  const navItemsRef = useRef(null)
  const logoRef = useRef(null)
  const dropdownRefs = useRef({})
  const mobileSubRefs = useRef({})
  const openDropdownRef = useRef(null)
  const closeTimerRef = useRef(null)

  useEffect(() => {
    const menu = mobileMenuRef.current
    if (menu) {
      gsap.set(menu, { visibility: 'hidden', opacity: 0, scaleY: 1, y: 0 })
    }

    if (initialLoadAnimation) {
      const logo = logoRef.current
      const navItems = navItemsRef.current

      if (logo) {
        gsap.set(logo, { scale: 0 })
        gsap.to(logo, {
          scale: 1,
          duration: 0.6,
          ease,
        })
      }

      if (navItems) {
        gsap.set(navItems, { width: 0, overflow: 'hidden' })
        gsap.to(navItems, {
          width: 'auto',
          duration: 0.6,
          ease,
          // clear the clip so submenu dropdowns can escape the pill bar
          onComplete: () => gsap.set(navItems, { overflow: 'visible' }),
        })
      }
    }
  }, [ease, initialLoadAnimation])

  /* ---- submenu dropdown (desktop) ---------------------------------------- */

  const showDropdown = (label) => {
    const outer = dropdownRefs.current[label]
    if (!outer) return
    const panel = outer.querySelector('.nav-dropdown-panel')
    const links = outer.querySelectorAll('.nav-dropdown-item')
    const scan = outer.querySelector('.nav-dropdown-scanline')

    gsap.set(outer, { visibility: 'visible' })
    if (prefersReducedMotion()) {
      gsap.set(panel, { opacity: 1, y: 0 })
      gsap.set(links, { opacity: 1, y: 0 })
      return
    }
    gsap.fromTo(
      panel,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.24, ease }
    )
    gsap.fromTo(
      links,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.28, stagger: 0.05, delay: 0.06, ease }
    )
    if (scan) {
      gsap.fromTo(
        scan,
        { xPercent: -100, opacity: 1 },
        {
          xPercent: 100,
          opacity: 1,
          duration: 0.9,
          delay: 0.12,
          ease: 'power2.out',
          onComplete: () => gsap.set(scan, { opacity: 0 }),
        }
      )
    }
  }

  const hideDropdown = (label) => {
    const outer = dropdownRefs.current[label]
    if (!outer) return
    const panel = outer.querySelector('.nav-dropdown-panel')
    gsap.to(panel, {
      opacity: 0,
      y: 8,
      duration: 0.16,
      ease,
      onComplete: () => gsap.set(outer, { visibility: 'hidden' }),
    })
  }

  const openSubmenu = (label) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (openDropdownRef.current === label) return
    if (openDropdownRef.current) hideDropdown(openDropdownRef.current)
    openDropdownRef.current = label
    setOpenDropdown(label)
    showDropdown(label)
  }

  const closeSubmenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (!openDropdownRef.current) return
    hideDropdown(openDropdownRef.current)
    openDropdownRef.current = null
    setOpenDropdown(null)
  }

  const scheduleCloseSubmenu = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(closeSubmenu, 140)
  }

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeSubmenu()
    }
    const onPointerDown = (e) => {
      if (openDropdownRef.current && !e.target.closest('.nav-has-submenu')) {
        closeSubmenu()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- mobile submenu accordion ------------------------------------------ */

  const toggleMobileSubmenu = (label) => {
    const next = mobileExpanded === label ? null : label
    setMobileExpanded(next)
    const el = mobileSubRefs.current[label]
    if (!el) return
    if (prefersReducedMotion()) {
      gsap.set(el, { height: next === label ? 'auto' : 0 })
      return
    }
    gsap.to(el, {
      height: next === label ? 'auto' : 0,
      duration: 0.28,
      ease,
    })
  }

  const handleLogoEnter = () => {
    const img = logoImgRef.current
    if (!img) return
    logoTweenRef.current?.kill()
    gsap.set(img, { rotate: 0 })
    logoTweenRef.current = gsap.to(img, {
      rotate: 360,
      duration: 0.2,
      ease,
      overwrite: 'auto',
    })
  }

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen
    setIsMobileMenuOpen(newState)

    const hamburger = hamburgerRef.current
    const menu = mobileMenuRef.current

    if (hamburger) {
      const lines = hamburger.querySelectorAll('.hamburger-line')
      if (newState) {
        gsap.to(lines[0], { rotation: 45, y: 3, duration: 0.3, ease })
        gsap.to(lines[1], { rotation: -45, y: -3, duration: 0.3, ease })
      } else {
        gsap.to(lines[0], { rotation: 0, y: 0, duration: 0.3, ease })
        gsap.to(lines[1], { rotation: 0, y: 0, duration: 0.3, ease })
      }
    }

    if (menu) {
      if (newState) {
        gsap.set(menu, { visibility: 'visible' })
        gsap.fromTo(
          menu,
          { opacity: 0, y: 10, scaleY: 1 },
          {
            opacity: 1,
            y: 0,
            scaleY: 1,
            duration: 0.3,
            ease,
            transformOrigin: 'top center',
          }
        )
      } else {
        gsap.to(menu, {
          opacity: 0,
          y: 10,
          scaleY: 1,
          duration: 0.2,
          ease,
          transformOrigin: 'top center',
          onComplete: () => {
            gsap.set(menu, { visibility: 'hidden' })
          },
        })
      }
    }

    if (!newState) {
      // collapse any open accordion so the next open starts fresh
      setMobileExpanded(null)
      Object.values(mobileSubRefs.current).forEach((el) => {
        if (el) gsap.set(el, { height: 0 })
      })
    }

    onMobileMenuClick?.()
  }

  const isExternalLink = (href) =>
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('//') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('#')

  const isRouterLink = (href) => href && !isExternalLink(href)

  const isSubmenuActive = (item) =>
    Boolean(
      item.submenu?.items?.some(
        (sub) =>
          activeHref === sub.href || activeHref?.startsWith(`${sub.href}/`)
      )
    )

  const cssVars = {
    ['--base']: resolvedBaseColor,
    ['--pill-bg']: resolvedPillColor,
    ['--hover-text']: resolvedHoveredText,
    ['--pill-text']: resolvedPillText,
    ['--nav-h']: '42px',
    ['--logo']: '36px',
    ['--pill-pad-x']: '18px',
    ['--pill-gap']: '3px',
  }

  return (
    <div className="relative z-[100] w-full flex-1 md:w-auto">
      <nav
        className={`box-border flex w-full items-center justify-between px-0 md:w-max md:justify-start md:px-0 ${className}`}
        aria-label="Primary"
        style={cssVars}
      >
        {isRouterLink(items?.[0]?.href) ? (
          <Link
            href={items[0].href}
            aria-label="Home"
            onMouseEnter={handleLogoEnter}
            ref={(el) => {
              logoRef.current = el
            }}
            className="inline-flex items-center justify-center overflow-hidden rounded-full p-2"
            style={{
              width: 'var(--nav-h)',
              height: 'var(--nav-h)',
              background: 'var(--base, #000)',
            }}
          >
            <img
              src={logo}
              alt={logoAlt}
              ref={logoImgRef}
              className={`block h-full w-full object-cover ${logoClassName}`}
            />
          </Link>
        ) : (
          <a
            href={items?.[0]?.href || '#'}
            aria-label="Home"
            onMouseEnter={handleLogoEnter}
            ref={(el) => {
              logoRef.current = el
            }}
            className="inline-flex items-center justify-center overflow-hidden rounded-full p-2"
            style={{
              width: 'var(--nav-h)',
              height: 'var(--nav-h)',
              background: 'var(--base, #000)',
            }}
          >
            <img
              src={logo}
              alt={logoAlt}
              ref={logoImgRef}
              className={`block h-full w-full object-cover ${logoClassName}`}
            />
          </a>
        )}

        <div
          ref={navItemsRef}
          className="relative ml-2 hidden items-center rounded-full md:flex"
          style={{
            height: 'var(--nav-h)',
            background: 'var(--base, #000)',
          }}
        >
          <ul
            className="m-0 flex h-full list-none items-stretch p-[3px]"
            style={{ gap: 'var(--pill-gap)' }}
          >
            {items.map((item) => {
              const hasSubmenu = Boolean(item.submenu)
              const isActive = hasSubmenu
                ? isSubmenuActive(item)
                : activeHref === item.href
              const isOpen = hasSubmenu && openDropdown === item.label

              const pillStyle = {
                background: 'var(--pill-bg, #fff)',
                color: 'var(--pill-text, var(--base, #000))',
                paddingLeft: 'var(--pill-pad-x)',
                paddingRight: 'var(--pill-pad-x)',
              }

              const PillContent = (
                <>
                  <svg
                    className="keycap-gloss pointer-events-none absolute inset-x-[8px] top-[5px] z-[2] h-[42%] w-[calc(100%-16px)]"
                    viewBox="0 0 120 32"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 2h102c4.4 0 8 3.6 8 8v2.6c-15.4 9.1-34.8 13.7-58.2 13.7C37.4 26.3 17.4 21.9 1 13.1V10c0-4.4 3.6-8 8-8Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="label-stack keycap-label relative z-[3] inline-flex items-center gap-1.5 leading-[1]">
                    {item.label}
                    {hasSubmenu && (
                      <CaretIcon className="nav-caret h-2 w-2.5" />
                    )}
                  </span>
                  {isActive && (
                    <span
                      className="keycap-active-mark absolute left-1/2 z-[4] h-1.5 w-7 -translate-x-1/2 rounded-full"
                      aria-hidden="true"
                    />
                  )}
                </>
              )

              const basePillClasses =
                'nav-code-pill nav-keycap relative inline-flex items-center justify-center h-full no-underline box-border whitespace-nowrap cursor-pointer px-0'

              if (hasSubmenu) {
                return (
                  <li
                    key={item.label}
                    className="nav-has-submenu relative flex h-full"
                    onMouseEnter={() => openSubmenu(item.label)}
                    onMouseLeave={scheduleCloseSubmenu}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        closeSubmenu()
                      }
                    }}
                  >
                    <button
                      type="button"
                      className={`${basePillClasses}${
                        isActive ? ' is-active' : ''
                      }${isOpen ? ' is-open' : ''}`}
                      style={pillStyle}
                      aria-label={item.ariaLabel || item.label}
                      aria-expanded={isOpen}
                      onClick={() =>
                        isOpen ? closeSubmenu() : openSubmenu(item.label)
                      }
                      onFocus={() => openSubmenu(item.label)}
                    >
                      {PillContent}
                    </button>

                    {/* datasheet dropdown — follows the site theme via the .amw tokens */}
                    <div
                      ref={(el) => {
                        dropdownRefs.current[item.label] = el
                      }}
                      className="invisible absolute left-1/2 top-full w-[380px] -translate-x-1/2 pt-3"
                    >
                      <div className="amw">
                        <div className="nav-dropdown-panel amw-ticks border-[var(--amw-line)] bg-[var(--amw-card)] relative overflow-hidden rounded-2xl border shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)] dark:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]">
                          <div
                            className="amw-grid-bg amw-grid-fade absolute inset-0"
                            aria-hidden="true"
                          />
                          <span
                            className="nav-dropdown-scanline pointer-events-none absolute left-0 top-0 z-[3] h-px w-full bg-gradient-to-r from-transparent via-[var(--amw-accent)] to-transparent opacity-0"
                            aria-hidden="true"
                          />
                          {item.submenu.title && (
                            <p className="amw-eyebrow relative px-4 pt-4">
                              {item.submenu.title}
                            </p>
                          )}
                          <ul className="relative m-0 flex list-none flex-col gap-1 p-2 pt-3">
                            {item.submenu.items.map((sub) => {
                              const subActive =
                                activeHref === sub.href ||
                                activeHref?.startsWith(`${sub.href}/`)
                              return (
                                <li key={sub.href}>
                                  <Link
                                    href={sub.href}
                                    aria-current={
                                      subActive ? 'page' : undefined
                                    }
                                    onClick={closeSubmenu}
                                    className={`nav-dropdown-item group block rounded-xl border px-3 py-2.5 no-underline transition-all duration-200 ${
                                      subActive
                                        ? 'border-[color-mix(in_srgb,var(--amw-accent)_45%,transparent)] bg-[var(--amw-accent-soft)]'
                                        : 'hover:border-[color-mix(in_srgb,var(--amw-accent)_45%,transparent)] hover:bg-[var(--amw-accent-soft)] border-transparent hover:shadow-[0_0_24px_-8px_var(--amw-accent)]'
                                    }`}
                                  >
                                    <span className="amw-kicker block">
                                      {sub.kicker}
                                    </span>
                                    <span className="group-hover:text-[var(--amw-accent-ink)] mt-1 flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 transition-colors dark:text-zinc-100">
                                      {sub.label}
                                      <span
                                        className="amw-mono text-xs opacity-0 transition-opacity group-hover:opacity-100"
                                        aria-hidden="true"
                                      >
                                        ↗
                                      </span>
                                    </span>
                                    {sub.desc && (
                                      <span className="mt-0.5 block text-xs leading-relaxed text-zinc-600 transition-colors group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-400">
                                        {sub.desc}
                                      </span>
                                    )}
                                  </Link>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              }

              return (
                <li key={item.href} className="flex h-full">
                  {isRouterLink(item.href) ? (
                    <Link
                      href={item.href}
                      className={`${basePillClasses}${
                        isActive ? ' is-active' : ''
                      }`}
                      style={pillStyle}
                      aria-label={item.ariaLabel || item.label}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {PillContent}
                    </Link>
                  ) : (
                    <a
                      href={item.href}
                      className={`${basePillClasses}${
                        isActive ? ' is-active' : ''
                      }`}
                      style={pillStyle}
                      aria-label={item.ariaLabel || item.label}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {PillContent}
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <button
          ref={hamburgerRef}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
          className="relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-full border-0 p-0 md:hidden"
          style={{
            width: 'var(--nav-h)',
            height: 'var(--nav-h)',
            background: 'var(--base, #000)',
          }}
        >
          <span
            className="hamburger-line h-0.5 w-4 origin-center rounded invert transition-all duration-[10ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
            style={{ background: 'var(--pill-bg, #fff)' }}
          />
          <span
            className="hamburger-line h-0.5 w-4 origin-center rounded invert transition-all duration-[10ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
            style={{ background: 'var(--pill-bg, #fff)' }}
          />
        </button>
      </nav>
      <div
        ref={mobileMenuRef}
        className="absolute top-[3em] left-4 right-4 z-[998] origin-top rounded-[27px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] md:hidden"
        style={{
          ...cssVars,
          background: 'var(--base, #f0f0f0)',
        }}
      >
        <ul className="m-0 flex list-none flex-col gap-[3px] p-[3px]">
          {items.map((item) => {
            const hasSubmenu = Boolean(item.submenu)
            const isActive = hasSubmenu
              ? isSubmenuActive(item)
              : activeHref === item.href
            const isExpanded = mobileExpanded === item.label
            const defaultStyle = {
              background: 'var(--pill-bg, #fff)',
              color: 'var(--pill-text, #fff)',
            }
            const hoverIn = (e) => {
              e.currentTarget.style.background = 'var(--base)'
              e.currentTarget.style.color = 'var(--hover-text, #fff)'
            }
            const hoverOut = (e) => {
              e.currentTarget.style.background = 'var(--pill-bg, #fff)'
              e.currentTarget.style.color = 'var(--pill-text, #fff)'
            }

            const linkClasses =
              'nav-code-pill-mobile nav-keycap-mobile block px-4 py-3 transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]'

            if (hasSubmenu) {
              return (
                <li key={item.label}>
                  <button
                    type="button"
                    className={`${linkClasses} flex w-full items-center justify-between text-left${
                      isActive ? ' is-active' : ''
                    }${isExpanded ? ' is-open' : ''}`}
                    style={defaultStyle}
                    aria-label={item.ariaLabel || item.label}
                    aria-expanded={isExpanded}
                    onMouseEnter={hoverIn}
                    onMouseLeave={hoverOut}
                    onClick={() => toggleMobileSubmenu(item.label)}
                  >
                    <span>{item.label}</span>
                    <CaretIcon className="nav-caret h-2.5 w-3" />
                  </button>
                  <div
                    ref={(el) => {
                      mobileSubRefs.current[item.label] = el
                    }}
                    className="overflow-hidden"
                    style={{ height: 0 }}
                  >
                    <ul className="m-0 flex list-none flex-col gap-[3px] p-0 pt-[3px]">
                      {item.submenu.items.map((sub) => (
                        <li key={sub.href}>
                          <Link
                            href={sub.href}
                            className={`${linkClasses} pl-8${
                              activeHref === sub.href ||
                              activeHref?.startsWith(`${sub.href}/`)
                                ? ' is-active'
                                : ''
                            }`}
                            style={defaultStyle}
                            aria-label={sub.ariaLabel || sub.label}
                            onMouseEnter={hoverIn}
                            onMouseLeave={hoverOut}
                            onClick={() => {
                              if (isMobileMenuOpen) toggleMobileMenu()
                            }}
                          >
                            <span className="mr-2 opacity-50">▸</span>
                            {sub.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              )
            }

            return (
              <li key={item.href}>
                {isRouterLink(item.href) ? (
                  <Link
                    href={item.href}
                    className={`${linkClasses}${isActive ? ' is-active' : ''}`}
                    style={defaultStyle}
                    aria-label={item.ariaLabel || item.label}
                    aria-current={isActive ? 'page' : undefined}
                    onMouseEnter={hoverIn}
                    onMouseLeave={hoverOut}
                    onClick={() => {
                      if (isMobileMenuOpen) toggleMobileMenu()
                    }}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    href={item.href}
                    className={`${linkClasses}${isActive ? ' is-active' : ''}`}
                    style={defaultStyle}
                    aria-label={item.ariaLabel || item.label}
                    aria-current={isActive ? 'page' : undefined}
                    onMouseEnter={hoverIn}
                    onMouseLeave={hoverOut}
                    onClick={() => {
                      if (isMobileMenuOpen) toggleMobileMenu()
                    }}
                  >
                    {item.label}
                  </a>
                )}
              </li>
            )
          })}
          {mobileBottomContent && (
            <li className="mt-1 w-full">{mobileBottomContent}</li>
          )}
        </ul>
      </div>
    </div>
  )
}

export default PillNav
