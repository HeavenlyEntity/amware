import '@/styles/founders-wizard.css'

/*
 * The desk's status pill (board `.eq-badge`). `quiet` is the neutral "?" /
 * "No badge yet" look. `pop` re-plays the spring every time `children`
 * changes: the element is keyed on its text.
 *
 * Props: { children, quiet, size: 'md' | 'lg', pop, className }
 */
export function Badge({
  children,
  quiet = false,
  size = 'md',
  pop = true,
  className = '',
}) {
  const classes = [
    'amw-wz-badge',
    quiet ? 'amw-wz-badge--q' : '',
    size === 'lg' ? 'amw-wz-badge--lg' : '',
    pop ? 'amw-wz-pop' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <span key={pop ? String(children) : undefined} className={classes}>
      {children}
    </span>
  )
}
