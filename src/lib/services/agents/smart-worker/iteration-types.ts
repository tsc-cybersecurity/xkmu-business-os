/**
 * Zod-Schemas fuer Smart-Worker-LLM-Iteration-Output.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1 (agent:*-Zeile)
 */

import { z } from 'zod'

export const ToolCallSchema = z.object({
  ref: z.string().regex(/^(memory|workflow|prompt|service|agent):.+$/, 'ref muss Format <namespace>:<name> haben'),
  input: z.record(z.string(), z.unknown()).default({}),
})

export const IterationOutputSchema = z.union([
  z.object({
    toolCall: ToolCallSchema,
    reasoning: z.string().max(1000).optional(),
    final: z.never().optional(),
  }).strict(),
  z.object({
    final: z.string().max(4000),
    reasoning: z.string().max(1000).optional(),
    toolCall: z.never().optional(),
  }).strict(),
])

export type IterationOutput = z.infer<typeof IterationOutputSchema>
export type ToolCall = z.infer<typeof ToolCallSchema>
