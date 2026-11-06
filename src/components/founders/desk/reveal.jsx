'use client'

import { useReveal } from '@/components/founders/desk/use-reveal'

/* A block that rises in once it scrolls into view (see `useReveal` for why it
   can never hide content). Children stay server-rendered; descendants key
   their own entrances off `[data-armed]` / `[data-in]` on this element. */
export function Reveal({
  as: Tag = 'div',
  delay = 0,
  className = '',
  style,
  children,
  ...rest
}) {
  const { ref, attrs } = useReveal()
  return (
    <Tag
      ref={ref}
      className={className}
      style={delay ? { '--d': `${delay}s`, ...style } : style}
      {...attrs}
      {...rest}
    >
      {children}
    </Tag>
  )
}
