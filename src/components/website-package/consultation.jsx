'use client'
import Image from 'next/image'
import { IconMicrophone, IconPhoneOff, IconVideo } from '@tabler/icons-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import atTheDesk from '@/images/photos/at-the-desk.jpg'
const shadow =
  'shadow-[0_24px_40px_-20px_rgba(38,38,43,0.30),0_10px_24px_0_rgba(38,38,43,0.06),0_1px_1px_0_rgba(38,38,43,0.16),0_0_0_1px_rgba(38,38,43,0.05),0_8px_14px_-10px_rgba(38,38,43,0.40)]'
function MiniHeroWireframe() {
  return (
    <div className="bg-white px-1 py-1.5" aria-hidden>
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="max-w-[18ch] text-[9px] font-semibold leading-snug tracking-tight text-neutral-900">
          Your product, built right.
        </p>
        <p className="max-w-[22ch] text-[8px] leading-snug text-neutral-500">
          Design through launch, one engineer.
        </p>
        <div className="mt-0.5 flex justify-center gap-1">
          <span className="min-w-11 bg-[var(--amw-accent)] flex h-4 items-center justify-center rounded-md px-2">
            <span className="h-0.5 w-2.5 rounded-full bg-white" />
          </span>
          <span className="min-w-11 flex h-4 items-center justify-center rounded-md border border-neutral-200 bg-white px-2">
            <span className="h-0.5 w-2.5 rounded-full bg-neutral-300" />
          </span>
        </div>
      </div>
    </div>
  )
}
function MiniPricingWireframe() {
  return (
    <div className="rounded-lg  bg-white p-1.5" aria-hidden>
      <div className="flex items-stretch justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 min-w-0 flex-1 rounded-md border border-neutral-200/90 bg-neutral-50/60"
          />
        ))}
      </div>
    </div>
  )
}
function MiniCtaWireframe() {
  return (
    <div className="rounded-lg bg-white px-2.5 py-2.5 text-center" aria-hidden>
      <p className="text-[10px] font-semibold leading-tight tracking-tight text-neutral-900">
        Ready to start?
      </p>
      <p className="mt-0.5 text-[10px] font-semibold leading-tight tracking-tight text-teal-700">
        Book a strategy call.
      </p>

      <div className="mt-1.5 flex justify-center gap-1">
        <span className="min-w-13 bg-[var(--amw-accent)] flex h-5 items-center justify-center rounded-md px-2">
          <span className="h-0.5 w-3 rounded-full bg-white" />
        </span>
        <span className="min-w-13 flex h-5 items-center justify-center rounded-md border border-neutral-200 bg-white px-2">
          <span className="h-0.5 w-3 rounded-full bg-neutral-300" />
        </span>
      </div>
    </div>
  )
}
export const Consultation = () => {
  return (
    <div
      className="mask-b-from-90% relative flex h-full w-full flex-row items-stretch gap-2 overflow-hidden p-1"
      aria-hidden="true"
      data-nosnippet
    >
      <div className="relative z-10 h-full min-h-0 min-w-0 flex-1">
        <motion.div
          variants={{
            initial: {
              width: '300px',
              height: '200px',
            },
            animate: {
              width: '400px',
              height: '400px',
            },
          }}
          className={`${shadow} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white`}
        >
          <motion.div
            variants={{
              animate: { opacity: 1 },
              initial: { opacity: 0 },
            }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="absolute inset-0 z-0 flex flex-col items-stretch justify-center gap-1.5 overflow-y-auto bg-white p-2"
          >
            <MiniHeroWireframe />
            <MiniPricingWireframe />
            <MiniCtaWireframe />
          </motion.div>
          <motion.div
            variants={{
              animate: { opacity: 0 },
              initial: { opacity: 1 },
            }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="z-1 relative h-full w-full"
          >
            <Image
              src={atTheDesk}
              alt=""
              sizes="400px"
              className="h-full w-full object-cover"
            />
          </motion.div>
          <motion.div
            variants={{
              animate: { opacity: 0 },
              initial: { opacity: 1 },
            }}
            className="bg-linear-to-t from-black/55 pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center gap-1.5 via-black/25 to-transparent px-3 pb-2.5 pt-8"
            aria-hidden
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white ">
              <IconMicrophone className="h-3.5 w-3.5" stroke={1.75} />
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white ">
              <IconVideo className="h-3.5 w-3.5" stroke={1.75} />
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/90 text-white shadow-sm ">
              <IconPhoneOff className="h-3.5 w-3.5" stroke={1.75} />
            </span>
          </motion.div>
        </motion.div>
        <div className={` absolute bottom-5 right-10 flex items-center gap-2 `}>
          <motion.div
            variants={{
              animate: {
                height: '4rem',
                width: '4rem',
              },
              initial: { height: '5rem', width: '6rem' },
            }}
          >
            <Image
              src="https://api.dicebear.com/9.x/notionists/png?seed=Visitor"
              alt=""
              width={200}
              height={200}
              className={cn(
                'h-full w-full rounded-2xl object-cover ring-1 ring-white',
                shadow
              )}
            />
          </motion.div>
          <motion.div
            variants={{
              animate: {
                height: '4rem',
                width: '4rem',
                opacity: 1,
              },
              initial: { height: 0, width: 0, opacity: 0 },
            }}
          >
            <Image
              src={atTheDesk}
              alt=""
              sizes="64px"
              className={cn(
                'h-full w-full rounded-2xl object-cover ring-1 ring-white',
                shadow
              )}
            />
          </motion.div>
        </div>
      </div>
    </div>
  )
}
