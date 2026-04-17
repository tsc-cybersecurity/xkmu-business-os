import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { ProcessService } from '@/lib/services/process.service'
import { AIService } from '@/lib/services/ai/ai.service'
import { AiPromptTemplateService } from '@/lib/services/ai-prompt-template.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

const APP_CAPABILITIES = `
BESTEHENDE MODULE UND FUNKTIONEN:

1. CRM (Firmen + Personen):
   - Firmen: CRUD, Status (Prospect/Lead/Customer/Partner), Website, Branche, Tags, Notizen
   - Personen: CRUD, E-Mail, Telefon, Firma-Zuordnung
   - Aktivitaeten: Notizen, Anrufe, E-Mails, Meetings als Log
   - KI-Firmen-Research: Firecrawl Website-Analyse, automatische Datenanreicherung

2. Leads:
   - Pipeline: New > Qualifying > Qualified > Contacted > Meeting > Proposal > Won/Lost
   - Scoring 0-100%, Quellen-Tracking, Zuweisung an Mitarbeiter
   - KI-Lead-Research mit Firecrawl + AI

3. Chancen/Opportunities:
   - Deal-Wert, Pipeline-Stage, Wahrscheinlichkeit, Abschlussdatum

4. Finance:
   - Rechnungen: Erstellen, Positionen, Berechnung, PDF-Export, Status-Tracking
   - Angebote: Erstellen, Positionen, PDF-Export, Gueltigkeit
   - KEIN E-Mail-Versand, KEIN Zahlungseingangs-Tracking, KEIN Mahnwesen

5. Blog:
   - CRUD, KI-Generierung (Titel, Content, SEO), Publish/Draft/Archive
   - SEO-Felder (Title, Description, Keywords), Featured Image, Tags, Kategorien
   - KEIN WordPress-Export, KEIN KI-Review

6. Social Media:
   - Posts fuer LinkedIn, Twitter/X, Instagram, Facebook, XING
   - KI-Generierung, Content-Plan, Topics-Verwaltung
   - KEIN direktes Posten auf Plattformen (keine API-Integration)

7. Marketing:
   - Kampagnen (E-Mail, Call, SMS, Multi-channel), Templates
   - KI Marketing Agent: Website-Scrape > Research > SEO > Content-Generierung

8. Bildgenerierung:
   - Multi-Provider: Gemini, DALL-E 3, kie.ai (Midjourney, Flux, Nano Banana)
   - Aspektverhaeltnis, Stil, Galerie, Download

9. Business Intelligence:
   - Dokumenten-Upload, Text-Extraktion
   - KI-SWOT-Analyse, Marktanalyse, Empfehlungen

10. Chat: Multi-Provider KI-Chat mit Konversations-History

11. Cybersecurity:
    - DIN SPEC 27076 Audit: 27 Anforderungen, Scoring, Risiko-Level, PDF-Report
    - WiBA-Check: 257 Fragen, 4 Prioritaeten, PDF-Report
    - KEINE Roadmap-Generierung aus Audit-Ergebnissen

12. n8n Workflows: Workflow-Management, Trigger, Activate/Deactivate

13. Cockpit: System-Monitoring, DB-Status

14. Einstellungen:
    - KI-Provider (Gemini, OpenAI, OpenRouter, Firecrawl, SerpAPI, kie.ai, Ollama)
    - Prompt-Templates mit Platzhalter-System
    - Webhooks, API-Keys, Rollen, Benutzer

15. NICHT VORHANDEN:
    - E-Mail-Versand (kein SMTP/Brevo)
    - Kalender-Integration
    - Projektmanagement/Kanban-Board
    - Zeiterfassung
    - Newsletter
    - Mahnwesen
    - Feedback/Umfragen
    - Dokumenten-Templates mit Platzhaltern
`

