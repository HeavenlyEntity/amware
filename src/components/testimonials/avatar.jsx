import Image from 'next/image'

/* A face when one is on file, otherwise initials. Real people get
   initials until they supply a photo: no stock or generated face ever
   stands in for someone real. Decoration either way; the name sits
   beside it. */

export function initials(name) {
  return String(name || '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

export function Avatar({ person, className = '', size = 44, tone = 'light' }) {
  if (person.image) {
    return (
      <span
        aria-hidden="true"
        className={`relative block shrink-0 overflow-hidden rounded-full ${className}`}
      >
        <Image
          src={person.image}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover object-top"
        />
      </span>
    )
  }
  const colours =
    tone === 'dark'
      ? 'bg-white/15 text-white'
      : 'bg-[var(--amw-accent-soft)] text-[var(--amw-accent-ink)]'
  return (
    <span
      aria-hidden="true"
      className={`amw-mono flex shrink-0 items-center justify-center rounded-full text-xs font-medium ${colours} ${className}`}
    >
      {initials(person.name)}
    </span>
  )
}
