/**
 * Sub-3c: PDF-Generation fuer ausgestellte Zertifikate.
 * Rendert die CertificatePDF-Komponente serverseitig zu einem Buffer.
 */
import { db } from '@/lib/db'
import { courseCertificates, courses, users, organization } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { renderToBuffer } from '@react-pdf/renderer'
import { CertificatePDF } from '@/components/elearning/CertificatePDF'
import { createElement } from 'react'

export class CertificatePdfError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

export const CertificatePdfService = {
  /**
   * Rendert das Zertifikat fuer (userId, courseId) als PDF-Buffer.
   * Auth-Vorbedingung: caller muss bestaetigt haben, dass userId der eigene
   * User ist (oder ein Admin der die Daten anders schuetzt).
   * Wirft NOT_FOUND wenn kein issued cert existiert, oder die Daten fehlen.
   */
  async renderForUserCourse(userId: string, courseId: string): Promise<Buffer> {
    const [cert] = await db
      .select()
      .from(courseCertificates)
      .where(and(
        eq(courseCertificates.userId, userId),
        eq(courseCertificates.courseId, courseId),
      ))
      .limit(1)

    if (!cert || cert.status !== 'issued' || !cert.issuedAt) {
      throw new CertificatePdfError('NOT_FOUND', 'Kein ausgestelltes Zertifikat fuer diese Kombination')
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1)
    const [org] = await db.select().from(organization).limit(1)

    if (!user || !course) {
      throw new CertificatePdfError('NOT_FOUND', 'User oder Kurs nicht gefunden')
    }

    const recipientName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
      || user.email

    const element = createElement(CertificatePDF, {
      organizationName: org?.name ?? 'xKMU',
      recipientName,
      courseTitle: course.title,
      issuedAt: cert.issuedAt,
      identifier: cert.identifier,
    })

    // renderToBuffer akzeptiert ein DocumentElement; CertificatePDF gibt ein
    // Document zurueck, das passt typedef-technisch nicht 1:1 — daher cast.
    return renderToBuffer(element as Parameters<typeof renderToBuffer>[0])
  },
}
