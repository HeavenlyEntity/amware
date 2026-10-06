/* The studio template's column rule for the testimonial wall: never leave
   a single card alone on the last row. */
export function masonryGridColsClass(count) {
  if (count <= 1) return 'grid-cols-1 sm:grid-cols-1'
  if (count <= 2) return 'grid-cols-1 sm:grid-cols-2'
  // Three columns strand a card when count % 3 === 1 (4 → 3 + 1).
  if (count % 3 !== 1) return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
  if (count % 2 === 0) return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-2'
  // Odd with count % 3 === 1 (7): 4 + 3 avoids the orphan 3 or 2 columns leave.
  if (count === 7) return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
  return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
}
