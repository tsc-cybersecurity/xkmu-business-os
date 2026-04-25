'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Minus, GitBranch } from 'lucide-react'
import type { BranchStep, ActionDefinition } from './types'
import { StepList } from './step-list'

interface Props {
  step: BranchStep
  actions: ActionDefinition[]
  onChange: (step: BranchStep) => void
}

export function BranchStepEditor({ step, actions, onChange }: Props) {
  const [showElse, setShowElse] = useState(!!step.else)

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Verzweigung (if/else)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label className="text-xs">Bedingung</Label>
          <Input
            value={step.ifCondition}
            onChange={e => onChange({ ...step, ifCondition: e.target.value })}
            placeholder="z.B. data.priority == 'hoch'  oder  steps.webhook_x.status == 200"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Erlaubt: <code>data.&lt;feld&gt;</code>, <code>steps.&lt;id&gt;.&lt;feld&gt;</code> mit Operatoren <code>== != &gt; &gt;= &lt; &lt;=</code> oder <code>== null</code> / <code>!= null</code>.
          </p>
        </div>

        <div className="pl-4 border-l-2 border-muted space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Then (wenn Bedingung wahr)</h4>
          <StepList
            steps={step.then}
            onChange={updated => onChange({ ...step, then: updated })}
            actions={actions}
            containerId={`${step.id ?? 'br'}.then`}
          />
        </div>

        {showElse ? (
          <div className="pl-4 border-l-2 border-muted space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground">Else (sonst)</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowElse(false)
                  onChange({ ...step, else: undefined })
                }}
              >
                <Minus className="h-4 w-4 mr-1" /> Else entfernen
              </Button>
            </div>
            <StepList
              steps={step.else ?? []}
              onChange={updated => onChange({ ...step, else: updated })}
              actions={actions}
              containerId={`${step.id ?? 'br'}.else`}
            />
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowElse(true)
              onChange({ ...step, else: [] })
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Else-Branch hinzufügen
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
