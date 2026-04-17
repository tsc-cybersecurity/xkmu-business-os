// ============================================
// Dunning Handler (Mahnwesen)
// 3-Stufen: Erinnerung (7d), Mahnung (14d), Letzte Mahnung (21d)
// ============================================

import { db } from '@/lib/db'
import { documents, activities } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { EmailService } from '@/lib/services/email.service'
import { TaskQueueService } from '@/lib/services/task-queue.service'
import { logger } from '@/lib/utils/logger'

interface DunningPayload {
  documentId: string
  level: number // 1, 2, 3
  to: string
  customerName: string
}

export async function handleDunning(
  payload: DunningPayload
): Promise<{ sent: boolean; level: number; nextLevel?: number }> {
  const { documentId, level, to, customerName } = payload

  // Load document
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId)))
    .limit(1)

  if (!doc) {
    logger.warn(`Dunning: Document ${documentId} not found`, { module: 'DunningHandler' })
    return { sent: false, level }
  }

  // Skip if already paid
  if (doc.paymentStatus === 'paid') {
    logger.info(`Dunning: Document ${documentId} already paid, skipping`, { module: 'DunningHandler' })
    return { sent: false, level }
  }

  // Template based on level
  const templateMap: Record<number, string> = {
    1: 'reminder_7d',
    2: 'dunning_14d',
    3: 'dunning_21d',
  }

  const templateSlug = templateMap[level] || 'reminder_7d'

  // Send email
  const result = await EmailService.sendWithTemplate(
    templateSlug,
    to,
    {
      name: customerName,
      rechnungNr: doc.number || '',
      betrag: doc.total ? `${Number(doc.total).toFixed(2)} EUR` : '',
      faelligAm: doc.dueDate ? new Date(doc.dueDate).toLocaleDateString('de-DE') : '',
      absender: '',
      telefon: '',
    },
    { companyId: doc.companyId || undefined })

  if (!result.success) {
    throw new Error(result.error || 'E-Mail-Versand fehlgeschlagen')
  }

  // Update dunning level
  await db
    .update(documents)
    .set({
      dunningLevel: level,
      paymentStatus: 'overdue',
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId))

  // Level 3: Create activity "Telefonisch nachfassen"
  if (level === 3 && doc.companyId) {
    await db.insert(activities).values({
      companyId: doc.companyId,
      type: 'task',
      subject: `Telefonisch nachfassen: Rechnung ${doc.number}`,
      content: `Letzte Mahnung versendet. Bitte telefonisch Kontakt aufnehmen bezueglich offener Rechnung ${doc.number} ueber ${doc.total ? Number(doc.total).toFixed(2) : '?'} EUR.`,
    })
  }

  // Schedule next level if not yet at max
  if (level < 3) {
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + 7) // 7 Tage bis naechste Stufe

    await TaskQueueService.create({
      type: 'dunning',
      priority: 1,
      payload: {
        documentId,
        level: level + 1,
        to,
        customerName,
      },
      scheduledFor: nextDate,
      referenceType: 'document',
      referenceId: documentId,
    })
  }

  logger.info(`Dunning level ${level} sent for document ${documentId}`, { module: 'DunningHandler' })

  return {
    sent: true,
    level,
    nextLevel: level < 3 ? level + 1 : undefined,
  }
}
