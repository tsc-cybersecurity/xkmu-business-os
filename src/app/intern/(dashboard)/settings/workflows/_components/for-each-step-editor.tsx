'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Repeat } from 'lucide-react'
import type { ForEachStep, ActionDefinition } from './types'
import { StepList } from './step-list'

interface Props {
  step: ForEachStep
  actions: ActionDefinition[]
  onChange: (step: ForEachStep) => void
}

export function ForEachStepEditor({ step, actions, onChange }: Props) {
  const subCount = step.steps.length

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Repeat className="h-4 w-4" />
          Schleife (for-each) — {subCount} Schritt{subCount === 1 ? '' : 'e'} pro Iteration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label className="text-xs">Quelle (Pfad zu Array)</Label>
          <Input
            value={step.source}
            onChange={e => onChange({ ...step, source: e.target.value })}
            placeholder="z.B. data.interests  oder  steps.webhook_x.body.tags"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Im Loop verfügbar: <code>{'{{item}}'}</code>, <code>{'{{item.feld}}'}</code>, <code>{'{{loop.index}}'}</code>.
          </p>
        </div>
        <div className="pl-4 border-l-2 border-muted">
          <StepList
            steps={step.steps}
            onChange={updated => onChange({ ...step, steps: updated })}
            actions={actions}
            containerId={`${step.id ?? 'fe'}.steps`}
          />
        </div>
      </CardContent>
    </Card>
  )
}
