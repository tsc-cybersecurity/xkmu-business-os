/**
 * Sub-3c: PDF-Generation fuer ausgestellte Zertifikate.
 * Rendert die CertificatePDF-Komponente serverseitig zu einem Buffer.
 */
import { db } from '@/lib/db'
import { courseCertificates, courses, users, organization } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { renderToBuffer } from '@react-pdf/renderer'
import { CertificatePDF } from '@/components/elearning/CertificatePDF'
import { CmsDesignService } from './cms-design.service'
import { logger } from '@/lib/utils/logger'
import { createElement } from 'react'

export class CertificatePdfError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

/**
 * Laed Logo-URL und liefert Data-URL fuer @react-pdf/renderer Image-Element.
 * Bei Fehler (404, Timeout, kein gueltiger Bild-MIME): null — PDF wird ohne
 * Logo gerendert. Logo ist nice-to-have, nicht kritisch.
 */
async function fetchLogoAsDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? ''
    if (!/^image\//i.test(contentType)) return null
    const buf = Buffer.from(await res.arrayBuffer())
    return `data:${contentType};base64,${buf.toString('base64')}`
  } catch (err) {
    logger.warn('Certificate logo fetch failed — rendering without logo', {
      module: 'CertificatePdfService',
      error: String(err),
    })
    return null
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

    const branding = await CmsDesignService.getBranding()
    const logoSrc = await fetchLogoAsDataUrl(branding.logoUrl)

    const element = createElement(CertificatePDF, {
      organizationName: org?.name ?? 'xKMU',
      recipientName,
      courseTitle: course.title,
      issuedAt: cert.issuedAt,
      identifier: cert.identifier,
      brandColor: branding.brandColor,
      logoSrc,
    })

    // renderToBuffer akzeptiert ein DocumentElement; CertificatePDF gibt ein
    // Document zurueck, das passt typedef-technisch nicht 1:1 — daher cast.
    return renderToBuffer(element as Parameters<typeof renderToBuffer>[0])
  },
}
