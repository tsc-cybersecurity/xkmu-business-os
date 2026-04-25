'use client'

import type { WorkflowStep, ActionDefinition } from './types'
import { StepCard, makeActionStep, makeBranchStep, makeParallelStep, makeForEachStep } from './step-card'
import { AddStepMenu } from './add-step-menu'

function swap<T>(arr: T[], i: number, j: number): T[] {
  const out = [...arr]
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

interface Props {
  steps: WorkflowStep[]
  onChange: (steps: WorkflowStep[]) => void
  actions: ActionDefinition[]
}

export function StepList({ steps, onChange, actions }: Props) {
  return (
    <div className="space-y-2">
      {steps.map((step, idx) => (
        <StepCard
          key={step.id ?? `${idx}`}
          step={step}
          index={idx}
          totalSteps={steps.length}
          actions={actions}
          onChange={updated => onChange(steps.map((s, i) => (i === idx ? updated : s)))}
          onDelete={() => onChange(steps.filter((_, i) => i !== idx))}
          onMoveUp={idx > 0 ? () => onChange(swap(steps, idx, idx - 1)) : undefined}
          onMoveDown={idx < steps.length - 1 ? () => onChange(swap(steps, idx, idx + 1)) : undefined}
        />
      ))}
      <AddStepMenu
        actions={actions}
        onAddAction={name => {
          const def = actions.find(a => a.name === name)
          onChange([...steps, makeActionStep(name, def?.label)])
        }}
        onAddBranch={() => onChange([...steps, makeBranchStep()])}
        onAddParallel={() => onChange([...steps, makeParallelStep()])}
        onAddForEach={() => onChange([...steps, makeForEachStep()])}
      />
    </div>
  )
}