// POST /api/v1/processes/dev-tasks/generate - AI batch analysis
export async function POST(request: NextRequest) {
  return withPermission(request, 'processes', 'update', async (auth) => {
    try {
      const body = await request.json().catch(() => ({})) as {
        taskKeys?: string[]  // Optional: only specific tasks
        overwrite?: boolean  // Overwrite existing devRequirements
        customPrompt?: string // Optional: custom prompt instead of template
      }

      // Get all processes with tasks (parallel fetch)
      const allProcesses = await ProcessService.list(TENANT_ID)
      const allTasks: Array<{
        task: Awaited<ReturnType<typeof ProcessService.getTaskById>> & Record<string, unknown>
        processName: string
        processKey: string
      }> = []

      const tasksByProcess = await Promise.all(
        allProcesses.map(p => ProcessService.listTasks(TENANT_ID, p.id))
      )
      for (let pi = 0; pi < allProcesses.length; pi++) {
        const process = allProcesses[pi]
        for (const task of tasksByProcess[pi]) {
          // Filter by taskKeys if provided
          if (body.taskKeys?.length && !body.taskKeys.includes(task.taskKey)) continue
          // Skip if already has devRequirements and overwrite is false
          if (!body.overwrite && task.devRequirements && Array.isArray(task.devRequirements) && (task.devRequirements as unknown[]).length > 0) continue
          // Skip if appStatus is 'full' (already fully covered)
          if (task.appStatus === 'full') continue

          allTasks.push({
            task: task as typeof task & Record<string, unknown>,
            processName: process.name,
            processKey: process.key,
          })
        }
      }

      if (allTasks.length === 0) {
        return apiError('NO_TASKS', 'Keine Aufgaben zum Analysieren gefunden', 400)
      }

      logger.info(`Dev analysis: Starting batch for ${allTasks.length} tasks`, { module: 'DevTasksGenerateAPI' })

      const template = await AiPromptTemplateService.getOrDefault(TENANT_ID, 'process_dev_analysis')
      let generated = 0
      let errors = 0

      for (const { task, processName, processKey } of allTasks) {
        try {
          // Build full task context
          const taskContext = [
            `Prozess: ${processKey} ${processName}`,
            `Teilprozess: ${task.subprocess || '-'}`,
            `Aufgabe: ${task.taskKey} - ${task.title}`,
            `Zweck: ${task.purpose || '-'}`,
            `Ausloeser: ${task.trigger || '-'}`,
            `Zeitaufwand: ${task.timeEstimate || '-'}`,
            `Automatisierungspotenzial: ${task.automationPotential || '-'}`,
            `Tools: ${Array.isArray(task.tools) ? (task.tools as string[]).join(', ') : '-'}`,
            `Vorbedingungen: ${Array.isArray(task.prerequisites) ? (task.prerequisites as string[]).join('; ') : '-'}`,
            `Schritte:`,
            ...(Array.isArray(task.steps) ? (task.steps as Array<{ nr: string | number; action: string; tool?: string; hint?: string }>).map(s =>
              `  ${s.nr}. ${s.action}${s.tool ? ` [Tool: ${s.tool}]` : ''}${s.hint ? ` (Tipp: ${s.hint})` : ''}`
            ) : []),
            `Checkliste: ${Array.isArray(task.checklist) ? (task.checklist as string[]).join('; ') : '-'}`,
            `Erwartetes Ergebnis: ${task.expectedOutput || '-'}`,
            `Fehlerfall: ${task.errorEscalation || '-'}`,
            `KI-Ansatz: ${task.solution || '-'}`,
            ``,
            `Aktueller App-Status: ${task.appStatus || 'none'}`,
            `Aktuelles App-Modul: ${task.appModule || '-'}`,
            `Aktuelle App-Notizen: ${task.appNotes || '-'}`,
          ].join('\n')

          // Use custom prompt if provided, otherwise use template
          const userPrompt = body.customPrompt
            ? body.customPrompt
            : AiPromptTemplateService.applyPlaceholders(
                template.userPrompt,
                { taskContext, appCapabilities: APP_CAPABILITIES }
              )

          const response = await AIService.completeWithContext(userPrompt, {
            tenantId: TENANT_ID,
            feature: 'process_dev_analysis',
          }, {
            maxTokens: 3000,
            temperature: 0.2,
            systemPrompt: template.systemPrompt,
          })

          // Parse JSON from response
          const jsonMatch = response.text.match(/\[[\s\S]*\]/)
          if (!jsonMatch) {
            logger.warn(`Dev analysis: No JSON in response for ${task.taskKey}`, { module: 'DevTasksGenerateAPI' })
            errors++
            continue
          }

          let devReqs: unknown[]
          try {
            devReqs = JSON.parse(jsonMatch[0])
          } catch {
            // Try to repair truncated JSON
            let repaired = jsonMatch[0]
            const openBraces = (repaired.match(/{/g) || []).length
            const closeBraces = (repaired.match(/}/g) || []).length
            const openBrackets = (repaired.match(/\[/g) || []).length
            const closeBrackets = (repaired.match(/]/g) || []).length
            for (let j = 0; j < openBraces - closeBraces; j++) repaired += '}'
            for (let j = 0; j < openBrackets - closeBrackets; j++) repaired += ']'
            try {
              devReqs = JSON.parse(repaired)
            } catch {
              errors++
              continue
            }
          }

          if (!Array.isArray(devReqs) || devReqs.length === 0) {
            // No requirements needed (task fully covered)
            continue
          }

          // Validate and normalize (tool field is optional)
          const normalized = devReqs.map((r: unknown) => {
            const obj = r as Record<string, unknown>
            return {
              tool: String(obj.tool || 'App-Feature'),
              neededFunction: String(obj.neededFunction || ''),
              approach: String(obj.approach || ''),
              effort: ['S', 'M', 'L', 'XL'].includes(String(obj.effort)) ? String(obj.effort) : 'M',
              priority: ['hoch', 'mittel', 'niedrig'].includes(String(obj.priority)) ? String(obj.priority) : 'mittel',
            }
          }).filter(r => r.neededFunction && r.approach)

          if (normalized.length > 0) {
            await ProcessService.updateTaskByKey(TENANT_ID, task.taskKey, {
              devRequirements: normalized,
            })
            generated++
          }

          logger.info(`Dev analysis: ${task.taskKey} -> ${normalized.length} requirements`, { module: 'DevTasksGenerateAPI' })
        } catch (err) {
          logger.warn(`Dev analysis failed for ${task.taskKey}: ${err instanceof Error ? err.message : 'Unknown'}`, { module: 'DevTasksGenerateAPI' })
          errors++
        }
      }

      logger.info(`Dev analysis complete: ${generated} generated, ${errors} errors, ${allTasks.length} total`, { module: 'DevTasksGenerateAPI' })

      return apiSuccess({
        generated,
        errors,
        total: allTasks.length,
        skipped: allTasks.length - generated - errors,
      })
    } catch (error) {
      logger.error('Dev tasks generate error', error, { module: 'DevTasksGenerateAPI' })
      return apiServerError()
    }
  })
}
