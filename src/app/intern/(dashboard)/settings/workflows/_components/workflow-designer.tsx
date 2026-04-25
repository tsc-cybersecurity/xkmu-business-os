'use client'

import { useEffect, useState } from 'react'
import { ArrowDown, Zap } from 'lucide-react'
import type { WorkflowStep, ActionDefinition } from './types'
import { StepList } from './step-list'
import { CustomPromptsContext } from './step-card'

interface WorkflowDesignerProps {
  steps: WorkflowStep[]
  actions: ActionDefinition[]
  onChange: (steps: WorkflowStep[]) => void
}

export function WorkflowDesigner({ steps, actions, onChange }: WorkflowDesignerProps) {
  const [customPrompts, setCustomPrompts] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    const needsPrompts = actions.some(a => a.configFields.some(f => f.type === 'custom_prompt'))
    if (!needsPrompts) return
    fetch('/api/v1/custom-prompts?active=true')
      .then(r => r.json())
      .then(data => {
        if (data?.success && Array.isArray(data.data?.prompts)) {
          setCustomPrompts(data.data.prompts.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })))
        }
      })
      .catch(() => { /* silent */ })
  }, [actions])

  return (
    <CustomPromptsContext.Provider value={customPrompts}>
      <div className="space-y-4">
        {/* Trigger Node */}
        <div className="flex justify-center">
          <div className="rounded-full bg-primary px-6 py-2 text-primary-foreground text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Trigger ausgelöst
          </div>
        </div>

        <div className="flex justify-center py-1">
          <ArrowDown className="h-4 w-4 text-muted-foreground" />
        </div>

        <StepList steps={steps} onChange={onChange} actions={actions} />

        {/* End Node */}
        <div className="flex justify-center pt-1">
          <ArrowDown className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex justify-center">
          <div className="rounded-full bg-muted px-6 py-2 text-muted-foreground text-sm font-medium">
            Workflow abgeschlossen
          </div>
        </div>
      </div>
    </CustomPromptsContext.Provider>
  )
}
