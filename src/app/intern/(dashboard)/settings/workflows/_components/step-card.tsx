'use client'

import { createContext, useContext, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Trash2, ChevronDown, ChevronRight, Settings, ChevronUp,
  Building, User, Link as LinkIcon, Bot, BarChart3, FileText, Mail,
  Bell, Clock, Sparkles,
} from 'lucide-react'
import type { ActionStep, ActionDefinition, WorkflowStep, BranchStep, ParallelStep, ForEachStep } from './types'
import { BranchStepEditor } from './branch-step-editor'
import { ParallelStepEditor } from './parallel-step-editor'
import { ForEachStepEditor } from './for-each-step-editor'

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
  Sparkles: <Sparkles className="h-4 w-4" />,
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

export const CustomPromptsContext = createContext<Array<{ id: string; name: string }>>([])

export function shortId(): string {
  return crypto.randomUUID().slice(0, 8)
}

export function makeActionStep(actionName: string, label?: string): WorkflowStep {
  return { id: shortId(), kind: 'action', action: actionName, label, config: {} }
}

export function makeBranchStep(): BranchStep {
  return { id: shortId(), kind: 'branch', ifCondition: '', then: [] }
}

export function makeParallelStep(): ParallelStep {
  return { id: shortId(), kind: 'parallel', steps: [] }
}

export function makeForEachStep(): ForEachStep {
  return { id: shortId(), kind: 'for_each', source: '', steps: [] }
}

export interface StepCardProps {
  step: WorkflowStep
  index: number
  totalSteps: number
  actions: ActionDefinition[]
  onChange: (step: WorkflowStep) => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

function StepHeader({
  index, label, badge, badgeColor, icon, condition,
  onDelete, onMoveUp, onMoveDown,
  expanded, onToggleExpand,
}: {
  index: number
  label: string
  badge?: string
  badgeColor?: string
  icon?: React.ReactNode
  condition?: string
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  expanded?: boolean
  onToggleExpand?: () => void
}) {
  return (
    <div className="flex items-center gap-2 p-3">
      <div className="shrink-0 h-8 w-8 rounded-lg bg-background flex items-center justify-center border text-sm font-bold text-muted-foreground">
        {index + 1}
      </div>
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{label}</span>
          {badge && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{badge}</Badge>}
        </div>
        {condition && (
          <div className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
            wenn: {condition}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!onMoveUp} onClick={() => onMoveUp?.()} title="Nach oben">
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!onMoveDown} onClick={() => onMoveDown?.()} title="Nach unten">
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete} title="Löschen">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        {onToggleExpand && (
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand}>
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  )
}

function ActionStepBody(props: StepCardProps) {
  const step = props.step as ActionStep
  const [expanded, setExpanded] = useState(false)
  const customPrompts = useContext(CustomPromptsContext)
  const def = props.actions.find(a => a.name === step.action)
  const catColor = CATEGORY_COLORS[def?.category || 'logic'] || CATEGORY_COLORS.logic

  const update = (patch: Partial<ActionStep>) => {
    props.onChange({ ...step, ...patch } as WorkflowStep)
  }

  return (
    <div className={`rounded-lg border-l-4 border ${catColor}`}>
      <StepHeader
        index={props.index}
        label={step.label || def?.label || step.action}
        badge={CATEGORY_LABELS[def?.category || ''] || def?.category}
        icon={ICONS[def?.icon || ''] || <Settings className="h-4 w-4" />}
        condition={step.condition}
        onDelete={props.onDelete}
        onMoveUp={props.onMoveUp}
        onMoveDown={props.onMoveDown}
        expanded={expanded}
        onToggleExpand={() => setExpanded(e => !e)}
      />

      {expanded && (
        <div className="border-t px-4 py-3 space-y-3 bg-background/50">
          <div className="text-xs text-muted-foreground">{def?.description}</div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input
                className="h-8 text-sm"
                value={step.label || ''}
                onChange={e => update({ label: e.target.value })}
                placeholder={def?.label}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bedingung</Label>
              <Input
                className="h-8 text-sm font-mono"
                value={step.condition || ''}
                onChange={e => update({ condition: e.target.value })}
                placeholder="z.B. data.company != null"
              />
            </div>
          </div>

          {def?.configFields && def.configFields.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Konfiguration</div>
              {def.configFields.map(field => {
                const currentVal = (step.config || {})[field.key]
                const setVal = (v: unknown) => update({ config: { ...(step.config || {}), [field.key]: v } })

                return (
                  <div key={field.key} className="space-y-1">
                    {field.type !== 'boolean' && <Label className="text-xs">{field.label}</Label>}
                    {field.type === 'select' && field.options ? (
                      <Select value={String(currentVal || '')} onValueChange={setVal}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {field.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : field.type === 'custom_prompt' ? (
                      <Select value={String(currentVal || '')} onValueChange={setVal}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={customPrompts.length === 0 ? 'Noch keine eigenen Prompts angelegt' : 'Prompt auswählen...'} />
                        </SelectTrigger>
                        <SelectContent>
                          {customPrompts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : field.type === 'boolean' ? (
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={currentVal !== false}
                          onCheckedChange={v => setVal(!!v)}
                        />
                        {field.label}
                      </label>
                    ) : (
                      <Input
                        className="h-8 text-sm"
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={String(currentVal || '')}
                        onChange={e => setVal(field.type === 'number' ? Number(e.target.value) : e.target.value)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BranchOrParallelHeader({ index, label, onDelete, onMoveUp, onMoveDown }: {
  index: number
  label: string
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  return (
    <div className="flex items-center justify-end gap-1 px-2 pt-2 -mb-2 relative z-10">
      <span className="text-xs text-muted-foreground mr-auto pl-1">Schritt {index + 1}: {label}</span>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!onMoveUp} onClick={() => onMoveUp?.()} title="Nach oben">
        <ChevronUp className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!onMoveDown} onClick={() => onMoveDown?.()} title="Nach unten">
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete} title="Löschen">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

export function StepCard(props: StepCardProps) {
  const kind = (props.step as { kind?: string }).kind ?? 'action'

  if (kind === 'branch') {
    const bs = props.step as BranchStep
    return (
      <div>
        <BranchOrParallelHeader
          index={props.index}
          label={bs.label || 'Verzweigung'}
          onDelete={props.onDelete}
          onMoveUp={props.onMoveUp}
          onMoveDown={props.onMoveDown}
        />
        <BranchStepEditor
          step={bs}
          actions={props.actions}
          onChange={updated => props.onChange(updated)}
        />
      </div>
    )
  }

  if (kind === 'parallel') {
    const ps = props.step as ParallelStep
    return (
      <div>
        <BranchOrParallelHeader
          index={props.index}
          label={ps.label || 'Parallel'}
          onDelete={props.onDelete}
          onMoveUp={props.onMoveUp}
          onMoveDown={props.onMoveDown}
        />
        <ParallelStepEditor
          step={ps}
          actions={props.actions}
          onChange={updated => props.onChange(updated)}
        />
      </div>
    )
  }

  if (kind === 'for_each') {
    const fes = props.step as ForEachStep
    return (
      <div>
        <BranchOrParallelHeader
          index={props.index}
          label={fes.label || 'Schleife'}
          onDelete={props.onDelete}
          onMoveUp={props.onMoveUp}
          onMoveDown={props.onMoveDown}
        />
        <ForEachStepEditor
          step={fes}
          actions={props.actions}
          onChange={updated => props.onChange(updated)}
        />
      </div>
    )
  }

  return <ActionStepBody {...props} />
}

export { StepHeader }
