'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Workflow, Plus, Loader2, Pencil, Trash2, Play, Pause, Eye, ChevronRight,
  CheckCircle2, XCircle, Clock, AlertCircle, Bot, Mail, Building, User,
  Link as LinkIcon, BarChart3, FileText, Bell, Settings, ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface WorkflowItem {
  id: string
  name: string
  description: string | null
  trigger: string
  steps: Array<{ action: string; label?: string; config?: Record<string, unknown>; condition?: string }>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface WorkflowRun {
  id: string
  status: string
  currentStep: number
  totalSteps: number
  stepResults: Array<{ step: number; action: string; label?: string; status: string; error?: string; durationMs: number }>
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

const TRIGGER_LABELS: Record<string, string> = {
  'contact.submitted': 'Kontaktformular abgesendet',
  'lead.created': 'Lead erstellt',
  'lead.scored': 'Lead bewertet',
  'lead.status_changed': 'Lead-Status geändert',
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
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

const RUN_STATUS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  running: { label: 'Läuft', icon: <Loader2 className="h-3 w-3 animate-spin" />, color: 'text-blue-600' },
  completed: { label: 'Erledigt', icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-green-600' },
  failed: { label: 'Fehler', icon: <AlertCircle className="h-3 w-3" />, color: 'text-red-600' },
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([])
  const [actions, setActions] = useState<ActionDef[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [editWorkflow, setEditWorkflow] = useState<WorkflowItem | null>(null)
  const [newName, setNewName] = useState('')
  const [newTrigger, setNewTrigger] = useState('contact.submitted')

  const fetchWorkflows = useCallback(async () => {
    try {
      const [wfRes, actRes] = await Promise.all([
        fetch('/api/v1/workflows'),
        fetch('/api/v1/workflows/actions'),
      ])
      const wfData = await wfRes.json()
      const actData = await actRes.json()
      if (wfData.success) setWorkflows(wfData.data)
      if (actData.success) setActions(actData.data)
    } catch {
      toast.error('Workflows konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWorkflows() }, [fetchWorkflows])

  const fetchRuns = async (workflowId: string) => {
    try {
      const res = await fetch(`/api/v1/workflows/${workflowId}/runs`)
      const data = await res.json()
      if (data.success) setRuns(data.data)
    } catch { /* ignore */ }
  }

  const selectWorkflow = (id: string) => {
    setSelectedId(id === selectedId ? null : id)
    if (id !== selectedId) fetchRuns(id)
  }

  const createWorkflow = async () => {
    if (!newName.trim()) return
    try {
      const res = await fetch('/api/v1/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, trigger: newTrigger, steps: [] }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Workflow erstellt')
        setShowCreate(false)
        setNewName('')
        fetchWorkflows()
      }
    } catch {
      toast.error('Fehler beim Erstellen')
    }
  }

  const toggleActive = async (wf: WorkflowItem) => {
    try {
      await fetch(`/api/v1/workflows/${wf.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !wf.isActive }),
      })
      fetchWorkflows()
    } catch {
      toast.error('Fehler beim Ändern')
    }
  }

  const deleteWorkflow = async (id: string) => {
    if (!confirm('Workflow wirklich löschen?')) return
    try {
      await fetch(`/api/v1/workflows/${id}`, { method: 'DELETE' })
      toast.success('Workflow gelöscht')
      if (selectedId === id) setSelectedId(null)
      fetchWorkflows()
    } catch {
      toast.error('Fehler beim Löschen')
    }
  }

  const saveSteps = async () => {
    if (!editWorkflow) return
    try {
      await fetch(`/api/v1/workflows/${editWorkflow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editWorkflow.name,
          description: editWorkflow.description,
          trigger: editWorkflow.trigger,
          steps: editWorkflow.steps,
        }),
      })
      toast.success('Workflow gespeichert')
      setEditWorkflow(null)
      fetchWorkflows()
    } catch {
      toast.error('Fehler beim Speichern')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  const selected = workflows.find(w => w.id === selectedId)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Workflow className="h-8 w-8" />
            Workflows
          </h1>
          <p className="text-muted-foreground mt-1">Automatisierungen konfigurieren und verwalten</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />Neuer Workflow
        </Button>
      </div>

      <div className="grid md:grid-cols-[1fr_1.5fr] gap-6">
        {/* Workflow List */}
        <div className="space-y-2">
          {workflows.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Noch keine Workflows</CardContent></Card>
          ) : workflows.map(wf => (
            <Card
              key={wf.id}
              className={`cursor-pointer transition-all ${selectedId === wf.id ? 'ring-2 ring-primary' : 'hover:border-primary/30'}`}
              onClick={() => selectWorkflow(wf.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{wf.name}</span>
                      <Badge variant={wf.isActive ? 'default' : 'secondary'} className="text-xs shrink-0">
                        {wf.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {TRIGGER_LABELS[wf.trigger] || wf.trigger} · {wf.steps.length} Schritte
                    </p>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${selectedId === wf.id ? 'rotate-90' : ''}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detail Panel */}
        <div>
          {!selected ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Wählen Sie einen Workflow</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{selected.name}</h2>
                    {selected.description && <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      Trigger: <Badge variant="outline" className="text-xs ml-1">{TRIGGER_LABELS[selected.trigger] || selected.trigger}</Badge>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleActive(selected)} title={selected.isActive ? 'Deaktivieren' : 'Aktivieren'}>
                      {selected.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditWorkflow({ ...selected })} title="Bearbeiten">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteWorkflow(selected.id)} title="Löschen">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Steps */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Schritte</h3>
                  <div className="space-y-2">
                    {selected.steps.map((step, i) => {
                      const actionDef = actions.find(a => a.name === step.action)
                      return (
                        <div key={i} className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                          <div className="shrink-0 h-8 w-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground border">
                            <span className="text-xs font-bold">{i + 1}</span>
                          </div>
                          <div className="shrink-0">{ACTION_ICONS[actionDef?.icon || ''] || <Settings className="h-4 w-4" />}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{step.label || actionDef?.label || step.action}</div>
                            {step.condition && <div className="text-xs text-muted-foreground">Bedingung: {step.condition}</div>}
                          </div>
                          {i < selected.steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Run History */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Letzte Ausführungen</h3>
                  {runs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Noch keine Ausführungen</p>
                  ) : (
                    <div className="space-y-2">
                      {runs.slice(0, 10).map(run => {
                        const rs = RUN_STATUS[run.status] || RUN_STATUS.completed
                        const okSteps = run.stepResults.filter((r: { status: string }) => r.status === 'completed').length
                        return (
                          <div key={run.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                            <span className={rs.color}>{rs.icon}</span>
                            <span className="font-medium">{rs.label}</span>
                            <span className="text-muted-foreground">{okSteps}/{run.totalSteps} Schritte</span>
                            {run.error && <span className="text-xs text-destructive truncate">{run.error}</span>}
                            <span className="ml-auto text-xs text-muted-foreground">
                              {new Date(run.startedAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neuer Workflow</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="z.B. Lead Kontaktformular" />
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select value={newTrigger} onValueChange={setNewTrigger}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Abbrechen</Button>
            <Button onClick={createWorkflow} disabled={!newName.trim()}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Steps Dialog */}
      <Dialog open={!!editWorkflow} onOpenChange={open => { if (!open) setEditWorkflow(null) }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Workflow bearbeiten: {editWorkflow?.name}</DialogTitle></DialogHeader>
          {editWorkflow && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={editWorkflow.name} onChange={e => setEditWorkflow({ ...editWorkflow, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Trigger</Label>
                  <Select value={editWorkflow.trigger} onValueChange={v => setEditWorkflow({ ...editWorkflow, trigger: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea value={editWorkflow.description || ''} onChange={e => setEditWorkflow({ ...editWorkflow, description: e.target.value })} rows={2} />
              </div>

              {/* Steps Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Schritte ({editWorkflow.steps.length})</Label>
                  <Select onValueChange={actionName => {
                    const def = actions.find(a => a.name === actionName)
                    setEditWorkflow({
                      ...editWorkflow,
                      steps: [...editWorkflow.steps, { action: actionName, label: def?.label || actionName, config: {} }],
                    })
                  }}>
                    <SelectTrigger className="w-[220px]"><SelectValue placeholder="Schritt hinzufügen..." /></SelectTrigger>
                    <SelectContent>
                      {actions.map(a => (
                        <SelectItem key={a.name} value={a.name}>
                          <span className="flex items-center gap-2">
                            {ACTION_ICONS[a.icon] || <Settings className="h-3 w-3" />}
                            {a.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {editWorkflow.steps.map((step, i) => {
                  const def = actions.find(a => a.name === step.action)
                  return (
                    <div key={i} className="rounded-lg border p-4 space-y-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">{i + 1}.</span>
                          {ACTION_ICONS[def?.icon || ''] || <Settings className="h-4 w-4" />}
                          <span className="font-medium text-sm">{step.label || def?.label || step.action}</span>
                        </div>
                        <div className="flex gap-1">
                          {i > 0 && <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            const s = [...editWorkflow.steps]; [s[i-1], s[i]] = [s[i], s[i-1]]; setEditWorkflow({ ...editWorkflow, steps: s })
                          }}>↑</Button>}
                          {i < editWorkflow.steps.length - 1 && <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            const s = [...editWorkflow.steps]; [s[i], s[i+1]] = [s[i+1], s[i]]; setEditWorkflow({ ...editWorkflow, steps: s })
                          }}>↓</Button>}
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                            setEditWorkflow({ ...editWorkflow, steps: editWorkflow.steps.filter((_, idx) => idx !== i) })
                          }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Label</Label>
                          <Input className="h-8 text-sm" value={step.label || ''} onChange={e => {
                            const s = [...editWorkflow.steps]; s[i] = { ...s[i], label: e.target.value }; setEditWorkflow({ ...editWorkflow, steps: s })
                          }} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Bedingung</Label>
                          <Input className="h-8 text-sm font-mono" value={step.condition || ''} onChange={e => {
                            const s = [...editWorkflow.steps]; s[i] = { ...s[i], condition: e.target.value }; setEditWorkflow({ ...editWorkflow, steps: s })
                          }} placeholder="z.B. data.company != null" />
                        </div>
                      </div>
                      {def?.configFields && def.configFields.length > 0 && (
                        <div className="space-y-2">
                          {def.configFields.map(field => (
                            <div key={field.key} className="space-y-1">
                              <Label className="text-xs">{field.label}</Label>
                              <Input className="h-8 text-sm" value={String((step.config || {})[field.key] || '')} onChange={e => {
                                const s = [...editWorkflow.steps]; s[i] = { ...s[i], config: { ...(s[i].config || {}), [field.key]: e.target.value } }; setEditWorkflow({ ...editWorkflow, steps: s })
                              }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditWorkflow(null)}>Abbrechen</Button>
            <Button onClick={saveSteps}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
