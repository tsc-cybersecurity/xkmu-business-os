/**
 * Smart-Worker — Sub-LLM mit Tool-Use-Loop und Whitelist-eingeschraenktem Tool-Set.
 * Wird vom agentToolAdapter aufgerufen wenn ein Step workerType=`agent:<slug>` hat.
 *
 * Ablauf pro Iteration:
 *   1. LLM-Call mit System-Prompt + History + Tool-Liste + User-Input
 *   2. JSON-Output parsen: { toolCall } oder { final }
 *   3. toolCall: Whitelist pruefen, ggf. Tool invoken, History anhaengen
 *   4. final oder maxIterations erreicht: Loop beenden
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §2.2 + §5.1
 */

import { IterationOutputSchema, type IterationOutput } from './smart-worker/iteration-types'
import { filterToolsByWhitelist, matchesWhitelist } from './smart-worker/tool-filter'
import { SystemPromptService } from './system-prompt.service'

export interface SmartWorkerInput {
  definitionSlug: string
  input: Record<string, unknown>
  runId: string
  stepId: string
  goalId: string
}

export interface SmartWorkerOutput {
  status: 'succeeded' | 'failed'
  output?: { text: string; iterations: number; toolCalls: number }
  error?: string
  usage?: { inputTokens: number; outputTokens: number; costCents: number; provider: string; model: string }
}

interface HistoryEntry {
  toolRef: string
  input: Record<string, unknown>
  output?: Record<string, unknown>
  error?: string
}

function buildHistoryBlock(history: HistoryEntry[]): string {
  if (history.length === 0) return '(keine bisherigen Tool-Calls)'
  return history
    .map((h, i) => {
      const result = h.error ? `FEHLER: ${h.error}` : JSON.stringify(h.output ?? {}).slice(0, 500)
      return `${i + 1}. ${h.toolRef} input=${JSON.stringify(h.input).slice(0, 200)} -> ${result}`
    })
    .join('\n')
}

export const SmartWorkerService = {
  async run(args: SmartWorkerInput): Promise<SmartWorkerOutput> {
    const { loadAgentDefinition } = await import('./smart-worker/agent-definition-loader')
    const definition = await loadAgentDefinition(args.definitionSlug)
    if (!definition) {
      return { status: 'failed', error: `Smart-Worker-Definition '${args.definitionSlug}' nicht gefunden oder inaktiv` }
    }

    const { ToolRegistry } = await import('./tool-registry')
    const { initializeToolRegistry } = await import('./tools/bootstrap')
    initializeToolRegistry()

    const allTools = await ToolRegistry.listAll()
    const allowedTools = filterToolsByWhitelist(allTools, definition.allowedTools)
    const toolListPrompt = allowedTools.length === 0
      ? '(keine Tools verfuegbar)'
      : allowedTools.map((t) => `- ${t.ref.raw}: ${t.description}`).join('\n')

    // Loop-Suffix + Default-Modell aus DB via SystemPromptService
    const loopSuffixPrompt = await SystemPromptService.get('smart-worker-loop-suffix')
    const systemPrompt = `${definition.systemPrompt}\n\n${loopSuffixPrompt.systemPrompt}`
    const model = definition.modelHint ?? loopSuffixPrompt.modelHint ?? 'gemini-2.5-flash-lite'
    const history: HistoryEntry[] = []
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let lastProvider = 'unknown'
    let lastModel = model

    const { AIService } = await import('@/lib/services/ai')
    const { CostTrackerService } = await import('./cost-tracker.service')
    const { parseOrchestratorJson } = await import('./orchestrator/json-parser')

    for (let iter = 1; iter <= definition.maxIterations; iter++) {
      const userPrompt = `AUFTRAG:\n${JSON.stringify(args.input, null, 2)}\n\nTOOLS:\n${toolListPrompt}\n\nBISHERIGER TOOL-USE:\n${buildHistoryBlock(history)}\n\nIteration ${iter}/${definition.maxIterations}. Antworte mit JSON.`

      const response = await AIService.complete(userPrompt, {
        systemPrompt,
        model,
        temperature: 0.2,
        maxTokens: definition.maxTokensPerCall,
      })

      totalInputTokens += response.usage?.promptTokens ?? 0
      totalOutputTokens += response.usage?.completionTokens ?? 0
      lastProvider = response.provider
      lastModel = response.model

      await CostTrackerService.record({
        runId: args.runId,
        stepId: args.stepId,
        goalId: args.goalId,
        provider: response.provider,
        model: response.model,
        callRole: 'smart_worker',
        inputTokens: response.usage?.promptTokens ?? 0,
        outputTokens: response.usage?.completionTokens ?? 0,
        costCents: 0, // TODO: pricing-table
      })

      let parsed: IterationOutput
      try {
        parsed = parseOrchestratorJson(response.text, IterationOutputSchema)
      } catch (e) {
        return {
          status: 'failed',
          error: `LLM-JSON nicht parseable in Iteration ${iter}: ${(e as Error).message}`,
          usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, costCents: 0, provider: lastProvider, model: lastModel },
        }
      }

      if ('final' in parsed && typeof parsed.final === 'string') {
        return {
          status: 'succeeded',
          output: { text: parsed.final, iterations: iter, toolCalls: history.length },
          usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, costCents: 0, provider: lastProvider, model: lastModel },
        }
      }

      if (!('toolCall' in parsed) || !parsed.toolCall) {
        return {
          status: 'failed',
          error: `LLM-Output weder final noch toolCall in Iteration ${iter}`,
          usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, costCents: 0, provider: lastProvider, model: lastModel },
        }
      }

      const toolRef = parsed.toolCall.ref
      if (!matchesWhitelist(toolRef, definition.allowedTools)) {
        history.push({
          toolRef,
          input: parsed.toolCall.input,
          error: `Tool '${toolRef}' nicht in Whitelist — Aufruf blockiert`,
        })
        continue
      }

      try {
        const ref = ToolRegistry.parseRef(toolRef)
        const result = await ToolRegistry.invoke({
          ref,
          input: parsed.toolCall.input,
          context: { runId: args.runId, stepId: args.stepId, goalId: args.goalId },
        })
        if (result.usage) {
          totalInputTokens += result.usage.inputTokens
          totalOutputTokens += result.usage.outputTokens
          await CostTrackerService.record({
            runId: args.runId,
            stepId: args.stepId,
            goalId: args.goalId,
            provider: result.usage.provider,
            model: result.usage.model,
            callRole: 'smart_worker',
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
            costCents: result.usage.costCents,
          })
        }
        history.push({
          toolRef,
          input: parsed.toolCall.input,
          output: result.status === 'succeeded' ? result.output ?? {} : undefined,
          error: result.status === 'failed' ? result.error : undefined,
        })
      } catch (e) {
        history.push({ toolRef, input: parsed.toolCall.input, error: (e as Error).message })
      }
    }

    return {
      status: 'failed',
      error: `Smart-Worker hat maxIterations (${definition.maxIterations}) erreicht ohne final-Output`,
      output: { text: '', iterations: definition.maxIterations, toolCalls: history.length },
      usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, costCents: 0, provider: lastProvider, model: lastModel },
    }
  },
}
