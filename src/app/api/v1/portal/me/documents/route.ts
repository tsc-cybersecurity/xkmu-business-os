import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { rateLimit } from '@/lib/utils/rate-limit'
import { PortalDocumentService } from '@/lib/services/portal-document.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { TaskQueueService } from '@/lib/services/task-queue.service'
import { CompanyService } from '@/lib/services/company.service'
import { OrganizationService } from '@/lib/services/organization.service'
import { CmsDesignService } from '@/lib/services/cms-design.service'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { and, eq, ne } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

const ALLOWED_LINKED_TYPES = ['contract', 'project', 'order'] as const

export async function GET(request: NextRequest) {
  return withPortalAuth(request, async (auth) => {
    try {
      const url = new URL(request.url)
      const directionParam = url.searchParams.get('direction') || undefined
      const linkedType = url.searchParams.get('linkedType') || undefined
      const linkedId = url.searchParams.get('linkedId') || undefined

      if (directionParam && !['admin_to_portal', 'portal_to_admin'].includes(directionParam)) {
        return apiError('VALIDATION_ERROR', 'Ungültige direction', 400)
      }
      if (linkedType && !ALLOWED_LINKED_TYPES.includes(linkedType as any)) {
        return apiError('VALIDATION_ERROR', 'Ungültiger linkedType', 400)
      }

      const rows = await PortalDocumentService.list({
        companyId: auth.companyId,
        direction: directionParam as any,
        linkedType: linkedType as any,
        linkedId: linkedId || undefined,
        includeDeleted: false,
      })

      return apiSuccess(rows.map(r => ({
        id: r.id,
        fileName: r.fileName,
        mimeType: r.mimeType,
        sizeBytes: r.sizeBytes,
        direction: r.direction,
        categoryId: r.categoryId,
        linkedType: r.linkedType,
        linkedId: r.linkedId,
        uploadedByUserId: r.uploadedByUserId,
        uploaderRole: r.uploaderRole,
        note: r.note,
        createdAt: r.createdAt,
      })))
    } catch (error) {
      logger.error('list portal documents failed', error, { module: 'PortalDocumentsAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler', 500)
    }
  })
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'portal-docs-upload', 20, 3600_000)
  if (limited) return limited

  return withPortalAuth(request, async (auth) => {
    try {
      const formData = await request.formData()
      const file = formData.get('file')
      const categoryId = formData.get('categoryId')?.toString()
      const note = formData.get('note')?.toString() || undefined
      const linkedType = formData.get('linkedType')?.toString() || undefined
      const linkedId = formData.get('linkedId')?.toString() || undefined

      if (!(file instanceof File)) return apiError('VALIDATION_ERROR', 'Keine Datei übermittelt', 400)
      if (!categoryId) return apiError('VALIDATION_ERROR', 'categoryId fehlt', 400)
      if (linkedType && !ALLOWED_LINKED_TYPES.includes(linkedType as any)) {
        return apiError('VALIDATION_ERROR', 'Ungültiger linkedType', 400)
      }

      const doc = await PortalDocumentService.upload({
        companyId: auth.companyId,
        categoryId,
        direction: 'portal_to_admin',
        uploaderUserId: auth.userId,
        uploaderRole: 'portal_user',
        file,
        note,
        linkedType: linkedType as any,
        linkedId,
      })

      await AuditLogService.log({
        userId: auth.userId,
        userRole: 'portal_user',
        action: 'portal_document.uploaded',
        entityType: 'portal_document',
        entityId: doc.id,
        payload: {
          fileName: doc.fileName, sizeBytes: doc.sizeBytes, direction: doc.direction,
          categoryId: doc.categoryId, linkedType: doc.linkedType, linkedId: doc.linkedId,
        },
        request,
      })

      try {
        const internals = await db.select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(and(ne(users.role, 'portal_user'), eq(users.status, 'active')))
        const company = await CompanyService.getById(auth.companyId)
        const org = await OrganizationService.getById()
        const baseUrl = await CmsDesignService.getAppUrl()
        const adminUrl = `${baseUrl}/intern/contacts/companies/${auth.companyId}?tab=documents`
        for (const u of internals) {
          await TaskQueueService.create({
            type: 'email',
            priority: 2,
            payload: {
              templateSlug: 'portal_document_received',
              to: u.email,
              placeholders: {
                empfaenger: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
                firma: company?.name ?? 'Firma',
                fileName: doc.fileName,
                adminUrl,
                absender: org?.name || 'System',
              },
            },
            referenceType: 'portal_document',
            referenceId: doc.id,
          })
        }
      } catch (err) {
        logger.error('Portal-doc email queue failed (upload proceeds)', err, { module: 'PortalDocumentsAPI' })
      }

      return apiSuccess({
        id: doc.id, fileName: doc.fileName, sizeBytes: doc.sizeBytes, direction: doc.direction,
      }, undefined, 201)
    } catch (error) {
      logger.error('upload portal document failed', error, { module: 'PortalDocumentsAPI' })
      const msg = error instanceof Error ? error.message : 'Upload fehlgeschlagen'
      const status = /groß/i.test(msg) ? 413 : /MIME|Dateityp/i.test(msg) ? 415 : 400
      return apiError(status === 413 ? 'FILE_TOO_LARGE' : status === 415 ? 'UNSUPPORTED_MEDIA_TYPE' : 'UPLOAD_FAILED', msg, status)
    }
  })
}
