/**
 * Workflow Action Registry
 *
 * Each action is a named function that receives context + config
 * and returns a result. Actions are composable building blocks
 * for workflows.
 */

import { db } from '@/lib/db'
import { leads, companies, persons, activities } from '@/lib/db/schema'
import { eq, and, ilike } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

export interface ActionContext {
  triggerData: Record<string, unknown>
  stepResults: Record<string, unknown> // results from previous steps, keyed by action name
}

export interface ActionResult {
  success: boolean
  data?: Record<string, unknown>
  error?: string
}

export type ActionFn = (ctx: ActionContext, config: Record<string, unknown>) => Promise<ActionResult>

// ─── Action Definitions ────────────────────────────────────────────────────────

export interface ActionDefinition {
  name: string
  label: string
  description: string
  category: 'data' | 'ai' | 'communication' | 'logic'
  icon: string
  configFields?: Array<{ key: string; label: string; type: 'string' | 'number' | 'boolean' | 'select' | 'json' | 'custom_prompt'; options?: string[] }>
  execute: ActionFn
}

const NO_COMPANY_NAME = '– ohne Firma –'

function resolveTemplate(input: unknown, ctx: ActionContext): unknown {
  if (typeof input === 'string') {
    return input.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, path: string) => {
      const parts = path.trim().split('.')
      let cur: unknown
      if (parts[0] === 'data') cur = ctx.triggerData
      else if (parts[0] === 'steps') cur = ctx.stepResults
      else return ''
      for (let i = 1; i < parts.length; i++) {
        if (cur == null || typeof cur !== 'object') return ''
        cur = (cur as Record<string, unknown>)[parts[i]]
      }
      return cur == null ? '' : String(cur)
    })
  }
  if (Array.isArray(input)) return input.map(item => resolveTemplate(item, ctx))
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(input)) out[k] = resolveTemplate(v, ctx)
    return out
  }
  return input
}

function safeParseJson(text: string): unknown {
  try { return JSON.parse(text) } catch { return null }
}

