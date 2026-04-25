'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Loader2, Play, Pause, CheckCircle2, AlertCircle, Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { WorkflowDesigner } from '../_components/workflow-designer'
import type { WorkflowStep } from '../_components/types'
import { TRIGGER_LABELS, WORKFLOW_TRIGGERS } from '@/lib/services/workflow/triggers'

interface WorkflowData {
  id: string
  name: string
  description: string | null
  trigger: string
  steps: WorkflowStep[]
  isActive: boolean
}

interface StepResultEntry {
  step: number
  path?: string
  action: string
  kind?: 'action' | 'branch' | 'parallel'
  label?: string
  status: string
  result?: { taken?: 'then' | 'else' | 'none'; ranSubSteps?: number; failedCount?: number } & Record<string, unknown>
  error?: string
  durationMs: number
}

interface WorkflowRun {
  id: string
  status: string
  currentStep: number
  totalSteps: number
  stepResults: StepResultEntry[]
  error: string | null
  startedAt: string
  completedAt: string | null
}

interface ActionDef {
  name: string
  label: string
  description: string
  category: string
  icon: string
  configFields: Array<{ key: string; label: string; type: string; options?: string[] }>
}

const RUN_STATUS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  running: { label: 'Läuft', icon: <Loader2 className="h-3 w-3 animate-spin" />, color: 'text-blue-600' },
  completed: { label: 'Erledigt', icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-green-600' },
  failed: { label: 'Fehler', icon: <AlertCircle className="h-3 w-3" />, color: 'text-red-600' },
}

export default function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null)
  const [actions, setActions] = useState<ActionDef[]>([])
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [wfRes, actRes, runsRes] = await Promise.all([
        fetch(`/api/v1/workflows/${id}`),
        fetch('/api/v1/workflows/actions'),
        fetch(`/api/v1/workflows/${id}/runs`),
      ])
      const wfData = await wfRes.json()
      const actData = await actRes.json()
      const runsData = await runsRes.json()
      if (wfData.success) setWorkflow(wfData.data)
      if (actData.success) setActions(actData.data)
      if (runsData.success) setRuns(runsData.data)
    } catch {
      toast.error('Workflow konnte nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  const save = async () => {
    if (!workflow) return
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/workflows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workflow.name,
          description: workflow.description,
          trigger: workflow.trigger,
          steps: workflow.steps,
          isActive: workflow.isActive,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Workflow gespeichert')
        setHasChanges(false)
      }
    } catch {
      toast.error('Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  const update = (changes: Partial<WorkflowData>) => {
    if (!workflow) return
    setWorkflow({ ...workflow, ...changes })
    setHasChanges(true)
  }

  if (loading || !workflow) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/intern/settings/workflows">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{workflow.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={workflow.isActive ? 'default' : 'secondary'}>
                {workflow.isActive ? 'Aktiv' : 'Inaktiv'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {TRIGGER_LABELS[workflow.trigger] || workflow.trigger} · {workflow.steps.length} Schritte
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => update({ isActive: !workflow.isActive })}
          >
            {workflow.isActive ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {workflow.isActive ? 'Deaktivieren' : 'Aktivieren'}
          </Button>
          <Button onClick={save} disabled={saving || !hasChanges}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Speichern
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_350px] gap-6">
        {/* Designer */}
        <div className="space-y-6">
          {/* Workflow Settings */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={workflow.name} onChange={e => update({ name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Trigger</Label>
                  <Select value={workflow.trigger} onValueChange={v => update({ trigger: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(() => {
                    const def = WORKFLOW_TRIGGERS.find(t => t.key === workflow.trigger)
                    if (!def) return null
                    return (
                      <p className="text-xs text-muted-foreground mt-1">
                        {def.description}
                        {def.dataShape && def.dataShape.length > 0 && (
                          <>
                            {' '}Verfügbar in <code>{'{{data.*}}'}</code>:
                            {def.dataShape.map(f => (
                              <code key={f} className="ml-1">{f}</code>
                            ))}
                          </>
                        )}
                      </p>
                    )
                  })()}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea
                  value={workflow.description || ''}
                  onChange={e => update({ description: e.target.value })}
                  rows={2}
                  placeholder="Optional: Was macht dieser Workflow?"
                />
              </div>
            </CardContent>
          </Card>

          {/* Visual Designer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workflow-Schritte</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkflowDesigner
                steps={workflow.steps}
                actions={actions}
                onChange={steps => update({ steps })}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Run History */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Ausführungen
                <Button variant="ghost" size="sm" onClick={fetchData}>
                  <Clock className="h-3 w-3 mr-1" />Aktualisieren
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {runs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Noch keine Ausführungen</p>
              ) : runs.slice(0, 20).map(run => {
                const rs = RUN_STATUS[run.status] || RUN_STATUS.completed
                const okSteps = (run.stepResults as Array<{ status: string }>).filter(r => r.status === 'completed').length
                const failedSteps = (run.stepResults as Array<{ status: string }>).filter(r => r.status === 'failed').length
                const duration = run.completedAt
                  ? Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
                  : null

                return (
                  <div key={run.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={rs.color}>{rs.icon}</span>
                        <span className="text-sm font-medium">{rs.label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(run.startedAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="text-green-600">{okSteps} OK</span>
                      {failedSteps > 0 && <span className="text-red-600">{failedSteps} Fehler</span>}
                      <span>{run.totalSteps} Schritte</span>
                      {duration !== null && <span>{duration}s</span>}
                    </div>
                    {run.error && (
                      <div className="text-xs text-destructive bg-destructive/10 rounded p-2">{run.error}</div>
                    )}
                    {/* Step details */}
                    <div className="space-y-1">
                      {run.stepResults.map((sr, i) => {
                        const depth = sr.path ? Math.max(0, sr.path.split('.').length - 1) : 0
                        const indent = depth * 12
                        const kind = sr.kind ?? 'action'
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs" style={{ paddingLeft: indent }}>
                            {sr.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />}
                            {sr.status === 'failed' && <AlertCircle className="h-3 w-3 text-red-600 shrink-0" />}
                            {sr.status === 'skipped' && <Clock className="h-3 w-3 text-muted-foreground shrink-0" />}
                            {kind === 'branch' && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                Verzweigung → {sr.result?.taken ?? '?'}
                              </Badge>
                            )}
                            {kind === 'parallel' && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                Parallel ({sr.result?.ranSubSteps ?? 0}
                                {(sr.result?.failedCount ?? 0) > 0 ? `, ${sr.result?.failedCount} fail` : ''})
                              </Badge>
                            )}
                            <span className={sr.status === 'failed' ? 'text-destructive truncate' : 'text-muted-foreground truncate'}>
                              {sr.label || (kind === 'action' ? sr.action : '')}
                            </span>
                            <span className="text-muted-foreground/50 ml-auto shrink-0">{sr.durationMs}ms</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
