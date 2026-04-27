import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CoursePublicService } from '@/lib/services/course-public.service'
import { CoursePlayerLayout } from '@/components/elearning/CoursePlayerLayout'
import { LessonContent } from '@/components/elearning/LessonContent'
import { LessonVideoPlayer } from '@/components/elearning/LessonVideoPlayer'
import { LessonPrevNextNav } from '@/components/elearning/LessonPrevNextNav'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ 'course-slug': string; 'lesson-slug': string }> }

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function PortalLessonPage({ params }: Props) {
  const p = await params
  const ctx = await CoursePublicService.getPortalLesson(p['course-slug'], p['lesson-slug'])
  if (!ctx) notFound()
  const videoAsset = ctx.assets.find((a) => a.id === ctx.lesson.videoAssetId) ?? null
  return (
    <CoursePlayerLayout
      course={ctx.course}
      modules={ctx.modules}
      lessons={ctx.lessons}
      currentLessonId={ctx.lesson.id}
      basePath="/portal/kurse"
    >
      <LessonVideoPlayer
        videoAsset={videoAsset}
        videoExternalUrl={ctx.lesson.videoExternalUrl}
      />
      <LessonContent lesson={ctx.lesson} assets={ctx.assets} />
      <LessonPrevNextNav prev={ctx.prev} next={ctx.next} basePath="/portal/kurse" />
    </CoursePlayerLayout>
  )
}
