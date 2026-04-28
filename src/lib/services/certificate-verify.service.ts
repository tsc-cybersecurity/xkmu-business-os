/**
 * Sub-3d T4: Public-Verify fuer Zertifikate.
 * Liefert die fuer die oeffentliche Verifikations-Page noetigen Daten —
 * nur fuer Status 'issued' oder 'revoked' (privates Status raw nicht leakt).
 */
import { db } from '@/lib/db'
import { courseCertificates, courses, users, organization } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export interface PublicVerifyResult {
  status: 'issued' | 'revoked'
  identifier: string
  issuedAt: Date | null
  revokedAt: Date | null
  recipientName: string
  courseTitle: string
  organizationName: string
  reviewComment: string | null
}

export const CertificateVerifyService = {
  async verifyByIdentifier(identifier: string): Promise<PublicVerifyResult | null> {
    const [cert] = await db
      .select()
      .from(courseCertificates)
      .where(eq(courseCertificates.identifier, identifier))
      .limit(1)

    if (!cert) return null
    if (cert.status !== 'issued' && cert.status !== 'revoked') return null

    const [user] = await db.select().from(users).where(eq(users.id, cert.userId)).limit(1)
    const [course] = await db.select().from(courses).where(eq(courses.id, cert.courseId)).limit(1)
    const [org] = await db.select().from(organization).limit(1)

    if (!user || !course) return null

    const recipientName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
      || user.email

    return {
      status: cert.status,
      identifier: cert.identifier,
      issuedAt: cert.issuedAt,
      revokedAt: cert.status === 'revoked' ? cert.reviewedAt : null,
      recipientName,
      courseTitle: course.title,
      organizationName: org?.name ?? 'xKMU',
      reviewComment: cert.status === 'revoked' ? cert.reviewComment : null,
    }
  },
}
