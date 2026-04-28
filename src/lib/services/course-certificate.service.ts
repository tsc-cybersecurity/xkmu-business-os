import { db } from '@/lib/db'
import { courseCertificates, users, courses } from '@/lib/db/schema'
import type { CourseCertificate } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'
import { CourseLessonProgressService } from './course-lesson-progress.service'
import { EmailService } from './email.service'
import { CmsDesignService } from './cms-design.service'
import { logger } from '@/lib/utils/logger'

export class CourseCertificateError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

/**
 * Sub-3d T5: notify the certificate-owner about a status change.
 * Fail-soft: errors are logged but never thrown — admin workflow must
 * succeed even if SMTP is broken.
 */
async function notifyOwner(
  cert: CourseCertificate,
  kind: 'approved' | 'rejected' | 'revoked',
): Promise<void> {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, cert.userId)).limit(1)
    const [course] = await db.select().from(courses).where(eq(courses.id, cert.courseId)).limit(1)
    if (!user?.email || !course) return

    const appUrl = await CmsDesignService.getAppUrl()
    const verifyUrl = `${appUrl}/zertifikat/${cert.identifier}`

    let subject: string
    let body: string
    if (kind === 'approved') {
      subject = `Zertifikat für "${course.title}" ausgestellt`
      body = `Hallo,\n\nGlückwunsch! Dein Zertifikat für den Kurs "${course.title}" wurde ausgestellt.\n\n`
        + `Du kannst es im Portal herunterladen oder über den Verifikations-Link einsehen:\n${verifyUrl}\n\n`
        + (cert.reviewComment ? `Kommentar: ${cert.reviewComment}\n\n` : '')
        + `Verifikations-ID: ${cert.identifier}\n`
    } else if (kind === 'rejected') {
      subject = `Zertifikats-Antrag für "${course.title}" abgelehnt`
      body = `Hallo,\n\ndein Zertifikats-Antrag für den Kurs "${course.title}" wurde abgelehnt.\n\n`
        + (cert.reviewComment ? `Begründung: ${cert.reviewComment}\n\n` : '')
        + `Du kannst den Antrag erneut stellen, sobald die Begründung adressiert ist.\n`
    } else {
      subject = `Zertifikat für "${course.title}" widerrufen`
      body = `Hallo,\n\ndein Zertifikat für den Kurs "${course.title}" wurde widerrufen.\n\n`
        + (cert.reviewComment ? `Begründung: ${cert.reviewComment}\n\n` : '')
        + `Verifikations-ID: ${cert.identifier}\n`
    }

    await EmailService.send({ to: user.email, subject, body })
  } catch (err) {
    logger.warn('Certificate notification email failed', {
      module: 'CourseCertificateService',
      kind,
      certId: cert.id,
      error: String(err),
    })
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
    void notifyOwner(row, 'approved')
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
    void notifyOwner(row, 'rejected')
    return row
  },

  async revoke(certificateId: string, adminUserId: string, reviewComment?: string): Promise<CourseCertificate> {
    const [existing] = await db
      .select()
      .from(courseCertificates)
      .where(eq(courseCertificates.id, certificateId))
      .limit(1)
    if (!existing) throw new CourseCertificateError('NOT_FOUND', 'Zertifikat nicht gefunden')
    if (existing.status !== 'issued') {
      throw new CourseCertificateError('BAD_STATE', `Zertifikat ist im Status ${existing.status}, nicht 'issued'`)
    }

    const now = new Date()
    const [row] = await db
      .update(courseCertificates)
      .set({
        status: 'revoked',
        reviewedBy: adminUserId,
        reviewedAt: now,
        reviewComment: reviewComment ?? existing.reviewComment,
        updatedAt: now,
      })
      .where(eq(courseCertificates.id, certificateId))
      .returning()

    await AuditLogService.log({
      userId: adminUserId, userRole: 'admin',
      action: 'certificate.revoked',
      entityType: 'course_certificate', entityId: row.id,
      payload: { courseId: row.courseId, requestUserId: row.userId, reason: reviewComment ?? null },
    })
    void notifyOwner(row, 'revoked')
    return row
  },

  async listByStatus(status: 'requested' | 'issued' | 'rejected' | 'revoked'): Promise<CourseCertificate[]> {
    return db
      .select()
      .from(courseCertificates)
      .where(eq(courseCertificates.status, status))
      .orderBy(desc(courseCertificates.requestedAt))
  },

  async findByIdentifier(identifier: string): Promise<CourseCertificate | null> {
    const [row] = await db
      .select()
      .from(courseCertificates)
      .where(eq(courseCertificates.identifier, identifier))
      .limit(1)
    return row ?? null
  },
}
