import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiError, apiServerError } from '@/lib/utils/api-response'
import { EmailService } from '@/lib/services/email.service'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
type Params = Promise<{ id: string }>

// POST /api/v1/documents/[id]/send - Dokument per E-Mail versenden
export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'documents', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const { to, cc, subject, message } = body as {
        to: string
        cc?: string
        subject?: string
        message?: string
      }

      if (!to) return apiError('MISSING_TO', 'Empfaenger-E-Mail fehlt', 400)

      // Load document
      const [doc] = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, id)))
        .limit(1)

      if (!doc) return apiNotFound('Dokument nicht gefunden')

      const docType = doc.type === 'offer' ? 'Angebot' : 'Rechnung'
      const emailSubject = subject || `${docType} ${doc.number || ''} von ${doc.customerName || ''}`

      const result = await EmailService.sendWithTemplate(doc.type === 'offer' ? 'offer_send' : 'reminder_7d',
        to,
        {
          name: doc.customerName || 'Kunde',
          angebotNr: doc.number || '',
          rechnungNr: doc.number || '',
          betrag: doc.total ? `${Number(doc.total).toFixed(2)} EUR` : '',
          gueltigBis: doc.validUntil ? new Date(doc.validUntil).toLocaleDateString('de-DE') : '',
          faelligAm: doc.dueDate ? new Date(doc.dueDate).toLocaleDateString('de-DE') : '',
          firma: doc.customerName || '',
          absender: '',
        },
        {
          cc,
          companyId: doc.companyId || undefined,
        },
        auth.userId ?? undefined
      )

      if (!result.success) {
        return apiError('SEND_FAILED', result.error || 'E-Mail-Versand fehlgeschlagen', 500)
      }

      return apiSuccess({ sent: true, messageId: result.messageId, to })
    } catch {
      return apiServerError()
    }
  })
}
