'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { motion, useInView } from 'motion/react'
import Link from 'next/link'
import { useId, useRef, useState } from 'react'
import { SectionEyebrow } from './section-eyebrow'
import { faqs } from '@/content/site/faq'

/* Ported from the "minimal" landing template (components/faq.tsx): an
   inverted full-bleed band with a single accordion card and a closing
   contact prompt. The band uses the forced-dark amw token set so it reads
   as the terminal panel in both themes. */

const easeOut = [0.16, 1, 0.3, 1]

function FAQItem({ faq, index, isOpen, onToggle }) {
  const panelId = useId()

  return (
    <motion.div
      className="border-[var(--amw-line)] border-b last:border-b-0"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: easeOut }}
    >
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="group flex w-full cursor-pointer items-center justify-between py-6 text-left"
        >
          <span className="pr-8 text-lg font-medium text-zinc-50 md:text-xl">
            {faq.question}
          </span>
          <motion.div
            className="shrink-0 text-zinc-50/50"
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
          >
            <ChevronDown className="h-5 w-5" aria-hidden="true" />
          </motion.div>
        </button>
      </h3>
      {/* The panel stays mounted when closed. Unmounting it meant the
          answers were missing from the server HTML, so search engines and
          AI readers saw five questions and no answers. `inert` keeps the
          collapsed text out of the tab order and the accessibility tree. */}
      <motion.div
        id={panelId}
        initial={false}
        animate={
          isOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }
        }
        transition={{ duration: 0.3, ease: easeOut }}
        className="overflow-hidden"
        inert={!isOpen}
      >
        <p className="pb-6 text-base leading-relaxed text-zinc-400">
          {faq.answer}
        </p>
      </motion.div>
    </motion.div>
  )
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)
  const headerRef = useRef(null)
  const isHeaderInView = useInView(headerRef, { once: true, amount: 0.5 })

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="amw-panel-dark amw-ticks rounded-4xl bg-[#0b0b0f] px-6 py-16 md:py-32">
      <div className="mx-auto max-w-3xl">
        <motion.div
          ref={headerRef}
          className="mb-12 text-center md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={
            isHeaderInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
          }
          transition={{ duration: 0.6, ease: easeOut }}
        >
          <SectionEyebrow index="06" label="FIELD MANUAL" />
          <h2
            style={{ fontFamily: 'Layer, sans-serif' }}
            className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl lg:text-5xl"
          >
            Common Questions
          </h2>
        </motion.div>

        <motion.div
          className="bg-[var(--amw-card-2)] border-[var(--amw-line)] rounded-2xl border px-6 py-2 md:px-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: easeOut }}
        >
          {faqs.map((faq, index) => (
            <FAQItem
              key={faq.question}
              faq={faq}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </motion.div>

        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.2, ease: easeOut }}
        >
          <p className="mb-6 text-base text-zinc-400">
            Still have questions? I answer every message myself.
          </p>
          <Link
            href="/contact"
            className="text-zinc-950 group inline-flex items-center gap-3 rounded-md bg-white py-3 pl-5 pr-3 font-medium no-underline shadow-lg transition-all duration-500 ease-out hover:rounded-[50px]"
          >
            <span>Get in Touch</span>
            <span className="bg-[var(--amw-accent)] text-zinc-950 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110">
              <ChevronRight
                className="relative left-px h-4 w-4"
                aria-hidden="true"
              />
            </span>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
