import { withSocialImage } from '@/lib/social/metadata'
import { notFound } from 'next/navigation'
import { Container } from '@/components/Container'
import { TrackView } from '@/components/analytics/TrackView'
import { CourseBody } from '@/components/site/CourseBody'
import { getPayloadClient } from '@/lib/getPayloadClient'
import { BuyButton } from '@/components/commerce/BuyButton'
import { planId } from '@/lib/commerce/whopEnv'

export const revalidate = 60

async function getCourse(slug: string) {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'courses',
    where: { slug: { equals: slug }, status: { equals: 'published' } },
    depth: 1,
    limit: 1,
  })
  return docs[0] ?? null
}

export async function generateStaticParams() {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'courses',
    where: { status: { equals: 'published' } },
    depth: 0,
    limit: 1000,
  })
  return docs.map((d) => ({ slug: d.slug as string }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const course = await getCourse(slug)
  if (!course) return {}
  return withSocialImage(
    { title: course.title, description: course.summary ?? undefined },
    'courses'
  )
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const course = await getCourse(slug)
  if (!course) notFound()

  const payload = await getPayloadClient()
  const { docs: lessons } = await payload.find({
    collection: 'lessons',
    where: { course: { equals: course.id }, status: { equals: 'published' } },
    sort: 'order',
    depth: 0,
    limit: 1000,
  })

  return (
    <Container className="mt-16 sm:mt-32">
      <TrackView type="course" id={course.slug} name={course.title} />
      <CourseBody
        course={course}
        lessons={lessons}
        cta={
          course.creemProductId ? (
            <BuyButton
              planId={planId(course)}
              itemType="course"
              slug={course.slug}
              price={
                typeof course.price === 'number'
                  ? (course.price as number)
                  : undefined
              }
              name={course.title}
            />
          ) : null
        }
      />
    </Container>
  )
}
