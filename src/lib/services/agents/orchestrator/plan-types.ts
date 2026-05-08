/**
 * Zod-Schemas fuer Orchestrator-JSON-Outputs.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §6.5
 */

import { z } from 'zod'

export const PlannedStepSchema = z.object({
  stepKey: z.string().min(1).max(200),
  workerType: z.string().regex(/^(memory|workflow|prompt|service|agent):.+$/, 'workerType muss Format <namespace>:<name> haben'),
  config: z.record(z.string(), z.unknown()).default({}),
  contextRefs: z.array(z.string()).default([]),
  dependsOnStepKeys: z.array(z.string()).default([]),
  nextStepMode: z.enum(['cron', 'immediate']).optional(),
})
export type PlannedStep = z.infer<typeof PlannedStepSchema>

export const InitialPlanSchema = z.object({
  reasoning: z.string().max(2000).default(''),
  steps: z.array(PlannedStepSchema).min(1).max(20),
})
export type InitialPlan = z.infer<typeof InitialPlanSchema>

export const ReplanDecisionSchema = z.object({
  action: z.enum(['continue', 'goal_complete', 'pause', 'fail']),
  reasoning: z.string().max(2000).default(''),
  newSteps: z.array(PlannedStepSchema).default([]),
  nextStepMode: z.enum(['cron', 'immediate']).optional(),
})
export type ReplanDecision = z.infer<typeof ReplanDecisionSchema>
