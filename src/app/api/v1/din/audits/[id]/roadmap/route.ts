import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { AIService } from '@/lib/services/ai/ai.service'
import { AiPromptTemplateService } from '@/lib/services/ai-prompt-template.service'
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

      const template = await AiPromptTemplateService.getOrDefault(auth.tenantId, 'security_roadmap')
      const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, { requirements: context })

      const response = await AIService.completeWithContext(userPrompt,
        { tenantId: auth.tenantId, feature: 'security_roadmap' },
        { maxTokens: 3000, temperature: 0.3, systemPrompt: template.systemPrompt },
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
