import { db } from '@/lib/db'
import {
  courseQuizzes,
  courseQuizQuestions,
  courseQuizAttempts,
  courseLessons,
} from '@/lib/db/schema'
import type {
  CourseQuiz,
  CourseQuizQuestion,
  CourseQuizAttempt,
  CourseQuizOption,
} from '@/lib/db/schema'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { AuditLogService } from './audit-log.service'
import { CourseLessonProgressService } from './course-lesson-progress.service'

export type QuizQuestionKind = 'single' | 'multiple' | 'truefalse'

export interface Actor {
  userId: string | null
  userRole: string | null
}

export interface QuizConfigInput {
  passThreshold?: number
  allowRetake?: boolean
}

export interface QuestionInput {
  kind: QuizQuestionKind
  prompt: string
  explanation?: string | null
  options: Array<{ text: string; isCorrect: boolean }>
}

export class CourseQuizError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

function normalizeOptions(kind: QuizQuestionKind, options: QuestionInput['options']): CourseQuizOption[] {
  if (kind === 'truefalse') {
    // Auto-create true/false options. Caller specifies which is correct via
    // setting isCorrect on the matching text — fall back to "true correct".
    const trueCorrect = options.find((o) => /^(wahr|true)$/i.test(o.text))?.isCorrect ?? true
    return [
      { id: randomUUID(), text: 'Wahr', isCorrect: trueCorrect },
      { id: randomUUID(), text: 'Falsch', isCorrect: !trueCorrect },
    ]
  }
  if (options.length < 2) {
    throw new CourseQuizError('VALIDATION', 'Mindestens 2 Antwortoptionen erforderlich')
  }
  const correctCount = options.filter((o) => o.isCorrect).length
  if (kind === 'single' && correctCount !== 1) {
    throw new CourseQuizError('VALIDATION', 'Single-Choice braucht genau eine korrekte Antwort')
  }
  if (kind === 'multiple' && correctCount < 1) {
    throw new CourseQuizError('VALIDATION', 'Multiple-Choice braucht mindestens eine korrekte Antwort')
  }
  return options.map((o) => ({ id: randomUUID(), text: o.text.trim(), isCorrect: !!o.isCorrect }))
}

function gradeAnswer(
  question: { kind: QuizQuestionKind; options: CourseQuizOption[] },
  selectedOptionIds: string[],
): boolean {
  const correctIds = new Set(question.options.filter((o) => o.isCorrect).map((o) => o.id))
  const selectedSet = new Set(selectedOptionIds)
  if (selectedSet.size !== correctIds.size) return false
  for (const id of correctIds) if (!selectedSet.has(id)) return false
  return true
}

function sanitizeQuestionForConsumer(q: CourseQuizQuestion): {
  id: string
  kind: QuizQuestionKind
  prompt: string
  options: Array<{ id: string; text: string }>
} {
  const opts = (q.options as CourseQuizOption[]) ?? []
  return {
    id: q.id,
    kind: q.kind as QuizQuestionKind,
    prompt: q.prompt,
    options: opts.map((o) => ({ id: o.id, text: o.text })),
  }
}

