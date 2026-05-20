// ============================================
// Businessplan-Pipeline — Workflow-Actions
// ============================================
// Sechs Actions, die die Businessplan-Pipeline ausmachen. Werden in der
// Workflow-Action-Registry (action-registry.ts) registriert und sind damit
// in jedem Loop-Workflow nutzbar. Der Businessplan-IterationService ruft
// die Actions auch direkt auf (ohne Workflow-Engine-Umweg), siehe Task 7.
//
// Pattern: jeder Action-Step nimmt ActionContext + config (Templated-
// Strings werden in config bereits aufgeloest). Output ist {success, data}.

import { logger } from '@/lib/utils/logger'
import type { ActionContext, ActionResult } from '@/lib/services/workflow/action-registry'
import { MirofishClient } from '@/lib/services/mirofish/client'

// ─── Helper: AI-Prompt-Template ausfuehren ─────────────────────────────────

function extractJson(text: string): string | null {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) return codeBlockMatch[1].trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]
  return null
}

interface RunTemplateOptions {
  maxTokens?: number
  temperature?: number
  entityType?: string
  entityId?: string
}

async function runTemplate<T>(
  slug: string,
  vars: Record<string, string>,
  options: RunTemplateOptions = {},
): Promise<T> {
  const { AiPromptTemplateService } = await import('@/lib/services/ai-prompt-template.service')
  const { AiProviderService } = await import('@/lib/services/ai-provider.service')
  const { AIService } = await import('@/lib/services/ai/ai.service')

  const template = await AiPromptTemplateService.getOrDefault(slug)
  const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, vars)
  const fullPrompt = template.outputFormat
    ? `${userPrompt}\n\n${template.outputFormat}`
    : userPrompt

  const defaultProvider = await AiProviderService.getDefaultProvider()
  if (!defaultProvider) {
    throw new Error(
      'Kein Default-KI-Provider konfiguriert. Bitte unter /intern/settings/ai-providers einen aktiven Provider als Standard markieren.',
    )
  }

  const response = await AIService.completeWithContext(
    fullPrompt,
    {
      feature: slug,
      entityType: options.entityType,
      entityId: options.entityId,
    },
    {
      providerId: defaultProvider.id,
      maxTokens: options.maxTokens ?? 4000,
      temperature: options.temperature ?? 0.7,
      systemPrompt: template.systemPrompt,
    },
  )

  const jsonStr = extractJson(response.text)
  if (!jsonStr) {
    logger.error(`${slug}: no JSON in AI response`, undefined, { module: 'BusinessPlanActions' })
    throw new Error(`${slug}: AI response had no parseable JSON`)
  }
  return JSON.parse(jsonStr) as T
}

// ─── Typen fuer die 6 Action-Outputs ───────────────────────────────────────

export interface CanvasPlan {
  problem: string[]
  solution: string[]
  keyMetrics: string[]
  uniqueValueProposition: string
  unfairAdvantage: string[]
  channels: string[]
  customerSegments: string[]
  costStructure: string[]
  revenueStreams: string[]
}

export interface KfwPlan {
  markdown: string
}

export interface AnalysisResult {
  score: number
  reasoning: string
  strengths: string[]
  weaknesses: string[]
  improvements: string[]
}

// ─── Action-Implementierungen ──────────────────────────────────────────────

/**
 * Aus rohem Seed-Input (Quick-Idee oder Briefing-JSON) eine Story erzeugen.
 * config.seedInput, config.inputType muessen gesetzt sein (vom Aufrufer).
 */
