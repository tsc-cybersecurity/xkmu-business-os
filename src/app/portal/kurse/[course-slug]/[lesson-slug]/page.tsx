import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CoursePublicService } from '@/lib/services/course-public.service'
import { CourseCertificateService } from '@/lib/services/course-certificate.service'
import { CourseQuizService } from '@/lib/services/course-quiz.service'
import { CoursePlayerLayout } from '@/components/elearning/CoursePlayerLayout'
import { LessonContent } from '@/components/elearning/LessonContent'
import { LessonVideoPlayer } from '@/components/elearning/LessonVideoPlayer'
import { LessonPrevNextNav } from '@/components/elearning/LessonPrevNextNav'
import { CertificateStatusCard } from '@/components/elearning/CertificateStatusCard'
import { LessonQuiz } from '@/components/elearning/LessonQuiz'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ 'course-slug': string; 'lesson-slug': string }> }

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function PortalLessonPage({ params }: Props) {
  const p = await params
  const session = await getSession()
  const userId = session?.user.id
  const ctx = await CoursePublicService.getPortalLesson(p['course-slug'], p['lesson-slug'], userId)
  if (!ctx) notFound()
  const videoAsset = ctx.assets.find((a) => a.id === ctx.lesson.videoAssetId) ?? null
  const completion = userId
    ? {
        courseId: ctx.course.id,
        isCompleted: ctx.progress?.completedLessonIds.includes(ctx.lesson.id) ?? false,
      }
    : undefined
  const certificate = userId
    ? await CourseCertificateService.getForUserCourse(userId, ctx.course.id)
    : null
  const eligibleForRequest = (ctx.progress?.percentage ?? 0) >= 100

  // Phase 2 quiz support: fetch quiz + sanitized questions + last attempt info.
  let quizSection: {
    quiz: { id: string; passThreshold: number; allowRetake: boolean }
    questions: Array<{ id: string; kind: 'single' | 'multiple' | 'truefalse'; prompt: string; options: Array<{ id: string; text: string }> }>
    alreadyPassed: boolean
    lastScore?: number
  } | null = null
  if (userId) {
    const result = await CourseQuizService.getWithQuestions(ctx.lesson.id, 'consumer')
    if (result) {
      const attempts = await CourseQuizService.listAttemptsForUser(result.quiz.id, userId)
      const passedAttempt = attempts.find((a) => a.passed)
      const lastAttempt = attempts[0]
      quizSection = {
        quiz: {
          id: result.quiz.id,
          passThreshold: result.quiz.passThreshold,
          allowRetake: result.quiz.allowRetake,
        },
        questions: result.questions as Array<{ id: string; kind: 'single' | 'multiple' | 'truefalse'; prompt: string; options: Array<{ id: string; text: string }> }>,
        alreadyPassed: !!passedAttempt,
        lastScore: passedAttempt?.score ?? lastAttempt?.score,
      }
    }
  }
  const lockedSet = new Set(ctx.lockedLessonIds ?? [])
  const next = ctx.next ? { ...ctx.next, locked: false } : null
  if (next && ctx.course.enforceSequential) {
    const nextLesson = ctx.lessons.find((l) => l.slug === next.lessonSlug)
    if (nextLesson && lockedSet.has(nextLesson.id)) next.locked = true
  }
  return (
    <CoursePlayerLayout
      course={ctx.course}
      modules={ctx.modules}
      lessons={ctx.lessons}
      currentLessonId={ctx.lesson.id}
      basePath="/portal/kurse"
      progress={
        ctx.progress
          ? { completed: ctx.progress.completed, total: ctx.progress.total, percentage: ctx.progress.percentage }
          : undefined
      }
      completedLessonIds={ctx.progress?.completedLessonIds}
      lockedLessonIds={ctx.lockedLessonIds}
    >
      <LessonVideoPlayer
        videoAsset={videoAsset}
        videoExternalUrl={ctx.lesson.videoExternalUrl}
      />
      {userId && (
        <CertificateStatusCard
          courseId={ctx.course.id}
          certificate={certificate}
          eligibleForRequest={eligibleForRequest}
        />
      )}
      <LessonContent
        lesson={{ ...ctx.lesson, blocks: ctx.blocks }}
        assets={ctx.assets}
        completion={quizSection ? undefined : completion}
      />
      {quizSection && userId && (
        <LessonQuiz
          courseId={ctx.course.id}
          lessonId={ctx.lesson.id}
          quiz={quizSection.quiz}
          questions={quizSection.questions}
          alreadyPassed={quizSection.alreadyPassed}
          lastScore={quizSection.lastScore}
        />
      )}
      <LessonPrevNextNav prev={ctx.prev} next={next} basePath="/portal/kurse" />
    </CoursePlayerLayout>
  )
}
