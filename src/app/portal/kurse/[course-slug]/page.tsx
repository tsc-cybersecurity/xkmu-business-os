import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CoursePublicService } from '@/lib/services/course-public.service'
import { CourseLandingHeader } from '@/components/elearning/CourseLandingHeader'
import { CourseLandingOutline } from '@/components/elearning/CourseLandingOutline'

interface Props { params: Promise<{ 'course-slug': string }> }

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function PortalCourseLandingPage({ params }: Props) {
  const { 'course-slug': slug } = await params
  const detail = await CoursePublicService.getPortalBySlug(slug)
  if (!detail) notFound()

  return (
    <div className="space-y-10">
      <CourseLandingHeader
        course={detail.course}
        modules={detail.modules}
        lessons={detail.lessons}
        basePath="/portal/kurse"
      />
      <CourseLandingOutline
        courseSlug={detail.course.slug}
        modules={detail.modules}
        lessons={detail.lessons}
        basePath="/portal/kurse"
      />
    </div>
  )
}
