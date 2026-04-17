'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GripVertical, Trash2, Plus, ChevronDown, ChevronRight, Settings,
  Building, User, Link as LinkIcon, Bot, BarChart3, FileText, Mail,
  Bell, Clock, Zap, ArrowDown,
} from 'lucide-react'

interface WorkflowStep {
  action: string
  label?: string
  config?: Record<string, unknown>
  condition?: string
}

interface ActionDef {
  name: string
  label: string
  description: string
  category: string
  icon: string
  configFields: Array<{ key: string; label: string; type: string; options?: string[] }>
}

interface WorkflowDesignerProps {
  steps: WorkflowStep[]
  actions: ActionDef[]
  onChange: (steps: WorkflowStep[]) => void
}

const ICONS: Record<string, React.ReactNode> = {
  Building: <Building className="h-4 w-4" />,
  User: <User className="h-4 w-4" />,
  Link: <LinkIcon className="h-4 w-4" />,
  Bot: <Bot className="h-4 w-4" />,
  BarChart3: <BarChart3 className="h-4 w-4" />,
  FileText: <FileText className="h-4 w-4" />,
  Mail: <Mail className="h-4 w-4" />,
  Bell: <Bell className="h-4 w-4" />,
  Settings: <Settings className="h-4 w-4" />,
  Clock: <Clock className="h-4 w-4" />,
}

const CATEGORY_COLORS: Record<string, string> = {
  data: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
  ai: 'border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20',
  communication: 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20',
  logic: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20',
}

const CATEGORY_LABELS: Record<string, string> = {
  data: 'Daten',
  ai: 'KI',
  communication: 'Kommunikation',
  logic: 'Logik',
}

export function WorkflowDesigner({ steps, actions, onChange }: WorkflowDesignerProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const addStep = (actionName: string) => {
    const def = actions.find(a => a.name === actionName)
    onChange([...steps, { action: actionName, label: def?.label || actionName, config: {} }])
    setExpandedStep(steps.length) // Expand the new step
  }

  const removeStep = (idx: number) => {
    onChange(steps.filter((_, i) => i !== idx))
    if (expandedStep === idx) setExpandedStep(null)
  }

  const moveStep = (from: number, to: number) => {
    if (from === to) return
    const newSteps = [...steps]
    const [moved] = newSteps.splice(from, 1)
    newSteps.splice(to, 0, moved)
    onChange(newSteps)
    setExpandedStep(to)
  }

  const updateStep = (idx: number, update: Partial<WorkflowStep>) => {
    const newSteps = [...steps]
    newSteps[idx] = { ...newSteps[idx], ...update }
    onChange(newSteps)
  }

  const handleDragStart = (idx: number) => {
    setDragIdx(idx)
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setDragOverIdx(idx)
  }

  const handleDrop = (idx: number) => {
    if (dragIdx !== null && dragIdx !== idx) {
      moveStep(dragIdx, idx)
    }
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
    setDragOverIdx(null)
  }

  // Group actions by category for the add menu
  const categories = [...new Set(actions.map(a => a.category))]

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Trigger Node */}
      <div className="flex justify-center">
        <div className="rounded-full bg-primary px-6 py-2 text-primary-foreground text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Trigger ausgelöst
        </div>
      </div>

      {/* Steps */}
      {steps.map((step, idx) => {
        const def = actions.find(a => a.name === step.action)
        const catColor = CATEGORY_COLORS[def?.category || 'logic'] || CATEGORY_COLORS.logic
        const isExpanded = expandedStep === idx
        const isDragging = dragIdx === idx
        const isDragOver = dragOverIdx === idx && dragIdx !== idx

        return (
          <div key={idx}>
            {/* Connector Line */}
            <div className="flex justify-center py-1">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Step Node */}
            <div
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              className={`rounded-lg border-l-4 border transition-all ${catColor} ${
                isDragging ? 'opacity-50 scale-95' : ''
              } ${isDragOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            >
              {/* Step Header */}
              <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => setExpandedStep(isExpanded ? null : idx)}>
                <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" onMouseDown={e => e.stopPropagation()}>
                  <GripVertical className="h-4 w-4" />
                </div>

                <div className="shrink-0 h-8 w-8 rounded-lg bg-background flex items-center justify-center border text-sm font-bold text-muted-foreground">
                  {idx + 1}
                </div>

                <div className="shrink-0">
                  {ICONS[def?.icon || ''] || <Settings className="h-4 w-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{step.label || def?.label || step.action}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {CATEGORY_LABELS[def?.category || ''] || def?.category}
                    </Badge>
                  </div>
                  {step.condition && (
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                      wenn: {step.condition}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); removeStep(idx) }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {/* Expanded Config */}
              {isExpanded && (
                <div className="border-t px-4 py-3 space-y-3 bg-background/50">
                  <div className="text-xs text-muted-foreground">{def?.description}</div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Label</Label>
                      <Input
                        className="h-8 text-sm"
                        value={step.label || ''}
                        onChange={e => updateStep(idx, { label: e.target.value })}
                        placeholder={def?.label}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bedingung</Label>
                      <Input
                        className="h-8 text-sm font-mono"
                        value={step.condition || ''}
                        onChange={e => updateStep(idx, { condition: e.target.value })}
                        placeholder="z.B. data.company != null"
                      />
                    </div>
                  </div>

                  {def?.configFields && def.configFields.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Konfiguration</div>
                      {def.configFields.map(field => (
                        <div key={field.key} className="space-y-1">
                          <Label className="text-xs">{field.label}</Label>
                          {field.type === 'select' && field.options ? (
                            <Select
                              value={String((step.config || {})[field.key] || '')}
                              onValueChange={v => updateStep(idx, { config: { ...(step.config || {}), [field.key]: v } })}
                            >
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {field.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              className="h-8 text-sm"
                              type={field.type === 'number' ? 'number' : 'text'}
                              value={String((step.config || {})[field.key] || '')}
                              onChange={e => updateStep(idx, { config: { ...(step.config || {}), [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value } })}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Add Step */}
      <div className="flex justify-center py-1">
        <ArrowDown className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="rounded-lg border-2 border-dashed p-4">
        <div className="text-sm font-medium text-center text-muted-foreground mb-3">
          <Plus className="h-4 w-4 inline mr-1" />Schritt hinzufügen
        </div>
        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {CATEGORY_LABELS[cat] || cat}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {actions.filter(a => a.category === cat).map(a => (
                  <button
                    key={a.name}
                    onClick={() => addStep(a.name)}
                    className="flex items-center gap-2 rounded-lg border p-2 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <span className="shrink-0">{ICONS[a.icon] || <Settings className="h-4 w-4" />}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-xs">{a.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{a.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

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
  )
}
