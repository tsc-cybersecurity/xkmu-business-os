'use client'

import { useEffect, useState } from 'react'
import { ArrowDown, Zap } from 'lucide-react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeContainer = (active.data.current as any)?.containerId as string | undefined
    const overContainer = (over.data.current as any)?.containerId as string | undefined
    if (activeContainer !== overContainer) return
    // No-op here; StepList handles the actual reorder via useDndMonitor.
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
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

          <StepList steps={steps} onChange={onChange} actions={actions} containerId="top" />

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
    </DndContext>
  )
}
