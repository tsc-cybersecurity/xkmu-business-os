import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { PortalDocumentService } from '@/lib/services/portal-document.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { TaskQueueService } from '@/lib/services/task-queue.service'
import { CompanyService } from '@/lib/services/company.service'
import { OrganizationService } from '@/lib/services/organization.service'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

const ALLOWED_LINKED_TYPES = ['contract', 'project', 'order'] as const

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'documents', 'read', async () => {
    const { id: companyId } = await params
    try {
      const url = new URL(request.url)
      const directionParam = url.searchParams.get('direction') || undefined
      const linkedType = url.searchParams.get('linkedType') || undefined
      const linkedId = url.searchParams.get('linkedId') || undefined
      const includeDeleted = url.searchParams.get('includeDeleted') === 'true'

      if (directionParam && !['admin_to_portal', 'portal_to_admin'].includes(directionParam)) {
        return apiError('VALIDATION_ERROR', 'Ungültige direction', 400)
      }
      if (linkedType && !ALLOWED_LINKED_TYPES.includes(linkedType as any)) {
        return apiError('VALIDATION_ERROR', 'Ungültiger linkedType', 400)
      }

      const rows = await PortalDocumentService.list({
        companyId,
        direction: directionParam as any,
        linkedType: linkedType as any,
        linkedId: linkedId || undefined,
        includeDeleted,
      })
      return apiSuccess(rows)
    } catch (error) {
      logger.error('admin list portal documents failed', error, { module: 'AdminPortalDocsAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler', 500)
    }
  })
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'documents', 'create', async (auth) => {
    const { id: companyId } = await params
    try {
      const company = await CompanyService.getById(companyId)
      if (!company) return apiError('NOT_FOUND', 'Firma nicht gefunden', 404)

      const formData = await request.formData()
      const file = formData.get('file')
      const categoryId = formData.get('categoryId')?.toString()
      const note = formData.get('note')?.toString() || undefined
      const linkedType = formData.get('linkedType')?.toString() || undefined
      const linkedId = formData.get('linkedId')?.toString() || undefined

      if (!(file instanceof File)) return apiError('VALIDATION_ERROR', 'Keine Datei übermittelt', 400)
      if (!categoryId) return apiError('VALIDATION_ERROR', 'categoryId fehlt', 400)

      const doc = await PortalDocumentService.upload({
        companyId,
        categoryId,
        direction: 'admin_to_portal',
        uploaderUserId: auth.userId!,
        uploaderRole: 'admin',
        file,
        note,
        linkedType: linkedType as any,
        linkedId,
      })

      await AuditLogService.log({
        userId: auth.userId,
        userRole: auth.role,
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
        const portalUsers = await db.select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(and(eq(users.role, 'portal_user'), eq(users.companyId, companyId), eq(users.status, 'active')))
        const org = await OrganizationService.getById()
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const portalUrl = `${baseUrl}/portal/documents`
        for (const u of portalUsers) {
          await TaskQueueService.create({
            type: 'email',
            priority: 2,
            payload: {
              templateSlug: 'portal_document_shared',
              to: u.email,
              placeholders: {
                name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
                firma: company.name,
                fileName: doc.fileName,
                portalUrl,
                absender: org?.name || 'Ihr Team',
              },
            },
            referenceType: 'portal_document',
            referenceId: doc.id,
          })
        }
      } catch (err) {
        logger.error('Admin-doc email queue failed (upload proceeds)', err, { module: 'AdminPortalDocsAPI' })
      }

      return apiSuccess(doc, undefined, 201)
    } catch (error) {
      logger.error('admin upload portal document failed', error, { module: 'AdminPortalDocsAPI' })
      const msg = error instanceof Error ? error.message : 'Upload fehlgeschlagen'
      const status = /groß/i.test(msg) ? 413 : /MIME|Dateityp/i.test(msg) ? 415 : 400
      return apiError(status === 413 ? 'FILE_TOO_LARGE' : status === 415 ? 'UNSUPPORTED_MEDIA_TYPE' : 'UPLOAD_FAILED', msg, status)
    }
  })
}
