'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Layers } from 'lucide-react'
import type { ParallelStep, ActionDefinition } from './types'
import { StepList } from './step-list'

interface Props {
  step: ParallelStep
  actions: ActionDefinition[]
  onChange: (step: ParallelStep) => void
}

export function ParallelStepEditor({ step, actions, onChange }: Props) {
  const subCount = step.steps.length
  const warning =
    subCount < 2 ? 'Hinweis: Parallel mit weniger als 2 Schritten ist semantisch wie eine Aktion.'
    : subCount > 20 ? 'Achtung: viele parallele Schritte können Last erzeugen (Limit: 100).'
    : null

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Parallel ({subCount} Schritt{subCount === 1 ? '' : 'e'})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {warning && <p className="text-xs text-amber-600">{warning}</p>}
        <div className="pl-4 border-l-2 border-muted">
          <StepList
            steps={step.steps}
            onChange={updated => onChange({ ...step, steps: updated })}
            actions={actions}
            containerId={`${step.id ?? 'par'}.steps`}
          />
        </div>
      </CardContent>
    </Card>
  )
}