export const CourseQuizService = {
  async getByLessonId(lessonId: string): Promise<CourseQuiz | null> {
    const [row] = await db
      .select()
      .from(courseQuizzes)
      .where(eq(courseQuizzes.lessonId, lessonId))
      .limit(1)
    return row ?? null
  },

  async getWithQuestions(
    lessonId: string,
    surface: 'author' | 'consumer',
  ): Promise<
    | {
        quiz: CourseQuiz
        questions: CourseQuizQuestion[] | Array<ReturnType<typeof sanitizeQuestionForConsumer>>
      }
    | null
  > {
    const quiz = await CourseQuizService.getByLessonId(lessonId)
    if (!quiz) return null
    const questions = await db
      .select()
      .from(courseQuizQuestions)
      .where(eq(courseQuizQuestions.quizId, quiz.id))
      .orderBy(asc(courseQuizQuestions.position))
    if (surface === 'consumer') {
      return { quiz, questions: questions.map(sanitizeQuestionForConsumer) }
    }
    return { quiz, questions }
  },

  async upsertConfig(
    lessonId: string,
    input: QuizConfigInput,
    actor: Actor,
  ): Promise<CourseQuiz> {
    const [lesson] = await db
      .select({ id: courseLessons.id, courseId: courseLessons.courseId })
      .from(courseLessons)
      .where(eq(courseLessons.id, lessonId))
      .limit(1)
    if (!lesson) throw new CourseQuizError('LESSON_NOT_FOUND', `Lektion ${lessonId} nicht gefunden`)

    const passThreshold = Math.max(0, Math.min(100, input.passThreshold ?? 70))
    const allowRetake = input.allowRetake ?? true

    const existing = await CourseQuizService.getByLessonId(lessonId)
    let row: CourseQuiz
    if (existing) {
      const [updated] = await db
        .update(courseQuizzes)
        .set({ passThreshold, allowRetake, updatedAt: new Date() })
        .where(eq(courseQuizzes.id, existing.id))
        .returning()
      row = updated
    } else {
      const [created] = await db
        .insert(courseQuizzes)
        .values({ lessonId, passThreshold, allowRetake })
        .returning()
      row = created
    }
    await AuditLogService.log({
      userId: actor.userId,
      userRole: actor.userRole,
      action: existing ? 'course_quiz.updated' : 'course_quiz.created',
      entityType: 'course_quiz',
      entityId: row.id,
      payload: { lessonId, passThreshold, allowRetake },
    })
    return row
  },

  async deleteForLesson(lessonId: string, actor: Actor): Promise<void> {
    const existing = await CourseQuizService.getByLessonId(lessonId)
    if (!existing) return
    await db.delete(courseQuizzes).where(eq(courseQuizzes.id, existing.id))
    await AuditLogService.log({
      userId: actor.userId,
      userRole: actor.userRole,
      action: 'course_quiz.deleted',
      entityType: 'course_quiz',
      entityId: existing.id,
      payload: { lessonId },
    })
  },

  async addQuestion(
    quizId: string,
    input: QuestionInput,
    actor: Actor,
  ): Promise<CourseQuizQuestion> {
    if (!input.prompt.trim()) throw new CourseQuizError('VALIDATION', 'Frage darf nicht leer sein')
    const options = normalizeOptions(input.kind, input.options)
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${courseQuizQuestions.position}), 0)` })
      .from(courseQuizQuestions)
      .where(eq(courseQuizQuestions.quizId, quizId))
    const [row] = await db
      .insert(courseQuizQuestions)
      .values({
        quizId,
        kind: input.kind,
        prompt: input.prompt.trim(),
        explanation: input.explanation?.trim() || null,
        options,
        position: (max ?? 0) + 1,
      })
      .returning()
    await AuditLogService.log({
      userId: actor.userId,
      userRole: actor.userRole,
      action: 'course_quiz_question.created',
      entityType: 'course_quiz_question',
      entityId: row.id,
      payload: { quizId, kind: input.kind },
    })
    return row
  },

  async updateQuestion(
    questionId: string,
    input: QuestionInput,
    actor: Actor,
  ): Promise<CourseQuizQuestion> {
    if (!input.prompt.trim()) throw new CourseQuizError('VALIDATION', 'Frage darf nicht leer sein')
    const options = normalizeOptions(input.kind, input.options)
    const [row] = await db
      .update(courseQuizQuestions)
      .set({
        kind: input.kind,
        prompt: input.prompt.trim(),
        explanation: input.explanation?.trim() || null,
        options,
        updatedAt: new Date(),
      })
      .where(eq(courseQuizQuestions.id, questionId))
      .returning()
    if (!row) throw new CourseQuizError('NOT_FOUND', `Frage ${questionId} nicht gefunden`)
    await AuditLogService.log({
      userId: actor.userId,
      userRole: actor.userRole,
      action: 'course_quiz_question.updated',
      entityType: 'course_quiz_question',
      entityId: questionId,
      payload: { quizId: row.quizId, kind: input.kind },
    })
    return row
  },

  async deleteQuestion(questionId: string, actor: Actor): Promise<void> {
    const [existing] = await db
      .select()
      .from(courseQuizQuestions)
      .where(eq(courseQuizQuestions.id, questionId))
      .limit(1)
    if (!existing) return
    await db.delete(courseQuizQuestions).where(eq(courseQuizQuestions.id, questionId))
    await AuditLogService.log({
      userId: actor.userId,
      userRole: actor.userRole,
      action: 'course_quiz_question.deleted',
      entityType: 'course_quiz_question',
      entityId: questionId,
      payload: { quizId: existing.quizId },
    })
  },

  async reorderQuestions(
    quizId: string,
    items: Array<{ id: string; position: number }>,
  ): Promise<void> {
    await db.transaction(async (tx) => {
      for (const it of items) {
        await tx
          .update(courseQuizQuestions)
          .set({ position: it.position, updatedAt: new Date() })
          .where(and(eq(courseQuizQuestions.id, it.id), eq(courseQuizQuestions.quizId, quizId)))
      }
    })
  },

  /**
   * Submit answers and compute score. If passed, marks the lesson as completed
   * for that user. Returns the attempt + per-question correctness map.
   */
  async submitAttempt(
    lessonId: string,
    userId: string,
    answers: Record<string, string[]>,
  ): Promise<{
    attempt: CourseQuizAttempt
    perQuestion: Array<{ questionId: string; correct: boolean; correctOptionIds: string[]; explanation: string | null }>
  }> {
    const [lesson] = await db
      .select({ id: courseLessons.id, courseId: courseLessons.courseId })
      .from(courseLessons)
      .where(eq(courseLessons.id, lessonId))
      .limit(1)
    if (!lesson) throw new CourseQuizError('LESSON_NOT_FOUND', `Lektion ${lessonId} nicht gefunden`)

    const quiz = await CourseQuizService.getByLessonId(lessonId)
    if (!quiz) throw new CourseQuizError('NO_QUIZ', 'Diese Lektion hat kein Quiz')

    if (!quiz.allowRetake) {
      const [previousPassed] = await db
        .select({ id: courseQuizAttempts.id })
        .from(courseQuizAttempts)
        .where(
          and(
            eq(courseQuizAttempts.quizId, quiz.id),
            eq(courseQuizAttempts.userId, userId),
            eq(courseQuizAttempts.passed, true),
          ),
        )
        .limit(1)
      if (previousPassed) {
        throw new CourseQuizError('NO_RETAKE', 'Quiz wurde bereits bestanden — Wiederholung nicht erlaubt.')
      }
    }

    const questions = await db
      .select()
      .from(courseQuizQuestions)
      .where(eq(courseQuizQuestions.quizId, quiz.id))
      .orderBy(asc(courseQuizQuestions.position))
    if (questions.length === 0) {
      throw new CourseQuizError('EMPTY_QUIZ', 'Quiz enthält noch keine Fragen')
    }

    const perQuestion = questions.map((q) => {
      const opts = (q.options as CourseQuizOption[]) ?? []
      const selected = answers[q.id] ?? []
      const correct = gradeAnswer({ kind: q.kind as QuizQuestionKind, options: opts }, selected)
      return {
        questionId: q.id,
        correct,
        correctOptionIds: opts.filter((o) => o.isCorrect).map((o) => o.id),
        explanation: q.explanation,
      }
    })

    const correctCount = perQuestion.filter((p) => p.correct).length
    const score = Math.round((correctCount / questions.length) * 100)
    const passed = score >= quiz.passThreshold

    const [attempt] = await db
      .insert(courseQuizAttempts)
      .values({
        quizId: quiz.id,
        userId,
        score,
        passed,
        answers,
      })
      .returning()

    if (passed) {
      // Auto-mark lesson completed; passes through sequential gating.
      try {
        await CourseLessonProgressService.markCompleted(userId, lesson.courseId, lessonId, { fromQuiz: true })
      } catch (err) {
        // Do not fail the attempt persistence if lesson completion is blocked
        // (e.g. sequential gate). The attempt is still recorded.
        if (process.env.NODE_ENV !== 'test') {
          console.error('[course-quiz] auto-complete failed', err)
        }
      }
    }

    await AuditLogService.log({
      userId,
      userRole: null,
      action: 'course_quiz.attempted',
      entityType: 'course_quiz',
      entityId: quiz.id,
      payload: { lessonId, score, passed },
    })

    return { attempt, perQuestion }
  },

  async listAttemptsForUser(
    quizId: string,
    userId: string,
  ): Promise<CourseQuizAttempt[]> {
    return db
      .select()
      .from(courseQuizAttempts)
      .where(and(eq(courseQuizAttempts.quizId, quizId), eq(courseQuizAttempts.userId, userId)))
      .orderBy(desc(courseQuizAttempts.completedAt))
  },

  async hasPassed(quizId: string, userId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: courseQuizAttempts.id })
      .from(courseQuizAttempts)
      .where(
        and(
          eq(courseQuizAttempts.quizId, quizId),
          eq(courseQuizAttempts.userId, userId),
          eq(courseQuizAttempts.passed, true),
        ),
      )
      .limit(1)
    return !!row
  },

  async lessonHasQuiz(lessonId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: courseQuizzes.id })
      .from(courseQuizzes)
      .where(eq(courseQuizzes.lessonId, lessonId))
      .limit(1)
    return !!row
  },
}