const ACTIONS: Record<string, ActionDefinition> = {
  find_or_create_company: {
    name: 'find_or_create_company',
    label: 'Firma suchen/erstellen',
    description: 'Sucht eine Firma per Name oder erstellt eine neue',
    category: 'data',
    icon: 'Building',
    configFields: [
      { key: 'fallbackName', label: 'Fallback-Name (ohne Firma)', type: 'string' },
    ],
    execute: async (ctx, config) => {
      const companyName = (ctx.triggerData.company as string)?.trim()
      const fallback = (config.fallbackName as string) || NO_COMPANY_NAME

      if (!companyName) {
        const [existing] = await db.select({ id: companies.id }).from(companies)
          .where(and(eq(companies.name, fallback))).limit(1)
        if (existing) return { success: true, data: { companyId: existing.id, created: false } }
        const [created] = await db.insert(companies)
          .values({ name: fallback, status: 'active', country: 'DE' })
          .returning({ id: companies.id })
        return { success: true, data: { companyId: created.id, created: true } }
      }

      const [existing] = await db.select({ id: companies.id }).from(companies)
        .where(and(ilike(companies.name, companyName))).limit(1)
      if (existing) return { success: true, data: { companyId: existing.id, created: false } }

      const [created] = await db.insert(companies)
        .values({ name: companyName, status: 'active', country: 'DE' })
        .returning({ id: companies.id })
      return { success: true, data: { companyId: created.id, created: true } }
    },
  },

  find_or_create_person: {
    name: 'find_or_create_person',
    label: 'Person suchen/erstellen',
    description: 'Sucht eine Person per E-Mail oder erstellt eine neue',
    category: 'data',
    icon: 'User',
    execute: async (ctx) => {
      const { triggerData, stepResults } = ctx
      const email = (triggerData.email as string)?.trim()
      const companyId = (stepResults.find_or_create_company as Record<string, unknown>)?.companyId as string | undefined

      if (!email) return { success: false, error: 'Keine E-Mail angegeben' }

      const [existing] = await db.select({ id: persons.id }).from(persons)
        .where(and(ilike(persons.email, email))).limit(1)

      if (existing) {
        if (companyId) {
          await db.update(persons).set({ companyId, updatedAt: new Date() }).where(eq(persons.id, existing.id))
        }
        return { success: true, data: { personId: existing.id, created: false } }
      }

      const [created] = await db.insert(persons).values({
        companyId: companyId || null,
        firstName: (triggerData.firstName as string) || '',
        lastName: (triggerData.lastName as string) || '',
        email,
        phone: (triggerData.phone as string) || null,
        status: 'active',
      }).returning({ id: persons.id })

      return { success: true, data: { personId: created.id, created: true } }
    },
  },

  link_lead: {
    name: 'link_lead',
    label: 'Lead verknüpfen',
    description: 'Verknüpft den Lead mit Firma und Person',
    category: 'data',
    icon: 'Link',
    execute: async (ctx) => {
      const { triggerData, stepResults } = ctx
      const leadId = triggerData.leadId as string
      const companyId = (stepResults.find_or_create_company as Record<string, unknown>)?.companyId as string | undefined
      const personId = (stepResults.find_or_create_person as Record<string, unknown>)?.personId as string | undefined

      if (!leadId) return { success: false, error: 'Keine leadId' }

      await db.update(leads).set({
        companyId: companyId || undefined,
        personId: personId || undefined,
        updatedAt: new Date(),
      }).where(eq(leads.id, leadId))

      return { success: true, data: { companyId, personId } }
    },
  },

  ai_research_company: {
    name: 'ai_research_company',
    label: 'KI-Firmenrecherche',
    description: 'Recherchiert die Firma per KI (Website, Branche, Größe)',
    category: 'ai',
    icon: 'Bot',
    execute: async (ctx) => {
      const { triggerData, stepResults } = ctx
      const companyId = (stepResults.find_or_create_company as Record<string, unknown>)?.companyId as string | undefined
      const companyName = (triggerData.company as string)?.trim()
      if (!companyId || !companyName) return { success: true, data: { skipped: true, reason: 'Keine Firma' } }

      try {
        const { TaskQueueService } = await import('@/lib/services/task-queue.service')
        await TaskQueueService.create({
          type: 'ai',
          priority: 2,
          payload: {
            action: 'company_research',
            companyId,
            companyName,
            prompt: `Recherchiere die Firma "${companyName}". Finde: Website, Branche, ungefähre Mitarbeiterzahl, Standort, und eine kurze Beschreibung. Antworte auf Deutsch in JSON: {"website":"","branche":"","mitarbeiter":"","standort":"","beschreibung":""}`,
          },
          referenceType: 'company',
          referenceId: companyId,
        })
        return { success: true, data: { queued: true } }
      } catch (err) {
        return { success: false, error: `Queue failed: ${err instanceof Error ? err.message : String(err)}` }
      }
    },
  },

  score_lead: {
    name: 'score_lead',
    label: 'Lead bewerten',
    description: 'Bewertet den Lead basierend auf Kontaktdaten und Interessen (0-100)',
    category: 'logic',
    icon: 'BarChart3',
    configFields: [
      { key: 'highValueInterests', label: 'High-Value Interessen (JSON Array)', type: 'json' },
    ],
    execute: async (ctx, config) => {
      const { triggerData } = ctx
      const leadId = triggerData.leadId as string
      if (!leadId) return { success: false, error: 'Keine leadId' }

      const highValue = (config.highValueInterests as string[]) || [
        'Security Quick Check', 'Hardening & Baselines', 'Incident Response',
        'NIS-2 Unterstützung', 'Datenschutz & Compliance', 'Kombinations-Modul',
      ]
      const interests = (triggerData.interests as string[]) || []
      const message = (triggerData.message as string) || ''

      let score = 20
      if (triggerData.email) score += 15
      if (triggerData.phone) score += 10
      if (triggerData.company) score += 15
      for (const i of interests) {
        score += highValue.includes(i) ? 10 : 5
      }
      if (message.length > 200) score += 10
      else if (message.length > 50) score += 5
      score = Math.min(100, Math.max(0, score))

      await db.update(leads).set({ score, updatedAt: new Date() }).where(eq(leads.id, leadId))
      return { success: true, data: { score } }
    },
  },

  log_activity: {
    name: 'log_activity',
    label: 'Aktivität loggen',
    description: 'Erstellt einen Aktivitätseintrag',
    category: 'data',
    icon: 'FileText',
    configFields: [
      { key: 'subject', label: 'Betreff', type: 'string' },
    ],
    execute: async (ctx, config) => {
      const { triggerData, stepResults } = ctx
      const leadId = triggerData.leadId as string
      const companyId = (stepResults.find_or_create_company as Record<string, unknown>)?.companyId as string | undefined
      const personId = (stepResults.find_or_create_person as Record<string, unknown>)?.personId as string | undefined
      const interests = (triggerData.interests as string[]) || []
      const message = (triggerData.message as string) || ''

      await db.insert(activities).values({
        leadId: leadId || undefined,
        companyId: companyId || undefined,
        personId: personId || undefined,
        type: 'note',
        subject: (config.subject as string) || 'Kontaktformular ausgefüllt',
        content: [
          interests.length > 0 ? `**Interessen:** ${interests.join(', ')}` : null,
          message ? `**Nachricht:** ${message}` : null,
          triggerData.company ? `**Firma:** ${triggerData.company}` : null,
        ].filter(Boolean).join('\n\n'),
        metadata: { source: 'workflow', interests },
      })
      return { success: true }
    },
  },

  send_email: {
    name: 'send_email',
    label: 'E-Mail senden',
    description: 'Sendet eine E-Mail über die Task-Queue',
    category: 'communication',
    icon: 'Mail',
    configFields: [
      { key: 'template', label: 'Template-Slug', type: 'string' },
      { key: 'to', label: 'Empfänger (leer = Kontakt-E-Mail)', type: 'string' },
    ],
    execute: async (ctx, config) => {
      const { triggerData } = ctx
      const to = (config.to as string) || (triggerData.email as string)
      const template = (config.template as string) || 'lead_first_response'
      if (!to) return { success: false, error: 'Kein Empfänger' }

      try {
        const { TaskQueueService } = await import('@/lib/services/task-queue.service')
        await TaskQueueService.create({
          type: 'email', priority: 1,
          payload: {
            templateSlug: template, to,
            placeholders: {
              name: [triggerData.firstName, triggerData.lastName].filter(Boolean).join(' ') || 'Interessent',
              firma: (triggerData.company as string) || '',
              email: (triggerData.email as string) || '',
            },
            leadId: triggerData.leadId,
          },
          referenceType: 'lead',
          referenceId: (triggerData.leadId as string) || undefined,
        })
        return { success: true, data: { to, template } }
      } catch (err) {
        return { success: false, error: `Email queue failed: ${err instanceof Error ? err.message : String(err)}` }
      }
    },
  },

  notify_admin: {
    name: 'notify_admin',
    label: 'Admin benachrichtigen',
    description: 'Sendet eine Benachrichtigungs-E-Mail an den Admin',
    category: 'communication',
    icon: 'Bell',
    configFields: [
      { key: 'template', label: 'Template-Slug', type: 'string' },
    ],
    execute: async (ctx, config) => {
      const { triggerData } = ctx
      const template = (config.template as string) || 'lead_admin_notification'
      const leadId = triggerData.leadId as string

      try {
        const { TaskQueueService } = await import('@/lib/services/task-queue.service')
        await TaskQueueService.create({
          type: 'email', priority: 1,
          payload: {
            templateSlug: template, to: '__ADMIN__',
            placeholders: {
              name: [triggerData.firstName, triggerData.lastName].filter(Boolean).join(' '),
              firma: (triggerData.company as string) || '–',
              email: (triggerData.email as string) || '',
              telefon: (triggerData.phone as string) || '–',
              interessen: ((triggerData.interests as string[]) || []).join(', '),
              nachricht: ((triggerData.message as string) || '').substring(0, 500),
              leadUrl: leadId ? `/intern/leads/${leadId}` : '',
            },
            leadId,
          },
          referenceType: 'lead',
          referenceId: leadId || undefined,
        })
        return { success: true, data: { template } }
      } catch (err) {
        return { success: false, error: `Notification failed: ${err instanceof Error ? err.message : String(err)}` }
      }
    },
  },

  set_field: {
    name: 'set_field',
    label: 'Feld setzen',
    description: 'Setzt ein Feld auf dem Lead (Status, Tags, etc.)',
    category: 'logic',
    icon: 'Settings',
    configFields: [
      { key: 'field', label: 'Feld', type: 'select', options: ['status', 'tags', 'notes'] },
      { key: 'value', label: 'Wert', type: 'string' },
    ],
    execute: async (ctx, config) => {
      const leadId = ctx.triggerData.leadId as string
      const field = config.field as string
      const value = config.value
      if (!leadId || !field) return { success: false, error: 'leadId oder field fehlt' }

      const update: Record<string, unknown> = { updatedAt: new Date() }
      if (field === 'status') update.status = value
      if (field === 'tags') update.tags = Array.isArray(value) ? value : [value]
      if (field === 'notes') update.notes = value

      await db.update(leads).set(update).where(eq(leads.id, leadId))
      return { success: true, data: { field, value } }
    },
  },

  delay: {
    name: 'delay',
    label: 'Verzögerung',
    description: 'Wartet eine konfigurierbare Zeit (in Sekunden)',
    category: 'logic',
    icon: 'Clock',
    configFields: [
      { key: 'seconds', label: 'Sekunden', type: 'number' },
    ],
    execute: async (_ctx, config) => {
      const seconds = (config.seconds as number) || 5
      await new Promise(resolve => setTimeout(resolve, seconds * 1000))
      return { success: true, data: { waited: seconds } }
    },
  },

  run_custom_prompt: {
    name: 'run_custom_prompt',
    label: 'Eigenen KI-Prompt ausführen',
    description: 'Führt einen eigenen KI-Prompt mit Firmenkontext aus. Optional wird das Ergebnis als Aktivität gespeichert.',
    category: 'ai',
    icon: 'Sparkles',
    configFields: [
      { key: 'promptId', label: 'Prompt', type: 'custom_prompt' },
      { key: 'saveAsActivity', label: 'Ergebnis als Aktivität speichern', type: 'boolean' },
    ],
    execute: async (ctx, config) => {
      const promptId = (config.promptId as string)?.trim()
      if (!promptId) return { success: false, error: 'promptId fehlt' }

      const companyId =
        (ctx.triggerData.companyId as string | undefined) ||
        ((ctx.stepResults.find_or_create_company as Record<string, unknown>)?.companyId as string | undefined) ||
        null

      try {
        const { CustomAiPromptService } = await import('@/lib/services/ai/custom-prompt.service')
        const result = await CustomAiPromptService.execute({ promptId, companyId })

        const saveAsActivity = config.saveAsActivity !== false // default true
        let activityId: string | undefined
        if (saveAsActivity && companyId) {
          const personId = (ctx.stepResults.find_or_create_person as Record<string, unknown>)?.personId as string | undefined
          const [row] = await db.insert(activities).values({
            companyId,
            personId: personId || null,
            type: result.activityType || 'note',
            subject: result.subject,
            content: result.content,
            metadata: { source: 'workflow', workflowAction: 'run_custom_prompt', promptId },
          }).returning({ id: activities.id })
          activityId = row?.id
        }

        return {
          success: true,
          data: {
            promptId,
            companyId,
            subject: result.subject,
            content: result.content,
            activityId,
          },
        }
      } catch (err) {
        return { success: false, error: `Prompt-Ausführung fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}` }
      }
    },
  },

  webhook_call: {
    name: 'webhook_call',
    label: 'Webhook aufrufen',
    description: 'HTTP-Request an externe URL (POST/GET/PUT/DELETE) mit Mustache-Templating, Retry und Timeout',
    category: 'communication',
    icon: 'Webhook',
    configFields: [
      { key: 'url', label: 'URL', type: 'string' },
      { key: 'method', label: 'Methode', type: 'select', options: ['POST', 'GET', 'PUT', 'DELETE'] },
      { key: 'authBearer', label: 'Bearer-Token (optional)', type: 'string' },
      { key: 'headers', label: 'Custom Headers (JSON)', type: 'json' },
      { key: 'body', label: 'Body (JSON, mit {{data.field}})', type: 'json' },
      { key: 'retries', label: 'Retries (5xx/Network)', type: 'number' },
      { key: 'timeoutMs', label: 'Timeout (ms)', type: 'number' },
    ],
    execute: async (ctx, config) => {
      const cfg = config as {
        url?: unknown; method?: unknown; headers?: unknown;
        authBearer?: unknown; body?: unknown; retries?: unknown; timeoutMs?: unknown
      }

      const url = String(resolveTemplate(cfg.url ?? '', ctx))
      if (!url.trim()) return { success: false, error: 'URL leer nach Templating' }

      const methodRaw = typeof cfg.method === 'string' ? cfg.method : 'POST'
      const method = methodRaw.toUpperCase()

      const baseHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
      const resolvedHeaders = resolveTemplate(cfg.headers ?? {}, ctx)
      const headers: Record<string, string> = {
        ...baseHeaders,
        ...(resolvedHeaders && typeof resolvedHeaders === 'object'
          ? Object.fromEntries(
              Object.entries(resolvedHeaders as Record<string, unknown>)
                .map(([k, v]) => [k, String(v)]),
            )
          : {}),
      }
      if (cfg.authBearer) {
        headers.Authorization = `Bearer ${resolveTemplate(cfg.authBearer, ctx)}`
      }

      let body: string | undefined
      if (method !== 'GET' && method !== 'DELETE') {
        try {
          body = JSON.stringify(resolveTemplate(cfg.body ?? {}, ctx))
        } catch (err) {
          return { success: false, error: `Body nicht serialisierbar: ${err instanceof Error ? err.message : String(err)}` }
        }
      }

      const retriesRaw = typeof cfg.retries === 'number' ? cfg.retries : 2
      const maxAttempts = Math.min(Math.max(0, retriesRaw), 5) + 1
      const timeoutMs = typeof cfg.timeoutMs === 'number' && cfg.timeoutMs > 0 ? cfg.timeoutMs : 10_000

      let lastError: string = 'unknown'
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeoutMs)
        try {
          const res = await fetch(url, { method, headers, body, signal: controller.signal })
          clearTimeout(timer)
          const text = await res.text().catch(() => '')
          const parsedBody = safeParseJson(text) ?? text

          if (res.ok) {
            return { success: true, data: { status: res.status, body: parsedBody } }
          }
          if (res.status >= 400 && res.status < 500) {
            return {
              success: false,
              error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
              data: { status: res.status, body: parsedBody },
            }
          }
          lastError = `HTTP ${res.status}: ${text.slice(0, 200)}`
        } catch (err) {
          clearTimeout(timer)
          lastError = err instanceof Error ? err.message : String(err)
        }
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 1000 * attempt))
        }
      }
      return { success: false, error: lastError }
    },
  },

  // ─── Social Media Actions (Phase 5: Generator + Pipeline) ──────────────────

  generate_social_post: {
    name: 'generate_social_post',
    label: 'Social-Media-Beitrag generieren (KI)',
    description: 'Erstellt einen plattformspezifischen Beitrag inkl. Hashtags und optional KI-Bild. Speichert als Draft (oder direkt scheduled).',
    category: 'ai',
    icon: 'Share2',
    configFields: [
      { key: 'platform', label: 'Plattform', type: 'select', options: ['linkedin', 'x', 'instagram', 'facebook', 'xing'] },
      { key: 'topic', label: 'Thema', type: 'string' },
      { key: 'tone', label: 'Tonalität', type: 'select', options: ['professional', 'casual', 'humorous', 'inspirational'] },
      { key: 'includeHashtags', label: 'Hashtags', type: 'boolean' },
      { key: 'includeEmoji', label: 'Emojis', type: 'boolean' },
      { key: 'includeImage', label: 'Bild generieren', type: 'boolean' },
      { key: 'scheduledAt', label: 'Geplant für (ISO oder leer = Draft)', type: 'string' },
    ],
    execute: async (ctx, config) => {
      const resolved = resolveTemplate(config, ctx) as Record<string, unknown>
      const platform = String(resolved.platform || 'linkedin')
      const topic = String(resolved.topic || '').trim()
      if (!topic) return { success: false, error: 'topic fehlt' }
      try {
        const { SocialMediaAIService } = await import('@/lib/services/ai/social-media-ai.service')
        const { SocialMediaPostService } = await import('@/lib/services/social-media-post.service')
        const { ImageGenerationService } = await import('@/lib/services/ai/image-generation.service')

        const generated = await SocialMediaAIService.generatePost({
          platform,
          topic,
          tone: resolved.tone ? String(resolved.tone) : 'professional',
          includeHashtags: resolved.includeHashtags !== false,
          includeEmoji: resolved.includeEmoji !== false,
          includeImage: resolved.includeImage !== false,
        }, { feature: 'social_media_workflow', entityType: 'social_media_post' })

        let imageUrl: string | null = null
        if (resolved.includeImage !== false && generated.imagePrompt) {
          const aspect: '1:1' | '16:9' = platform === 'instagram' ? '1:1' : '16:9'
          try {
            const imgResult = await Promise.race([
              ImageGenerationService.generate(null, {
                prompt: generated.imagePrompt,
                provider: 'gemini',
                aspectRatio: aspect,
                category: 'social_media',
                tags: generated.hashtags?.slice(0, 5).map((h) => h.replace(/^#/, '')) ?? [],
              }),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 60_000)),
            ])
            if (imgResult && imgResult.imageUrl) imageUrl = imgResult.imageUrl
          } catch { /* non-fatal */ }
        }

        const scheduledAt = resolved.scheduledAt ? String(resolved.scheduledAt) : undefined
        const status = scheduledAt ? 'scheduled' : 'draft'
        const post = await SocialMediaPostService.create({
          platform,
          title: generated.title,
          content: generated.content,
          hashtags: generated.hashtags,
          imageUrl: imageUrl ?? undefined,
          scheduledAt,
          status,
          aiGenerated: true,
        })

        return {
          success: true,
          data: {
            postId: post.id,
            platform: post.platform,
            status: post.status,
            scheduledAt: post.scheduledAt?.toISOString() ?? null,
            imageUrl: post.imageUrl,
          },
        }
      } catch (err) {
        return { success: false, error: `Generierung fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}` }
      }
    },
  },

  schedule_social_post: {
    name: 'schedule_social_post',
    label: 'Social-Media-Beitrag schedulen',
    description: 'Setzt scheduledAt + status=scheduled auf einen bestehenden Post (postId aus Trigger oder vorigem Step).',
    category: 'data',
    icon: 'CalendarClock',
    configFields: [
      { key: 'postId', label: 'Post-ID', type: 'string' },
      { key: 'scheduledAt', label: 'Zeit (ISO)', type: 'string' },
    ],
    execute: async (ctx, config) => {
      const resolved = resolveTemplate(config, ctx) as Record<string, unknown>
      const postId = String(resolved.postId || '').trim()
      const scheduledAt = String(resolved.scheduledAt || '').trim()
      if (!postId) return { success: false, error: 'postId fehlt' }
      if (!scheduledAt) return { success: false, error: 'scheduledAt fehlt' }
      try {
        const { SocialMediaPostService } = await import('@/lib/services/social-media-post.service')
        const post = await SocialMediaPostService.update(postId, { scheduledAt, status: 'scheduled' })
        if (!post) return { success: false, error: 'Post nicht gefunden' }
        return { success: true, data: { postId, scheduledAt: post.scheduledAt?.toISOString() ?? null, status: post.status } }
      } catch (err) {
        return { success: false, error: `Schedule fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}` }
      }
    },
  },

  publish_social_post: {
    name: 'publish_social_post',
    label: 'Social-Media-Beitrag sofort posten',
    description: 'Veröffentlicht den Post direkt über den passenden Provider (FB/IG/X/LinkedIn).',
    category: 'communication',
    icon: 'Send',
    configFields: [
      { key: 'postId', label: 'Post-ID', type: 'string' },
    ],
    execute: async (ctx, config) => {
      const resolved = resolveTemplate(config, ctx) as Record<string, unknown>
      const postId = String(resolved.postId || '').trim()
      if (!postId) return { success: false, error: 'postId fehlt' }
      try {
        const { SocialPublishOrchestrator } = await import('@/lib/services/social/social-publish-orchestrator')
        const outcome = await SocialPublishOrchestrator.publishById(postId)
        if (!outcome.result.ok) {
          return { success: false, error: `Publish fehlgeschlagen: ${outcome.result.error}` }
        }
        return {
          success: true,
          data: {
            postId,
            platform: outcome.platform,
            externalPostId: outcome.result.externalPostId,
            externalUrl: outcome.result.externalUrl,
          },
        }
      } catch (err) {
        return { success: false, error: `Publish-Aufruf fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}` }
      }
    },
  },
}

// ─── Registry API ──────────────────────────────────────────────────────────────

export function getAction(name: string): ActionDefinition | undefined {
  return ACTIONS[name]
}

export function getAllActions(): ActionDefinition[] {
  return Object.values(ACTIONS)
}

export function getActionsByCategory(category: string): ActionDefinition[] {
  return Object.values(ACTIONS).filter(a => a.category === category)
}