export const generateBusinessStoryAction = async (
  _ctx: ActionContext,
  config: Record<string, unknown>,
): Promise<ActionResult> => {
  try {
    const seedInput = config.seedInput
    const inputType = String(config.inputType ?? 'quick')
    if (!seedInput) return { success: false, error: 'seedInput fehlt' }

    const parsed = await runTemplate<{ story: string }>(
      'business_plan.idea_to_story',
      {
        seedInput: typeof seedInput === 'string' ? seedInput : JSON.stringify(seedInput),
        inputType,
      },
      { maxTokens: 2000, entityType: 'business_plans', entityId: String(config.planId ?? '') },
    )
    if (!parsed?.story) return { success: false, error: 'story fehlt in AI-Antwort' }
    return { success: true, data: { story: parsed.story } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Story → Plan-Version generieren. mode bestimmt ob canvas, kfw oder both.
 * Ruft je nach mode 1-2 Templates parallel.
 */
export const generateBusinessPlanAction = async (
  _ctx: ActionContext,
  config: Record<string, unknown>,
): Promise<ActionResult> => {
  try {
    const story = String(config.story ?? '').trim()
    const mode = String(config.mode ?? 'both') as 'canvas' | 'kfw' | 'both'
    const planId = String(config.planId ?? '')
    if (!story) return { success: false, error: 'story fehlt' }

    const tasks: Array<Promise<{ canvas?: CanvasPlan; kfw?: KfwPlan }>> = []

    if (mode === 'canvas' || mode === 'both') {
      tasks.push(
        runTemplate<CanvasPlan>(
          'business_plan.story_to_canvas',
          { story },
          { maxTokens: 3000, entityType: 'business_plans', entityId: planId },
        ).then((c) => ({ canvas: c })),
      )
    }
    if (mode === 'kfw' || mode === 'both') {
      tasks.push(
        runTemplate<KfwPlan>(
          'business_plan.story_to_kfw',
          { story },
          { maxTokens: 8000, entityType: 'business_plans', entityId: planId },
        ).then((k) => ({ kfw: k })),
      )
    }

    const results = await Promise.all(tasks)
    const merged: { canvas?: CanvasPlan; kfw?: KfwPlan } = {}
    for (const r of results) Object.assign(merged, r)

    if (!merged.canvas && !merged.kfw) {
      return { success: false, error: `Keine Plan-Version fuer mode "${mode}" generiert` }
    }
    return { success: true, data: merged as unknown as Record<string, unknown> }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Plan → Simulationsfrage formulieren UND Mirofish-Simulation laufen lassen.
 * Wir kapseln beide Schritte in einer Action, weil die Frage nur fuer
 * diesen einen Mirofish-Call gebraucht wird.
 */
export const simulateWithMirofishAction = async (
  _ctx: ActionContext,
  config: Record<string, unknown>,
): Promise<ActionResult> => {
  try {
    const mode = String(config.mode ?? 'both')
    const seedInput = config.seedInput
    const plan = config.plan as { canvas?: CanvasPlan; kfw?: KfwPlan } | undefined
    const planId = String(config.planId ?? '')
    if (!plan) return { success: false, error: 'plan fehlt' }

    // Plan-Excerpt fuer das Question-Template (kurz halten — wird gleich
    // nochmal als seedMaterial geschickt, da reicht der vollstaendige Plan).
    const planExcerpt = plan.kfw?.markdown
      ? plan.kfw.markdown.slice(0, 1500)
      : plan.canvas
        ? JSON.stringify(plan.canvas).slice(0, 1500)
        : '[kein Plan]'

    const { question } = await runTemplate<{ question: string }>(
      'business_plan.simulation_question',
      {
        mode,
        seedInput: typeof seedInput === 'string' ? seedInput : JSON.stringify(seedInput ?? {}),
        planExcerpt,
      },
      { maxTokens: 1000, entityType: 'business_plans', entityId: planId },
    )
    if (!question) return { success: false, error: 'question fehlt in AI-Antwort' }

    // Plan als seedMaterial: Markdown bevorzugt (lesbarer), sonst Canvas als JSON.
    const planContent = plan.kfw?.markdown
      ? plan.kfw.markdown
      : `# Lean Canvas\n\n\`\`\`json\n${JSON.stringify(plan.canvas, null, 2)}\n\`\`\``

    // Mirofish ist Multi-Step + async (5-15 Min). question wird als
    // simulationRequirement uebergeben — das ist Mirofish's Steuer-Anweisung,
    // welche Persona-Reaktionen es simulieren soll.
    const simulationResult = await MirofishClient.simulate({
      simulationRequirement: question,
      projectName: `Businessplan ${planId.slice(0, 8)}`,
      seedMaterials: [
        {
          filename: 'businessplan.md',
          contentType: 'text/markdown',
          content: planContent,
        },
      ],
    })

    return {
      success: true,
      data: {
        request: { question, planLength: planContent.length },
        result: simulationResult,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Mirofish-Bericht + Plan → KI-Analyse mit Score (0-100) und Improvements.
 */
export const analyzeSimulationAction = async (
  _ctx: ActionContext,
  config: Record<string, unknown>,
): Promise<ActionResult> => {
  try {
    const plan = config.plan as { canvas?: CanvasPlan; kfw?: KfwPlan } | undefined
    const simulationResult = config.simulationResult
    const planId = String(config.planId ?? '')
    if (!plan) return { success: false, error: 'plan fehlt' }
    if (!simulationResult) return { success: false, error: 'simulationResult fehlt' }

    const planStr = plan.kfw?.markdown
      ? plan.kfw.markdown
      : JSON.stringify(plan.canvas ?? {}, null, 2)

    const parsed = await runTemplate<AnalysisResult>(
      'business_plan.analyze_simulation',
      {
        plan: planStr,
        simulationResult: JSON.stringify(simulationResult),
      },
      { maxTokens: 2000, entityType: 'business_plans', entityId: planId },
    )

    const score = Number(parsed?.score)
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return { success: false, error: `Score "${parsed?.score}" ist nicht im 0-100-Bereich` }
    }

    return {
      success: true,
      data: {
        score: Math.round(score),
        reasoning: String(parsed.reasoning ?? ''),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Bestehender Plan + Improvements aus letzter Analyse → ueberarbeitete
 * Plan-Version. Ab Iteration 2 ersetzt das generate_business_plan.
 */
export const reviseBusinessPlanAction = async (
  _ctx: ActionContext,
  config: Record<string, unknown>,
): Promise<ActionResult> => {
  try {
    const mode = String(config.mode ?? 'both')
    const previousPlan = config.previousPlan as { canvas?: CanvasPlan; kfw?: KfwPlan } | undefined
    const improvements = config.improvements
    const planId = String(config.planId ?? '')
    if (!previousPlan) return { success: false, error: 'previousPlan fehlt' }
    if (!improvements) return { success: false, error: 'improvements fehlt' }

    const previousStr = previousPlan.kfw?.markdown
      ? previousPlan.kfw.markdown
      : JSON.stringify(previousPlan.canvas ?? {}, null, 2)

    const parsed = await runTemplate<{ canvas?: CanvasPlan; markdown?: string }>(
      'business_plan.revise_plan',
      {
        mode,
        previousPlan: previousStr,
        improvements: Array.isArray(improvements) ? improvements.join('\n- ') : String(improvements),
      },
      { maxTokens: 8000, entityType: 'business_plans', entityId: planId },
    )

    const out: { canvas?: CanvasPlan; kfw?: KfwPlan } = {}
    if ((mode === 'canvas' || mode === 'both') && parsed.canvas) out.canvas = parsed.canvas
    if ((mode === 'kfw' || mode === 'both') && parsed.markdown) {
      out.kfw = { markdown: parsed.markdown }
    }
    if (!out.canvas && !out.kfw) {
      return { success: false, error: `revise_plan lieferte weder canvas noch markdown fuer mode "${mode}"` }
    }
    return { success: true, data: out as unknown as Record<string, unknown> }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
