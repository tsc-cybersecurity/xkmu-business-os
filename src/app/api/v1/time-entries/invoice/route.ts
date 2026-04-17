import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { TimeEntryService } from '@/lib/services/time-entry.service'
import { DocumentService } from '@/lib/services/document.service'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { timeEntries } from '@/lib/db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'
// POST /api/v1/time-entries/invoice - Rechnung aus Zeiterfassung erstellen
export async function POST(request: NextRequest) {
  return withPermission(request, 'documents', 'create', async (auth) => {
    try {
      const body = await request.json()
      const { companyId, from, to, hourlyRate } = body as {
        companyId: string
        from?: string
        to?: string
        hourlyRate?: number
      }

      if (!companyId) return apiError('MISSING_COMPANY', 'Firma muss angegeben werden', 400)

      // Get time entries for company in date range
      const conditions = [,
        eq(timeEntries.companyId, companyId),
      ]
      if (from) conditions.push(gte(timeEntries.date, new Date(from)))
      if (to) conditions.push(lte(timeEntries.date, new Date(to)))

      const entries = await db
        .select()
        .from(timeEntries)
        .where(and(...conditions))

      const billableEntries = entries.filter(e => e.billable && (e.durationMinutes ?? 0) > 0)
      if (billableEntries.length === 0) {
        return apiError('NO_ENTRIES', 'Keine abrechenbaren Zeiteintraege gefunden', 400)
      }

      // Create invoice
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 14)

      const invoice = await DocumentService.create({
        type: 'invoice',
        companyId,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        paymentTerms: 'Zahlbar innerhalb von 14 Tagen',
      }, auth.userId ?? undefined)

      // Add line items from time entries
      let totalMinutes = 0
      for (const entry of billableEntries) {
        const rate = hourlyRate || (entry.hourlyRate ? parseFloat(entry.hourlyRate) : 100)
        const hours = (entry.durationMinutes || 0) / 60
        totalMinutes += entry.durationMinutes || 0

        await DocumentService.addItem(invoice.id, {
          name: entry.description || 'Dienstleistung',
          description: `${new Date(entry.date).toLocaleDateString('de-DE')} — ${Math.round(hours * 100) / 100} Std.`,
          quantity: Math.round(hours * 100) / 100,
          unit: 'Std.',
          unitPrice: rate,
          vatRate: 19,
        })
      }

      return apiSuccess({
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        entriesCount: billableEntries.length,
        totalMinutes,
        totalHours: Math.round(totalMinutes / 60 * 100) / 100,
      }, undefined, 201)
    } catch (error) {
      return apiServerError()
    }
  })
}
