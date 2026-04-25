export type StepKind = 'action' | 'branch' | 'parallel' | 'for_each'

export interface BaseStep {
  id?: string
  label?: string
  condition?: string
}

export interface ActionStep extends BaseStep {
  kind?: 'action'
  action: string
  config?: Record<string, unknown>
}

export interface BranchStep extends BaseStep {
  kind: 'branch'
  ifCondition: string
  then: WorkflowStep[]
  else?: WorkflowStep[]
}

export interface ParallelStep extends BaseStep {
  kind: 'parallel'
  steps: WorkflowStep[]
}

export interface ForEachStep extends BaseStep {
  kind: 'for_each'
  source: string
  steps: WorkflowStep[]
}

export type WorkflowStep = ActionStep | BranchStep | ParallelStep | ForEachStep

export interface ActionDefinition {
  name: string
  label: string
  description: string
  category: string
  icon: string
  configFields: Array<{ key: string; label: string; type: string; options?: string[] }>
}
