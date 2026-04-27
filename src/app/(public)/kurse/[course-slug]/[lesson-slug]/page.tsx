import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CoursePublicService } from '@/lib/services/course-public.service'
import { CoursePlayerLayout } from '@/components/elearning/CoursePlayerLayout'
import { LessonContent } from '@/components/elearning/LessonContent'
import { LessonVideoPlayer } from '@/components/elearning/LessonVideoPlayer'
import { LessonPrevNextNav } from '@/components/elearning/LessonPrevNextNav'

interface Props { params: Promise<{ 'course-slug': string; 'lesson-slug': string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params
  const ctx = await CoursePublicService.getPublicLesson(p['course-slug'], p['lesson-slug'])
  if (!ctx) return { title: 'Lektion nicht gefunden' }
  const desc = ctx.course.subtitle ?? undefined
  return {
    title: `${ctx.lesson.title} – ${ctx.course.title} – xKMU`,
    description: desc,
    openGraph: {
      title: `${ctx.lesson.title} – ${ctx.course.title}`,
      description: desc,
      type: 'article',
      images: ctx.course.coverImageId ? [`/api/v1/media/${ctx.course.coverImageId}`] : undefined,
    },
  }
}

export default async function PublicLessonPage({ params }: Props) {
  const p = await params
  const ctx = await CoursePublicService.getPublicLesson(p['course-slug'], p['lesson-slug'])
  if (!ctx) notFound()

  const videoAsset = ctx.assets.find((a) => a.id === ctx.lesson.videoAssetId) ?? null

  return (
    <div className="container mx-auto px-4 py-8">
      <CoursePlayerLayout
        course={ctx.course}
        modules={ctx.modules}
        lessons={ctx.lessons}
        currentLessonId={ctx.lesson.id}
        basePath="/kurse"
      >
        <LessonVideoPlayer
          videoAsset={videoAsset}
          videoExternalUrl={ctx.lesson.videoExternalUrl}
        />
        <LessonContent lesson={ctx.lesson} assets={ctx.assets} />
        <LessonPrevNextNav prev={ctx.prev} next={ctx.next} basePath="/kurse" />
      </CoursePlayerLayout>
    </div>
  )
}
