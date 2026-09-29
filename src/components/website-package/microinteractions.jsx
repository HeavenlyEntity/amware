'use client'
import { useEffect, useState } from 'react'
import { BatteryIcon, CelularIcon, WifiIcon } from './icons'
import { motion } from 'motion/react'
import Image from 'next/image'
import { useReducedMotion } from '@/components/AccessibilityProvider'
import { useMounted } from '@/hooks/use-client-value'
import atTheDesk from '@/images/photos/at-the-desk.jpg'
function formatLockScreenDate(d) {
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
  const day = d.getDate()
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  return `${weekday} ${day} ${month}`
}
function formatLockScreenTime(d) {
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
/** Heavily damped spring: the width/position change on hover settles
    without the overshoot that would otherwise jitter the layout. */
const NOTIFICATION_TRANSITION = {
  type: 'spring',
  stiffness: 591.79,
  damping: 48.82,
  mass: 2.89,
}
const notificationGlass =
  'border border-white/35 bg-transparent shadow-[0_8px_32px_rgba(0,0,0,0.18)] ring-1 ring-white/15 backdrop-blur-xl backdrop-saturate-150'
/** Fits screen content width (w-44 phone minus body p-1). Hover expands 1.5× past the phone. */
const NOTIFICATION_WIDTH_REST_PX = 168
const NOTIFICATION_WIDTH_HOVER_PX = Math.round(NOTIFICATION_WIDTH_REST_PX * 1.5)
export const Microinteractions = () => {
  return (
    <div
      className="mask-b-from-90% flex h-full min-h-0 w-full flex-col items-center justify-center px-6 pt-6 pb-4"
      aria-hidden="true"
      data-nosnippet
    >
      <IPhoneIllustration />
    </div>
  )
}
export function IPhoneIllustration() {
  const [isHovered, setIsHovered] = useState(false)
  const reduce = useReducedMotion()
  return (
    <motion.div
      whileHover={reduce ? undefined : 'animate'}
      initial="initial"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      variants={{
        initial: {
          scale: 1,
        },
        animate: {
          scale: 1.02,
        },
      }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      style={{
        transformOrigin: 'bottom center',
      }}
      className="absolute inset-0 mx-auto mt-10 w-full max-w-2xl"
    >
      <div className="relative mx-auto w-44">
        {/* Left side buttons */}
        <div className="absolute top-20 -left-[3px] flex flex-col gap-2">
          {/* Action button */}
          <div className="h-3 w-[3px] rounded-l-sm bg-neutral-400 shadow-[0px_0px_1px_0px_var(--color-neutral-600)]" />
          {/* Volume up */}
          <div className="h-5 w-[3px] rounded-l-sm bg-neutral-400 shadow-[0px_0px_1px_0px_var(--color-neutral-600)]" />
          {/* Volume down */}
          <div className="h-5 w-[3px] rounded-l-sm bg-neutral-400 shadow-[0px_0px_1px_0px_var(--color-neutral-600)]" />
        </div>

        {/* Right side button - Power */}
        <div className="absolute top-28 -right-[3px]">
          <div className="h-8 w-[3px] rounded-r-sm bg-neutral-400 shadow-[0px_0px_1px_0px_var(--color-neutral-600)]" />
        </div>

        {/* iPhone body — overflow visible so notifications can extend past the display */}
        <div className="shadow-black/15 overflow-visible rounded-3xl bg-neutral-100 p-1 shadow-sm ring-2 ring-black/25">
          {/* Screen bezel — wallpaper clipped; overlay can extend past the glass (overflow visible) */}
          <div className="relative h-80 w-full rounded-[1.25rem] bg-neutral-900">
            <div className="absolute inset-0 overflow-hidden rounded-[1.25rem]">
              <Image
                src="https://images.unsplash.com/photo-1540206395-68808572332f?q=80&w=926&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                alt=""
                fill
                className="object-cover object-center"
                sizes="180px"
              />
            </div>
            {/* Screen content (status bar, clock, notifications — not clipped to screen) */}
            <motion.div className="absolute inset-0 z-10 overflow-visible">
              <ScreenContent isHovered={isHovered && !reduce} />
            </motion.div>
          </div>
        </div>

        {/* Bottom indicator bar */}
        <div className="absolute inset-x-0 bottom-2 mx-auto h-1 w-10 rounded-full bg-neutral-300" />
      </div>
    </motion.div>
  )
}
function SlackGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        fill="currentColor"
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834V5.042zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
      />
    </svg>
  )
}
function GmailGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        fill="#EA4335"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#4285F4"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}
function VercelGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 1.5L22.5 22.5H1.5L12 1.5Z" />
    </svg>
  )
}
function StackedNotifications({ isHovered }) {
  return (
    <motion.div
      className="pointer-events-none mx-auto flex max-w-none shrink-0 flex-col items-stretch px-1 pb-1.5"
      initial={false}
      animate={
        isHovered
          ? {
              scale: 1.06,
              width: NOTIFICATION_WIDTH_HOVER_PX,
              y: -58,
            }
          : {
              scale: 1,
              width: NOTIFICATION_WIDTH_REST_PX,
              y: 0,
            }
      }
      transition={NOTIFICATION_TRANSITION}
      style={{ transformOrigin: 'bottom center' }}
    >
      {/* Slack — front, with the Slack mark */}
      <motion.div
        className={`relative z-20 w-full rounded-xl ${notificationGlass}`}
      >
        <div className="flex gap-2 p-2">
          <div className="relative shrink-0">
            <div className="size-8 relative overflow-visible">
              <span className="absolute -right-1 -top-1 z-20 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold leading-none text-white shadow-sm ring-2 ring-white/90">
                2
              </span>
              <Image
                src={atTheDesk}
                alt=""
                sizes="32px"
                className="size-8 rounded-full object-cover ring-1 ring-white/25"
              />
              <div className="size-[14px] ring-black/15 absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-white/95 shadow-md ring-1">
                <SlackGlyph className="size-[9px] text-[#4A154B]" />
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1 self-center text-left">
            <p className="text-[10px] font-semibold leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
              Alec
            </p>
            <p className="mt-1 text-[10px] font-medium leading-snug text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
              Pushed to prod
            </p>
          </div>
        </div>
      </motion.div>

      {/* Gmail — stacked behind (Vercel + Gmail mark) */}
      <motion.div
        className={`relative z-10 w-full rounded-xl ${notificationGlass}`}
        initial={false}
        animate={
          isHovered
            ? { marginTop: 10, scale: 1, opacity: 1 }
            : { marginTop: -40, scale: 0.93, opacity: 0.92 }
        }
        transition={NOTIFICATION_TRANSITION}
        style={{ transformOrigin: 'bottom center' }}
      >
        <div className="flex gap-2 p-2">
          <div className="relative shrink-0">
            <div className="size-8 relative overflow-visible">
              <div className="size-8 flex items-center justify-center rounded-full bg-black ring-1 ring-white/25">
                <VercelGlyph className="size-3.5 text-white" />
              </div>
              <div className="size-[14px] ring-black/15 absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-white/95 shadow-md ring-1">
                <GmailGlyph className="size-[9px]" />
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1 self-center text-left">
            <p className="text-[10px] font-semibold leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
              Vercel
            </p>
            <p className="mt-1 text-[10px] font-medium leading-snug text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
              Deployed!!
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
const ScreenContent = ({ isHovered }) => {
  const reduce = useReducedMotion()
  const mounted = useMounted()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (reduce) return
    let intervalId
    const msToNextMinute = 60000 - (Date.now() % 60000)
    const timeoutId = setTimeout(() => {
      setNow(new Date())
      intervalId = setInterval(() => setNow(new Date()), 60000)
    }, msToNextMinute)
    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [reduce])
  const iconClass =
    'size-2 shrink-0 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]'
  return (
    <>
      <div className="absolute inset-x-0 top-0 z-10 px-2 pt-2">
        <div className="relative flex h-7 items-center justify-center">
          {/* Dynamic Island — dark, centered */}
          <div className="bg-neutral-950 pointer-events-none absolute left-1/2 top-1/2 flex h-4 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-end rounded-full shadow-sm ring-1 ring-black/40">
            <div className="size-2 mr-1.5 rounded-full bg-neutral-800 ring-1 ring-neutral-700/80" />
          </div>
          {/* Status icons — cellular, Wi‑Fi, battery */}
          <div
            className="pointer-events-none absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-0.5"
            aria-hidden
          >
            <CelularIcon className={iconClass} aria-hidden />
            <WifiIcon className="size-2 w-auto shrink-0" aria-hidden />
            <BatteryIcon className={iconClass} aria-hidden />
          </div>
        </div>

        {/* Lock screen–style date & time — top center */}
        <div className="pointer-events-none mt-6 flex flex-col items-center text-center">
          <p className="text-[11px] font-medium leading-tight tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
            {mounted ? formatLockScreenDate(now) : null}
          </p>
          <p className="mt-0.5 text-[22px] font-semibold tabular-nums leading-none tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
            {mounted ? formatLockScreenTime(now) : null}
          </p>
        </div>
      </div>

      {/* Stacked notifications — bottom (shrink-0 so width can exceed the screen; flex default shrink was capping width) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center overflow-visible">
        <StackedNotifications isHovered={isHovered} />
      </div>
    </>
  )
}
