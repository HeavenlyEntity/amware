import Image from 'next/image'

import blocks from '@/images/icons/blocks.svg'
import checklist from '@/images/icons/checklist.svg'
import code from '@/images/icons/code.svg'
import computer from '@/images/icons/computer.svg'
import customize from '@/images/icons/customize.svg'
import gauge from '@/images/icons/gauge.svg'
import network from '@/images/icons/network.svg'
import programmer from '@/images/icons/programmer.svg'
import responsive from '@/images/icons/responsive.svg'
import rocket from '@/images/icons/rocket.svg'
import search from '@/images/icons/search.svg'
import system from '@/images/icons/system.svg'
import tasks from '@/images/icons/tasks.svg'
import workflow from '@/images/icons/workflow.svg'

/* Alec's recoloured icon packs, used by the Projects and Courses pages for
   kind filters, journey steps, quiz options and tabs. The glyphs are drawn
   light (#d4d4d8), so they sit on dark tiles. Always decorative. */
export const ICONS = {
  blocks,
  checklist,
  code,
  computer,
  customize,
  gauge,
  network,
  programmer,
  responsive,
  rocket,
  search,
  system,
  tasks,
  workflow,
}

export function PackIcon({ name, className, size = 28 }) {
  const icon = ICONS[name]
  if (!icon) return null
  return (
    <Image
      src={icon}
      alt=""
      width={size}
      height={size}
      className={className}
      unoptimized
    />
  )
}
