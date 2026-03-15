import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiError,
  apiServerError,
} from '@/lib/utils/api-response'
import { IdeaService } from '@/lib/services/idea.service'
import { CompanyService } from '@/lib/services/company.service'
import { LeadService } from '@/lib/services/lead.service'
import { ActivityService } from '@/lib/services/activity.service'
import { AIService } from '@/lib/services/ai/ai.service'
import { WebhookService } from '@/lib/services/webhook.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'
import { logger } from '@/lib/utils/logger'

async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    return {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      role: session.user.role,
    }
  }
  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) {
      return { tenantId: payload.tenantId, userId: null, role: 'api' as const }
    }
  }
  return null
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  try {
    const { id } = await params
    const idea = await IdeaService.getById(auth.tenantId, id)
    if (!idea) return apiNotFound('Idee nicht gefunden')

    if (idea.status === 'converted') {
      return apiError('ALREADY_CONVERTED', 'Diese Idee wurde bereits konvertiert', 400)
    }

    // Entitaeten aus dem Rohtext extrahieren
    let entities: { companies?: string[]; people?: string[]; emails?: string[] } = {}
    try {
      entities = await AIService.extractEntities(idea.rawContent, {
        tenantId: auth.tenantId,
        userId: auth.userId,
        feature: 'idea_conversion',
      })
    } catch {
      // Fallback: Keine Entitaeten extrahiert
    }

    const createdEntities: {
      companyId?: string
      companyName?: string
      leadId?: string
    } = {}

    // KI-Daten aus der Idee extrahieren
    const structured = (idea.structuredContent || {}) as Record<string, unknown>
    const aiSummary = (structured.summary as string) || ''
    const aiTags = (idea.tags || []) as string[]

    // Firma erstellen wenn erkannt – mit KI-Daten anreichern
    const companyNames = entities.companies || []
    if (companyNames.length > 0) {
      const companyNotes = aiSummary
        ? `[Aus Idee konvertiert]\n\n${aiSummary}\n\nOriginal-Idee:\n${idea.rawContent}`
        : `[Aus Idee konvertiert]\n\n${idea.rawContent}`

      const company = await CompanyService.create(
        auth.tenantId,
        {
          name: companyNames[0],
          status: 'prospect',
          notes: companyNotes,
          tags: aiTags.length > 0 ? aiTags : undefined,
        },
        auth.userId || undefined
      )
      createdEntities.companyId = company.id
      createdEntities.companyName = company.name
    }

    // Lead-Titel aus Tags generieren (z.B. "Igel - Honig - Weltall")
    const leadTitle = aiTags.length > 0
      ? aiTags.join(' - ')
      : idea.rawContent.substring(0, 100)

    // Lead erstellen – mit title, notes, tags und vollstaendigem Idee-Kontext
    const lead = await LeadService.create(auth.tenantId, {
      source: 'idea',
      title: leadTitle,
      sourceDetail: aiSummary
        ? aiSummary.substring(0, 250)
        : ('Konvertiert aus Idee: ' + idea.rawContent.substring(0, 200)),
      companyId: createdEntities.companyId || undefined,
      status: 'new',
      tags: aiTags,
      notes: aiSummary || idea.rawContent,
      rawData: {
        ideaId: id,
        ideaRawContent: idea.rawContent,
        ideaSummary: aiSummary || null,
        ideaTags: aiTags,
        ideaType: idea.type,
        ideaCreatedAt: idea.createdAt,
        extractedEntities: entities,
      },
    })
    createdEntities.leadId = lead.id

    // Aktivitaet erstellen – Konvertierungs-Historie
    const activityContent = aiSummary
      ? `Idee konvertiert zu Lead.\n\nKI-Zusammenfassung:\n${aiSummary}\n\nOriginal:\n${idea.rawContent}`
      : `Idee konvertiert zu Lead.\n\nOriginal:\n${idea.rawContent}`

    await ActivityService.create(
      auth.tenantId,
      {
        leadId: lead.id,
        companyId: createdEntities.companyId || null,
        type: 'note',
        subject: 'Idee konvertiert',
        content: activityContent,
        metadata: {
          source: 'idea_conversion',
          ideaId: id,
          aiTags,
        },
      },
      auth.userId
    )

    // Idee-Status aktualisieren
    await IdeaService.update(auth.tenantId, id, {
      status: 'converted',
      structuredContent: {
        ...structured,
        convertedTo: createdEntities,
        convertedAt: new Date().toISOString(),
      },
    })

    // Webhooks feuern
    WebhookService.fire(auth.tenantId, 'idea.converted', {
      ideaId: id,
      leadId: createdEntities.leadId,
      companyId: createdEntities.companyId,
    }).catch(() => {})

    if (createdEntities.companyId) {
      WebhookService.fire(auth.tenantId, 'company.created', {
        companyId: createdEntities.companyId,
        companyName: createdEntities.companyName,
        source: 'idea_conversion',
      }).catch(() => {})
    }

    return apiSuccess({
      message: 'Idee erfolgreich konvertiert',
      ...createdEntities,
    })
  } catch (error) {
    logger.error('Error converting idea', error, { module: 'IdeasConvertAPI' })
    return apiServerError()
  }
}
