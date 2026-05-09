/**
 * Agent-Subsystem — Public API.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md
 */

export { SmartWorkerService } from './smart-worker.service'
export { runImmediate } from './immediate-lane.service'
export type { RunImmediateInput, RunImmediateResult, ImmediateTerminalReason } from './immediate-lane.service'
export { OrchestratorService } from './orchestrator.service'
export { GoalService } from './goal.service'
export { WorkerService } from './worker.service'
export { MemoryService } from './memory.service'
export { CostTrackerService } from './cost-tracker.service'
export { ToolRegistry } from './tool-registry'
export { initializeToolRegistry, isToolRegistryInitialized } from './tools/bootstrap'

export type {
  AgentGoal,
  AgentRun,
  AgentStep,
  AgentDefinition,
  AgentMemoryEntry,
  GoalStatus,
  RunStatus,
  StepStatus,
  ExecutionMode,
  PlannedStep,
  WorkerResult,
  MemoryRef,
  ToolNamespace,
  ToolRef,
  CallRole,
  AgentTaskType,
} from './types'

export { AGENT_TASK_TYPES } from './types'

export type {
  ToolDescriptor,
  ToolAdapter,
  ToolInvocation,
  ToolInvocationResult,
} from './tool-registry'

export type {
  CostEventInput,
  BudgetCheckResult,
} from './cost-tracker.service'

export type {
  MemorySearchHit,
  MemoryReadResult,
  MemoryFact,
} from './memory.service'

export type {
  ReplanDecision,
} from './orchestrator.service'

export type { CreateGoalInput, GoalListItem } from './goal.service'

export { reconcileStrandedRuns } from './recovery/reconcile.service'
export { handleContinuation } from './recovery/continuation.service'
export { recoverStrandedRunsOnBoot } from './recovery/boot-recovery'
export { logAgentEvent } from './recovery/activity-log'
export type { ContinuationPath, ContinuationResult } from './recovery/continuation.service'
export type { BootRecoveryResult } from './recovery/boot-recovery'
export type { ReconcileResult } from './recovery/reconcile.service'
export type { AgentEventAction, AgentEventInput } from './recovery/activity-log'

export { TemplateService } from './template.service'
export { AgentNotificationService } from './notification.service'
export type { NotifyGoalTerminalInput } from './notification.service'
