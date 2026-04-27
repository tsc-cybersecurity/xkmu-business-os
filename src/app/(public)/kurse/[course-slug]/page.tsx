import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CoursePublicService } from '@/lib/services/course-public.service'
import { CourseLandingHeader } from '@/components/elearning/CourseLandingHeader'
import { CourseLandingOutline } from '@/components/elearning/CourseLandingOutline'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ 'course-slug': string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { 'course-slug': slug } = await params
  const detail = await CoursePublicService.getPublicBySlug(slug)
  if (!detail) return { title: 'Kurs nicht gefunden' }
  const desc = detail.course.subtitle ?? detail.course.description?.slice(0, 160) ?? undefined
  return {
    title: `${detail.course.title} – xKMU`,
    description: desc,
    openGraph: {
      title: detail.course.title,
      description: desc,
      type: 'website',
      images: detail.course.coverImageId
        ? [`/api/v1/media/${detail.course.coverImageId}`]
        : undefined,
    },
  }
}

export default async function PublicCourseLandingPage({ params }: Props) {
  const { 'course-slug': slug } = await params
  const detail = await CoursePublicService.getPublicBySlug(slug)
  if (!detail) notFound()

  return (
    <div className="container mx-auto px-4 py-12 space-y-10">
      <CourseLandingHeader
        course={detail.course}
        modules={detail.modules}
        lessons={detail.lessons}
        basePath="/kurse"
      />
      <CourseLandingOutline
        courseSlug={detail.course.slug}
        modules={detail.modules}
        lessons={detail.lessons}
        basePath="/kurse"
      />
    </div>
  )
}
