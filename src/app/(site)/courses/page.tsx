import type { Course } from '@/payload-types'
import { withSocialImage } from '@/lib/social/metadata'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { CourseCard } from '@/components/commerce/storefront'
import { SecureTheStack } from '@/components/courses/secure-the-stack'
import '@/styles/portfolio.css'
import '@/styles/courses.css'

export const revalidate = 60

export const metadata = withSocialImage(
  {
    title: 'Courses',
    description:
      'Practical, build-along courses drawn from real production engineering.',
  },
  'courses'
)

/* The Secure the Stack landing (static content in content/site/courses),
   then any published CMS courses under "All courses". With none published
   the grid is left out. */
export default async function CoursesPage() {
  /* The landing is static; if the CMS is unreachable, it still renders
     and only the catalogue grid is left out. */
  let docs: Course[] = []
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'courses',
      where: { status: { equals: 'published' } },
      sort: 'order',
      depth: 0,
      limit: 100,
    })
    docs = result.docs
  } catch (error) {
    console.error('Courses: could not load published courses', error)
  }

  return (
    <div className="amw co overflow-x-clip pb-24 pt-4 md:pt-8">
      <SecureTheStack />

      {docs.length > 0 && (
        <section aria-labelledby="co-all-title" className="pj-wrap pj-section">
          <h2 id="co-all-title" className="pj-h2">
            All courses
          </h2>
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {docs.map((course, i) => (
              <CourseCard key={course.id} course={course} index={i} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
