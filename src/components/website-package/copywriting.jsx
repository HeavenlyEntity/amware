'use client'
import Image from 'next/image'
import {
  IconLoader,
  IconPaperclip,
  IconSend,
  IconSettings,
} from '@tabler/icons-react'
import { KeyboardIllustration } from './keyboard'
import { motion } from 'motion/react'
const USER_AVATAR_SRC =
  'https://api.dicebear.com/9.x/notionists/png?seed=Visitor'
/** ChatGPT / OpenAI app mark (interlocking shapes), for mini chat preview */
const ChatGptMark = ({ className, ...props }) => (
  <svg
    viewBox="-47.36265 -79.99825 410.4763 479.9895"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden
    {...props}
  >
    <path
      fill="currentColor"
      d="M294.93 130.971a79.712 79.712 0 00-6.85-65.48c-17.46-30.4-52.56-46.04-86.84-38.68A79.747 79.747 0 00141.11.001c-35.04-.08-66.13 22.48-76.91 55.82a79.754 79.754 0 00-53.31 38.67c-17.59 30.32-13.58 68.54 9.92 94.54a79.712 79.712 0 006.85 65.48c17.46 30.4 52.56 46.04 86.84 38.68a79.687 79.687 0 0060.13 26.8c35.06.09 66.16-22.49 76.94-55.86a79.754 79.754 0 0053.31-38.67c17.57-30.32 13.55-68.51-9.94-94.51zm-120.28 168.11a59.77 59.77 0 01-38.39-13.88c.49-.26 1.34-.73 1.89-1.07l63.72-36.8a10.36 10.36 0 005.24-9.07v-89.83l26.93 15.55c.29.14.48.42.52.74v74.39c-.04 33.08-26.83 59.9-59.91 59.97zm-128.84-55.03a59.71 59.71 0 01-7.15-40.18c.47.28 1.3.79 1.89 1.13l63.72 36.8c3.23 1.89 7.23 1.89 10.47 0l77.79-44.92v31.1c.02.32-.13.63-.38.83l-64.41 37.19c-28.69 16.52-65.33 6.7-81.92-21.95zm-16.77-139.09c7-12.16 18.05-21.46 31.21-26.29 0 .55-.03 1.52-.03 2.2v73.61c-.02 3.74 1.98 7.21 5.23 9.06l77.79 44.91-26.93 15.55c-.27.18-.61.21-.91.08l-64.42-37.22c-28.63-16.58-38.45-53.21-21.95-81.89zm221.26 51.49l-77.79-44.92 26.93-15.54c.27-.18.61-.21.91-.08l64.42 37.19c28.68 16.57 38.51 53.26 21.94 81.94a59.94 59.94 0 01-31.2 26.28v-75.81c.03-3.74-1.96-7.2-5.2-9.06zm26.8-40.34c-.47-.29-1.3-.79-1.89-1.13l-63.72-36.8a10.375 10.375 0 00-10.47 0l-77.79 44.92v-31.1c-.02-.32.13-.63.38-.83l64.41-37.16c28.69-16.55 65.37-6.7 81.91 22a59.95 59.95 0 017.15 40.1zm-168.51 55.43l-26.94-15.55a.943.943 0 01-.52-.74v-74.39c.02-33.12 26.89-59.96 60.01-59.94 14.01 0 27.57 4.92 38.34 13.88-.49.26-1.33.73-1.89 1.07l-63.72 36.8a10.344 10.344 0 00-5.24 9.06l-.04 89.79zm14.63-31.54l34.65-20.01 34.65 20v40.01l-34.65 20-34.65-20z"
    />
  </svg>
)
const cardVariants = {
  initial: { minHeight: '5rem', height: '70%', width: '80%' },
  animate: { minHeight: '10.5rem', height: '95%', width: '95%' },
}
const idleLayerVariants = {
  initial: { opacity: 1, y: 0 },
  animate: { opacity: 0, y: -4 },
}
const chatLayerVariants = {
  initial: { opacity: 0, y: 6, pointerEvents: 'none' },
  animate: { opacity: 1, y: 0, pointerEvents: 'auto' },
}
const sendIconVariants = {
  initial: { opacity: 1, scale: 1 },
  animate: { opacity: 0, scale: 0.85 },
}
const loaderIconVariants = {
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1 },
}
const contentTransition = {
  duration: 0.22,
  ease: [0.25, 0.1, 0.25, 1],
}
export const Copywriting = () => {
  return (
    <div
      className="mask-b-from-90% relative flex h-full min-h-0 w-full flex-col items-center justify-center px-6 pt-6 pb-4"
      aria-hidden="true"
    >
      <KeyboardIllustration className="scale-120 pointer-events-none absolute inset-x-0 -bottom-10 z-10" />

      <motion.div
        layout
        layoutId="copywriting"
        variants={cardVariants}
        transition={{
          minHeight: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] },
          layout: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] },
        }}
        className="w-54 relative z-20 flex flex-col justify-end overflow-hidden rounded-2xl bg-white shadow-[0_24px_40px_-20px_rgba(38,38,43,0.30),0_10px_24px_0_rgba(38,38,43,0.06),0_1px_1px_0_rgba(38,38,43,0.16),0_0_0_1px_rgba(38,38,43,0.05),0_8px_14px_-10px_rgba(38,38,43,0.40)]"
      >
        <div className="relative min-h-0 flex-1 overflow-hidden bg-neutral-50 px-1.5 pt-1.5">
          {/* Idle — same box as chat; fades out on hover */}
          <motion.div
            variants={idleLayerVariants}
            transition={contentTransition}
            className="pointer-events-none absolute inset-x-1.5 top-1.5 z-10 flex items-start"
          >
            <p className="w-full rounded-xl px-2 py-1.5 text-[10px] leading-snug text-neutral-500">
              Ask me anything...
            </p>
          </motion.div>

          {/* Chat transcript — fades in over idle */}
          <motion.div
            variants={chatLayerVariants}
            transition={contentTransition}
            className="z-11 absolute inset-x-1.5 top-1.5 bottom-0 flex min-h-0 flex-col gap-2.5 overflow-y-auto px-2 pb-1 pt-2"
            role="presentation"
          >
            <div className="flex items-end justify-end gap-1.5">
              <div className="max-w-[88%] rounded-2xl rounded-br-md bg-neutral-800 px-2.5 py-2 text-xs leading-snug text-neutral-50 shadow-sm">
                how do sites get cited in AI answers?
              </div>
              <Image
                src={USER_AVATAR_SRC}
                alt=""
                width={22}
                height={22}
                className="size-[22px] shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white"
              />
            </div>
            <div className="flex gap-2">
              <div className="size-5 mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-[#10A37F] text-white shadow-sm ring-2 ring-white">
                <ChatGptMark className="size-3 text-white" />
              </div>
              <div className="min-w-0 flex-1 rounded-2xl rounded-bl-md border border-neutral-200/90 bg-neutral-50 px-2.5 py-2 text-xs leading-snug text-neutral-700 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]">
                <p className="text-neutral-800">
                  Clear structure, fast pages and plain-language copy make a
                  site easy to cite [1][2]. Structured data and machine-readable
                  exports tell Google and AI answer engines exactly what you
                  offer [3].
                </p>
                <p className="mt-2 border-t border-neutral-200/80 pt-2 text-[10px] leading-tight text-neutral-500">
                  <span className="font-medium text-neutral-600">
                    References
                  </span>{' '}
                  <span className="text-neutral-500">
                    [1] developers.google.com/search · [2] schema.org · [3]
                    llmstxt.org
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex h-6 w-full shrink-0 items-center justify-between gap-1 border-t border-neutral-200/80 bg-white px-1.5">
          <div className="mx-1 flex items-center gap-2">
            <IconPaperclip
              className="size-3 shrink-0 text-neutral-400"
              stroke={1.5}
              aria-hidden
            />
            <IconSettings
              className="size-3 shrink-0 text-neutral-400"
              stroke={1.5}
              aria-hidden
            />
          </div>
          <div className="size-4 relative flex items-center justify-center rounded-full bg-black">
            <motion.div
              variants={sendIconVariants}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 m-auto flex h-full w-full items-center justify-center"
            >
              <IconSend
                className="size-2 shrink-0 fill-white text-white"
                stroke={1.5}
                aria-hidden
              />
            </motion.div>
            <motion.div
              variants={loaderIconVariants}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 m-auto flex h-full w-full items-center justify-center"
            >
              <IconLoader
                className="size-2 shrink-0 animate-spin fill-white text-white motion-reduce:animate-none"
                stroke={1.5}
                aria-hidden
              />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
