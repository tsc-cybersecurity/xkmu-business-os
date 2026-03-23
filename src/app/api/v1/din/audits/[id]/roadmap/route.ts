import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { AIService } from '@/lib/services/ai/ai.service'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { dinAuditSessions, dinAnswers, dinRequirements } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

type Params = Promise<{ id: string }>

// POST /api/v1/din/audits/[id]/roadmap - KI-Security-Roadmap aus Audit-Ergebnissen
export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'din_audits', 'read', async (auth) => {
    try {
      const { id } = await params

      const [session] = await db.select().from(dinAuditSessions)
        .where(and(eq(dinAuditSessions.tenantId, auth.tenantId), eq(dinAuditSessions.id, id))).limit(1)
      if (!session) return apiNotFound('Audit nicht gefunden')

      // Get all not-fulfilled answers
      const answers = await db.select({
        status: dinAnswers.status,
        justification: dinAnswers.justification,
        reqNumber: dinRequirements.number,
        reqText: dinRequirements.questionText,
        reqPoints: dinRequirements.points,
      })
        .from(dinAnswers)
        .innerJoin(dinRequirements, eq(dinAnswers.requirementId, dinRequirements.id))
        .where(and(eq(dinAnswers.sessionId, id), eq(dinAnswers.status, 'not_fulfilled')))

      if (answers.length === 0) {
        return apiSuccess({ roadmap: 'Alle Anforderungen erfuellt — keine Massnahmen noetig.', notFulfilled: 0 })
      }

      const context = answers.map(a =>
        `- ${a.reqNumber}: ${a.reqText} (${a.reqPoints} Punkte)${a.justification ? ` — ${a.justification}` : ''}`
      ).join('\n')

      const response = await AIService.completeWithContext(
        `Erstelle eine priorisierte Security-Roadmap basierend auf diesen nicht-erfuellten DIN SPEC 27076 Anforderungen:

${context}

Struktur:
1. Kurzfristig (0-3 Monate): Kritische Massnahmen
2. Mittelfristig (3-6 Monate): Wichtige Massnahmen
3. Langfristig (6-12 Monate): Ergaenzende Massnahmen
4. Budget-Schaetzung pro Phase

Fuer jede Massnahme: Konkreter Handlungsschritt, Verantwortlicher, geschaetzter Aufwand.`,
        { tenantId: auth.tenantId, feature: 'security_roadmap' },
        { maxTokens: 3000, temperature: 0.3, systemPrompt: 'Du bist ein IT-Sicherheitsberater. Erstelle konkrete, umsetzbare Massnahmen-Roadmaps auf Deutsch.' },
      )

      return apiSuccess({
        roadmap: response.text,
        notFulfilled: answers.length,
        sessionId: id,
      })
    } catch {
      return apiServerError()
    }
  })
}
