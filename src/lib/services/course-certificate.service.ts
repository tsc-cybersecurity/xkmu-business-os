import { db } from '@/lib/db'
import { courseCertificates } from '@/lib/db/schema'
import type { CourseCertificate } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'
import { CourseLessonProgressService } from './course-lesson-progress.service'

export class CourseCertificateError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

export const CourseCertificateService = {
  /**
   * User-fluss: User klickt "Zertifikat anfordern".
   * Bedingung: 100% Lessons complete.
   * Idempotent: existiert ein pending oder issued Zertifikat, gib es zurueck.
   * Bei rejected: setze auf requested zurueck (re-request).
   */
  async requestCertificate(userId: string, courseId: string): Promise<CourseCertificate> {
    const progress = await CourseLessonProgressService.getCourseProgress(userId, courseId)
    if (progress.percentage < 100) {
      throw new CourseCertificateError('NOT_COMPLETE', `Kurs noch nicht abgeschlossen (${progress.percentage}%)`)
    }

    const [existing] = await db
      .select()
      .from(courseCertificates)
      .where(and(eq(courseCertificates.userId, userId), eq(courseCertificates.courseId, courseId)))
      .limit(1)

    if (existing) {
      if (existing.status === 'requested' || existing.status === 'issued') {
        return existing
      }
      // status='rejected' -> re-request: clear review fields, set status back to requested
      const [row] = await db
        .update(courseCertificates)
        .set({
          status: 'requested',
          reviewedBy: null,
          reviewedAt: null,
          reviewComment: null,
          requestedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(courseCertificates.id, existing.id))
        .returning()

      await AuditLogService.log({
        userId, userRole: null,
        action: 'certificate.re-requested',
        entityType: 'course_certificate', entityId: row.id,
        payload: { courseId },
      })
      return row
    }

    const [row] = await db
      .insert(courseCertificates)
      .values({ userId, courseId, status: 'requested' })
      .returning()

    await AuditLogService.log({
      userId, userRole: null,
      action: 'certificate.requested',
      entityType: 'course_certificate', entityId: row.id,
      payload: { courseId },
    })
    return row
  },

  async getForUserCourse(userId: string, courseId: string): Promise<CourseCertificate | null> {
    const [row] = await db
      .select()
      .from(courseCertificates)
      .where(and(eq(courseCertificates.userId, userId), eq(courseCertificates.courseId, courseId)))
      .limit(1)
    return row ?? null
  },

  async listForUser(userId: string): Promise<CourseCertificate[]> {
    return db
      .select()
      .from(courseCertificates)
      .where(eq(courseCertificates.userId, userId))
      .orderBy(desc(courseCertificates.requestedAt))
  },

  async listPending(): Promise<CourseCertificate[]> {
    return db
      .select()
      .from(courseCertificates)
      .where(eq(courseCertificates.status, 'requested'))
      .orderBy(desc(courseCertificates.requestedAt))
  },

  async approve(certificateId: string, adminUserId: string, reviewComment?: string): Promise<CourseCertificate> {
    const [existing] = await db
      .select()
      .from(courseCertificates)
      .where(eq(courseCertificates.id, certificateId))
      .limit(1)
    if (!existing) throw new CourseCertificateError('NOT_FOUND', 'Zertifikats-Antrag nicht gefunden')
    if (existing.status !== 'requested') {
      throw new CourseCertificateError('BAD_STATE', `Antrag ist im Status ${existing.status}, nicht 'requested'`)
    }

    const now = new Date()
    const [row] = await db
      .update(courseCertificates)
      .set({
        status: 'issued',
        issuedAt: now,
        reviewedBy: adminUserId,
        reviewedAt: now,
        reviewComment: reviewComment ?? null,
        updatedAt: now,
      })
      .where(eq(courseCertificates.id, certificateId))
      .returning()

    await AuditLogService.log({
      userId: adminUserId, userRole: 'admin',
      action: 'certificate.approved',
      entityType: 'course_certificate', entityId: row.id,
      payload: { courseId: row.courseId, requestUserId: row.userId },
    })
    return row
  },

  async reject(certificateId: string, adminUserId: string, reviewComment?: string): Promise<CourseCertificate> {
    const [existing] = await db
      .select()
      .from(courseCertificates)
      .where(eq(courseCertificates.id, certificateId))
      .limit(1)
    if (!existing) throw new CourseCertificateError('NOT_FOUND', 'Zertifikats-Antrag nicht gefunden')
    if (existing.status !== 'requested') {
      throw new CourseCertificateError('BAD_STATE', `Antrag ist im Status ${existing.status}, nicht 'requested'`)
    }

    const now = new Date()
    const [row] = await db
      .update(courseCertificates)
      .set({
        status: 'rejected',
        reviewedBy: adminUserId,
        reviewedAt: now,
        reviewComment: reviewComment ?? null,
        updatedAt: now,
      })
      .where(eq(courseCertificates.id, certificateId))
      .returning()

    await AuditLogService.log({
      userId: adminUserId, userRole: 'admin',
      action: 'certificate.rejected',
      entityType: 'course_certificate', entityId: row.id,
      payload: { courseId: row.courseId, requestUserId: row.userId, reason: reviewComment ?? null },
    })
    return row
  },
}
