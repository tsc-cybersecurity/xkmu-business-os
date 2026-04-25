'use client'

import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useDndMonitor, type DragEndEvent } from '@dnd-kit/core'
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
  containerId: string
}

export function StepList({ steps, onChange, actions, containerId }: Props) {
  const ids = steps.map((s, i) => s.id ?? `idx-${i}`)

  useDndMonitor({
    onDragEnd(event: DragEndEvent) {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const aCont = (active.data.current as any)?.containerId
      const oCont = (over.data.current as any)?.containerId
      if (aCont !== containerId || oCont !== containerId) return

      const oldIndex = ids.indexOf(active.id as string)
      const newIndex = ids.indexOf(over.id as string)
      if (oldIndex < 0 || newIndex < 0) return
      onChange(arrayMove(steps, oldIndex, newIndex))
    },
  })

  return (
    <div className="space-y-2">
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {steps.map((step, idx) => (
          <StepCard
            key={ids[idx]}
            sortableId={ids[idx]}
            containerId={containerId}
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
      </SortableContext>
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
