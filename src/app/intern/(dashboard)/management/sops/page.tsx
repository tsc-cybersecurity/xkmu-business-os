'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Loader2, Plus, Search, FileText, Clock, Bot, User, Shuffle,
  PanelLeftClose, PanelLeft, Package, ExternalLink, Code2,
  AlertTriangle, Wrench, ListChecks, Zap, CircleDot, Info, Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Link from 'next/link'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================
// Constants
// ============================================
const STATUS_LABELS: Record<string, string> = { draft: 'Entwurf', review: 'Review', approved: 'Freigegeben', archived: 'Archiviert' }
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700', archived: 'bg-red-100 text-red-700',
}
const AUTOMATION_LABELS: Record<string, string> = { manual: 'Manuell', semi: 'Semi-Auto', full: 'Vollautomatisch' }
const AUTOMATION_COLORS: Record<string, string> = {
  manual: 'bg-gray-100 text-gray-700', semi: 'bg-blue-100 text-blue-700', full: 'bg-purple-100 text-purple-700',
}
const MATURITY_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-700', 2: 'bg-orange-100 text-orange-700', 3: 'bg-yellow-100 text-yellow-700',
  4: 'bg-blue-100 text-blue-700', 5: 'bg-green-100 text-green-700',
}
const MATURITY_LABELS: Record<number, string> = {
  1: 'Dokumentiert', 2: 'Strukturiert', 3: 'KI-unterstuetzt', 4: 'KI-gesteuert', 5: 'Selbstoptimierend',
}
const EXECUTOR_ICONS: Record<string, typeof Bot> = { agent: Bot, human: User, flex: Shuffle }

const APP_STATUS_LABELS: Record<string, string> = { full: 'App: Voll', partial: 'App: Teilweise', none: 'App: Fehlt' }
const APP_STATUS_COLORS: Record<string, string> = {
  full: 'bg-green-100 text-green-700',
  partial: 'bg-amber-100 text-amber-700',
  none: 'bg-red-100 text-red-700',
}
const APP_STATUS_DOT: Record<string, string> = {
  full: 'bg-green-500', partial: 'bg-amber-500', none: 'bg-red-500',
}

// ============================================
// Types
// ============================================
type ConsolidatedRow = {
  kind: 'sop' | 'task-only'
  sopId: string | null
  taskId: string | null
  taskKey: string | null
  title: string
  category: string | null
  subprocess: string | null
  processKey: string | null
  processName: string | null
  status: string | null
  version: string | null
  automationLevel: string | null
  aiCapable: boolean | null
  maturityLevel: number | null
  estimatedDurationMinutes: number | null
  appStatus: string | null
  appModule: string | null
  appNotes: string | null
  devRequirementCount: number
  coverage: 'automated' | 'progress' | 'gap'
  updatedAt: string | null
}

// ============================================
// SOP Detail (extended: Prozess-Kontext + Dev-Requirements)
// ============================================
function SopDetail({ sop, onSaved, allDeliverables }: {
  sop: any
  onSaved: () => void
  allDeliverables: Array<{ id: string; name: string; moduleCode?: string | null }>
}) {
  const s = sop
  const steps: any[] = s.steps || []
  const task = s.linkedTask
  const proc = s.linkedProcess
  const devReqs: any[] = Array.isArray(task?.devRequirements) ? task.devRequirements : []

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})

  function startEdit() {
    setForm({
      title: s.title ?? '',
      purpose: s.purpose ?? '',
      scope: s.scope ?? '',
      status: s.status ?? 'draft',
      automationLevel: s.automationLevel ?? '',
      aiCapable: !!s.aiCapable,
      maturityLevel: s.maturityLevel ?? '',
      estimatedDurationMinutes: s.estimatedDurationMinutes ?? '',
      producesDeliverableId: s.producesDeliverableId ?? '',
      subprocess: s.subprocess ?? '',
    })
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    const payload: Record<string, any> = {
      title: form.title,
      purpose: form.purpose || null,
      scope: form.scope || null,
      status: form.status,
      automationLevel: form.automationLevel || null,
      aiCapable: !!form.aiCapable,
      maturityLevel: form.maturityLevel === '' ? null : Number(form.maturityLevel),
      estimatedDurationMinutes: form.estimatedDurationMinutes === '' ? null : Number(form.estimatedDurationMinutes),
      producesDeliverableId: form.producesDeliverableId || null,
      subprocess: form.subprocess || null,
    }
    const res = await fetch(`/api/v1/sops/${s.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const d = await res.json()
    setSaving(false)
    if (d.success) {
      toast.success('SOP gespeichert')
      setEditing(false)
      onSaved()
    } else {
      toast.error('Speichern fehlgeschlagen')
    }
  }

  return (
    <div className="space-y-6">
      {/* Edit-Toolbar */}
      <div className="flex items-center justify-end gap-2">
        {!editing ? (
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1" />Bearbeiten
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>Abbrechen</Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}Speichern
            </Button>
          </>
        )}
      </div>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          {s.source_task_id || s.sourceTaskId}
          {proc && <span className="text-muted-foreground"> · {proc.key} {proc.name}</span>}
        </div>
        {editing ? (
          <Input
            value={form.title ?? ''}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="text-2xl font-bold h-auto py-1"
          />
        ) : (
          <h1 className="text-2xl font-bold">{s.title}</h1>
        )}
        {editing ? (
          <Input
            value={form.subprocess ?? ''}
            onChange={(e) => setForm({ ...form, subprocess: e.target.value })}
            placeholder="Subprocess (optional)"
            className="text-sm h-8"
          />
        ) : (
          s.subprocess && <p className="text-sm text-muted-foreground">{s.subprocess}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">{s.category}</Badge>
          <Badge className={cn('text-xs', STATUS_COLORS[s.status])}>{STATUS_LABELS[s.status] || s.status}</Badge>
          {s.automation_level && (
            <Badge className={cn('text-xs', AUTOMATION_COLORS[s.automation_level])}>
              {AUTOMATION_LABELS[s.automation_level]}
            </Badge>
          )}
          {s.maturity_level && (
            <Badge className={cn('text-xs', MATURITY_COLORS[s.maturity_level as number])}>
              Reife {s.maturity_level}/5 — {MATURITY_LABELS[s.maturity_level as number]}
            </Badge>
          )}
          {s.estimated_duration_minutes && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />{s.estimated_duration_minutes} Min
            </Badge>
          )}
          {s.ai_capable && (
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
              <Bot className="h-3 w-3 mr-1" />KI-faehig
            </Badge>
          )}
          {task?.appStatus && (
            <Badge className={cn('text-xs', APP_STATUS_COLORS[task.appStatus])}>
              {APP_STATUS_LABELS[task.appStatus]}
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Uebersicht</TabsTrigger>
          <TabsTrigger value="steps">Schritte ({steps.length})</TabsTrigger>
          {task && <TabsTrigger value="process">Prozess-Kontext</TabsTrigger>}
          {devReqs.length > 0 && <TabsTrigger value="dev">Dev ({devReqs.length})</TabsTrigger>}
          {s.producesDeliverable && <TabsTrigger value="deliverable">Deliverable</TabsTrigger>}
        </TabsList>

        {/* Uebersicht */}
        <TabsContent value="overview" className="space-y-4">
          {(editing || s.purpose) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Zweck</CardTitle></CardHeader>
              <CardContent>
                {editing ? (
                  <Textarea
                    value={form.purpose ?? ''}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    rows={3}
                    placeholder="Zweck der SOP"
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{s.purpose}</p>
                )}
              </CardContent>
            </Card>
          )}
          {(editing || s.scope) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Geltungsbereich</CardTitle></CardHeader>
              <CardContent>
                {editing ? (
                  <Textarea
                    value={form.scope ?? ''}
                    onChange={(e) => setForm({ ...form, scope: e.target.value })}
                    rows={2}
                    placeholder="Wofuer gilt die SOP?"
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{s.scope}</p>
                )}
              </CardContent>
            </Card>
          )}
          {s.tools?.length > 0 && !editing && (
            <Card>
              <CardHeader><CardTitle className="text-base">Tools</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {s.tools.map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadaten — editierbar */}
          {editing && (
            <Card>
              <CardHeader><CardTitle className="text-base">Metadaten</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Status</label>
                    <Select value={form.status ?? 'draft'} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Entwurf</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="approved">Freigegeben</SelectItem>
                        <SelectItem value="archived">Archiviert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Automation</label>
                    <Select value={form.automationLevel || 'none'} onValueChange={(v) => setForm({ ...form, automationLevel: v === 'none' ? '' : v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— nicht gesetzt —</SelectItem>
                        <SelectItem value="manual">Manuell</SelectItem>
                        <SelectItem value="semi">Semi-Auto</SelectItem>
                        <SelectItem value="full">Vollautomatisch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Reife (1-5)</label>
                    <Select value={String(form.maturityLevel || 'none')} onValueChange={(v) => setForm({ ...form, maturityLevel: v === 'none' ? '' : v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— nicht gesetzt —</SelectItem>
                        {[1, 2, 3, 4, 5].map(l => <SelectItem key={l} value={String(l)}>Reife {l}/5</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Dauer (Min)</label>
                    <Input
                      type="number"
                      value={form.estimatedDurationMinutes ?? ''}
                      onChange={(e) => setForm({ ...form, estimatedDurationMinutes: e.target.value })}
                      className="h-8 text-sm"
                      placeholder="z.B. 30"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="aiCapable"
                    checked={!!form.aiCapable}
                    onChange={(e) => setForm({ ...form, aiCapable: e.target.checked })}
                  />
                  <label htmlFor="aiCapable" className="text-sm">KI-faehig</label>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Verknuepftes Deliverable</label>
                  <Select
                    value={form.producesDeliverableId || 'none'}
                    onValueChange={(v) => setForm({ ...form, producesDeliverableId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Deliverable waehlen" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— keines —</SelectItem>
                      {allDeliverables.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.moduleCode ? `${d.moduleCode} · ` : ''}{d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Version</div>
                <div className="text-sm font-medium">v{s.version}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Zuletzt aktualisiert</div>
                <div className="text-sm font-medium">{new Date(s.updatedAt || s.updated_at).toLocaleDateString('de-DE')}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Schritte */}
        <TabsContent value="steps" className="space-y-2">
          {steps.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Keine Schritte definiert.</p>
          ) : (
            steps.sort((a: any, b: any) => a.sequence - b.sequence).map((step: any) => {
              const ExIcon = step.executor ? EXECUTOR_ICONS[step.executor] || Shuffle : null
              return (
                <Card key={step.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {step.sequence}
                      </span>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{step.title}</p>
                        {step.description && <p className="text-xs text-muted-foreground">{step.description}</p>}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {step.responsible && <Badge variant="outline" className="text-[10px]">{step.responsible}</Badge>}
                          {step.executor && ExIcon && (
                            <Badge variant="outline" className="text-[10px]">
                              <ExIcon className="h-3 w-3 mr-0.5" />{step.executor}
                            </Badge>
                          )}
                          {step.estimated_minutes && (
                            <Badge variant="outline" className="text-[10px]">
                              <Clock className="h-3 w-3 mr-0.5" />{step.estimated_minutes} Min
                            </Badge>
                          )}
                        </div>
                        {step.checklist_items?.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {step.checklist_items.map((item: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <span className="mt-0.5">&#9744;</span>{item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        {/* Prozess-Kontext */}
        {task && (
          <TabsContent value="process" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CircleDot className="h-4 w-4" />App-Abdeckung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  {task.appStatus && (
                    <Badge className={cn('text-xs', APP_STATUS_COLORS[task.appStatus])}>
                      {APP_STATUS_LABELS[task.appStatus]}
                    </Badge>
                  )}
                  {task.appModule && (
                    <span className="text-xs text-muted-foreground font-mono">Modul: {task.appModule}</span>
                  )}
                </div>
                {task.appNotes && (
                  <p className="text-sm whitespace-pre-wrap">{task.appNotes}</p>
                )}
                {!task.appNotes && !task.appStatus && (
                  <p className="text-sm text-muted-foreground italic">Keine App-Abdeckung dokumentiert</p>
                )}
              </CardContent>
            </Card>

            {task.trigger && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" />Trigger</CardTitle></CardHeader>
                <CardContent><p className="text-sm whitespace-pre-wrap">{task.trigger}</p></CardContent>
              </Card>
            )}
            {task.expectedOutput && (
              <Card>
                <CardHeader><CardTitle className="text-base">Erwarteter Output</CardTitle></CardHeader>
                <CardContent><p className="text-sm whitespace-pre-wrap">{task.expectedOutput}</p></CardContent>
              </Card>
            )}
            {task.errorEscalation && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Fehler & Eskalation</CardTitle></CardHeader>
                <CardContent><p className="text-sm whitespace-pre-wrap">{task.errorEscalation}</p></CardContent>
              </Card>
            )}
            {Array.isArray(task.checklist) && task.checklist.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-4 w-4" />Erfolgskontrolle</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {task.checklist.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5">&#9744;</span>{item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Dev-Requirements */}
        {devReqs.length > 0 && (
          <TabsContent value="dev" className="space-y-3">
            {devReqs.map((req: any, i: number) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{req.tool}</span>
                    {req.priority && (
                      <Badge variant="outline" className="text-[10px] ml-auto">Prio: {req.priority}</Badge>
                    )}
                    {req.effort && (
                      <Badge variant="outline" className="text-[10px]">Aufwand: {req.effort}</Badge>
                    )}
                  </div>
                  {req.neededFunction && (
                    <div className="text-sm"><span className="text-muted-foreground">Funktion: </span>{req.neededFunction}</div>
                  )}
                  {req.approach && (
                    <div className="text-sm text-muted-foreground italic">{req.approach}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}

        {/* Deliverable */}
        {s.producesDeliverable && (
          <TabsContent value="deliverable">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{s.producesDeliverable.name}</p>
                    {s.producesDeliverable.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.producesDeliverable.description}</p>
                    )}
                  </div>
                  <Link href={`/intern/management/deliverables/${s.producesDeliverable.id}`}>
                    <Button variant="outline" size="sm"><ExternalLink className="h-3 w-3 mr-1" />Oeffnen</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// ============================================
// Task-only Detail (Process-Task ohne SOP)
// ============================================
function TaskOnlyDetail({ task, processKey, processName, onCreateSop }: {
  task: any
  processKey: string | null
  processName: string | null
  onCreateSop: () => void
}) {
  const steps: any[] = Array.isArray(task.steps) ? task.steps : []
  const checklist: string[] = Array.isArray(task.checklist) ? task.checklist : []
  const tools: string[] = Array.isArray(task.tools) ? task.tools : []
  const devReqs: any[] = Array.isArray(task.devRequirements) ? task.devRequirements : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          {task.taskKey}
          {processKey && <span> · {processKey} {processName}</span>}
        </div>
        <div className="flex items-start gap-3">
          <h1 className="text-2xl font-bold flex-1">{task.title}</h1>
          <Button onClick={onCreateSop} size="sm" className="shrink-0">
            <Plus className="h-3.5 w-3.5 mr-1" />SOP erstellen
          </Button>
        </div>
        {task.subprocess && <p className="text-sm text-muted-foreground">{task.subprocess}</p>}

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs border-dashed">Keine SOP</Badge>
          {task.appStatus && (
            <Badge className={cn('text-xs', APP_STATUS_COLORS[task.appStatus])}>
              {APP_STATUS_LABELS[task.appStatus]}
            </Badge>
          )}
          {task.timeEstimate && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />{task.timeEstimate}
            </Badge>
          )}
          {task.automationPotential && (
            <Badge variant="outline" className="text-xs">{task.automationPotential}</Badge>
          )}
        </div>
      </div>

      {/* Hint */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-4 flex items-start gap-3 text-sm">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">Diese Aufgabe ist im Prozesshandbuch erfasst, hat aber noch keine ausfuehrbare SOP.</p>
            <p className="text-muted-foreground text-xs">
              Erstelle eine SOP, um Schritte, Verantwortliche, Reife-Level und Versionierung zu hinterlegen.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Process-Task Felder */}
      {task.purpose && (
        <Card>
          <CardHeader><CardTitle className="text-base">Zweck</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{task.purpose}</p></CardContent>
        </Card>
      )}
      {task.trigger && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" />Trigger</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{task.trigger}</p></CardContent>
        </Card>
      )}
      {tools.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4" />Tools</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tools.map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}
            </div>
          </CardContent>
        </Card>
      )}
      {steps.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Schritte</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {steps.map((s: any, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{s.nr ?? i + 1}</span>
                  <div className="flex-1">
                    <div>{s.action}</div>
                    {s.tool && <div className="text-xs text-muted-foreground mt-0.5">Tool: {s.tool}</div>}
                    {s.hint && <div className="text-xs text-muted-foreground italic mt-0.5">{s.hint}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
      {checklist.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-4 w-4" />Erfolgskontrolle</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {checklist.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5">&#9744;</span>{item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      {task.expectedOutput && (
        <Card>
          <CardHeader><CardTitle className="text-base">Erwarteter Output</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{task.expectedOutput}</p></CardContent>
        </Card>
      )}
      {task.errorEscalation && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Fehler & Eskalation</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{task.errorEscalation}</p></CardContent>
        </Card>
      )}

      {/* App-Coverage */}
      {(task.appStatus || task.appNotes || task.appModule) && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CircleDot className="h-4 w-4" />App-Abdeckung</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3">
              {task.appStatus && (
                <Badge className={cn('text-xs', APP_STATUS_COLORS[task.appStatus])}>
                  {APP_STATUS_LABELS[task.appStatus]}
                </Badge>
              )}
              {task.appModule && (
                <span className="text-xs text-muted-foreground font-mono">Modul: {task.appModule}</span>
              )}
            </div>
            {task.appNotes && <p className="text-sm whitespace-pre-wrap">{task.appNotes}</p>}
          </CardContent>
        </Card>
      )}

      {/* Dev-Requirements */}
      {devReqs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Code2 className="h-4 w-4" />Dev-Requirements</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {devReqs.map((req: any, i: number) => (
              <div key={i} className="border-l-2 border-muted pl-3 py-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{req.tool}</span>
                  {req.priority && <Badge variant="outline" className="text-[10px]">Prio: {req.priority}</Badge>}
                  {req.effort && <Badge variant="outline" className="text-[10px]">Aufwand: {req.effort}</Badge>}
                </div>
                {req.neededFunction && <div className="text-sm"><span className="text-muted-foreground">Funktion: </span>{req.neededFunction}</div>}
                {req.approach && <div className="text-sm text-muted-foreground italic">{req.approach}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================
// Main Page
// ============================================
export default function SopsPage() {
  const [rows, setRows] = useState<ConsolidatedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [processFilter, setProcessFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [automationFilter, setAutomationFilter] = useState<'all' | 'automated' | 'progress' | 'gap'>('all')
  const [maturityFilter, setMaturityFilter] = useState('all')

  // Layout
  const [showSidebar, setShowSidebar] = useState(true)
  const [selected, setSelected] = useState<{ kind: 'sop' | 'task-only'; id: string } | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [allDeliverables, setAllDeliverables] = useState<Array<{ id: string; name: string; moduleCode?: string | null }>>([])

  // Load deliverables once for combobox
  useEffect(() => {
    fetch('/api/v1/deliverables?limit=200')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const list = (d.data as Array<Record<string, unknown>>)
            .map(x => ({ id: String(x.id), name: String(x.name), moduleCode: (x.moduleCode as string) ?? null }))
            .sort((a, b) => (a.moduleCode ?? '').localeCompare(b.moduleCode ?? '') || a.name.localeCompare(b.name))
          setAllDeliverables(list)
        }
      })
      .catch(() => { /* non-fatal */ })
  }, [])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Load consolidated rows
  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ view: 'consolidated' })
    if (processFilter !== 'all') params.set('processKey', processFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (automationFilter !== 'all') params.set('automation', automationFilter)
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
    const res = await fetch(`/api/v1/sops?${params}`)
    const d = await res.json()
    if (d.success) {
      let data: ConsolidatedRow[] = d.data
      if (maturityFilter !== 'all') {
        const m = parseInt(maturityFilter, 10)
        data = data.filter(r => r.maturityLevel === m)
      }
      setRows(data)
    }
    setLoading(false)
    setHasLoadedOnce(true)
  }, [processFilter, statusFilter, automationFilter, debouncedSearch, maturityFilter])

  useEffect(() => { load() }, [load])

  // Fetch detail when selection changes
  const fetchDetail = useCallback(async (sel: { kind: 'sop' | 'task-only'; id: string }) => {
    setLoadingDetail(true)
    const url = sel.kind === 'sop' ? `/api/v1/sops/${sel.id}` : `/api/v1/processes/tasks/${sel.id}`
    const res = await fetch(url)
    const d = await res.json()
    if (d.success) setDetail(d.data)
    setLoadingDetail(false)
  }, [])

  useEffect(() => {
    if (selected) fetchDetail(selected)
    else setDetail(null)
  }, [selected, fetchDetail])

  // Group rows by process for sidebar
  const grouped = useMemo(() => {
    return rows.reduce<Record<string, ConsolidatedRow[]>>((acc, r) => {
      const key = r.processKey ? `${r.processKey} ${r.processName ?? ''}`.trim() : 'Ohne Prozess'
      if (!acc[key]) acc[key] = []
      acc[key].push(r)
      return acc
    }, {})
  }, [rows])

  const allProcessKeys = useMemo(
    () => Array.from(new Set(rows.map(r => r.processKey).filter((k): k is string => !!k))).sort(),
    [rows],
  )

  // Header stats
  const stats = useMemo(() => {
    const total = rows.length
    const sops = rows.filter(r => r.kind === 'sop').length
    const taskOnly = rows.filter(r => r.kind === 'task-only').length
    const automated = rows.filter(r => r.coverage === 'automated').length
    const gaps = rows.filter(r => r.coverage === 'gap').length
    const pct = total > 0 ? Math.round((automated / total) * 100) : 0
    return { total, sops, taskOnly, automated, gaps, pct }
  }, [rows])

  // Create SOP from task
  const createSopFromTask = async (task: any) => {
    const res = await fetch('/api/v1/sops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: task.title,
        category: task.subprocess || 'Allgemein',
        purpose: task.purpose ?? '',
        scope: task.subprocess ?? '',
        sourceTaskId: task.taskKey,
        subprocess: task.subprocess,
        status: 'draft',
      }),
    })
    const d = await res.json()
    if (d.success) {
      toast.success('SOP erstellt')
      load()
      setSelected({ kind: 'sop', id: d.data.id })
    } else {
      toast.error('Fehler beim Erstellen')
    }
  }

  if (loading && !hasLoadedOnce) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-card border-r flex flex-col shrink-0">
          {/* Sidebar Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />Prozesse & SOPs
              </h2>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSidebar(false)}>
                <PanelLeftClose className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.total} Eintraege ({stats.sops} SOPs, {stats.taskOnly} ohne SOP)
            </p>
          </div>

          {/* Search & Filters */}
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
            <div className="flex gap-2">
              <Select value={processFilter} onValueChange={setProcessFilter}>
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Prozesse</SelectItem>
                  {allProcessKeys.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={automationFilter} onValueChange={(v: any) => setAutomationFilter(v)}>
                <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="automated">Automatisiert</SelectItem>
                  <SelectItem value="progress">In Arbeit</SelectItem>
                  <SelectItem value="gap">Luecke</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* List grouped by process */}
          <div className="flex-1 overflow-y-auto relative">
            {loading && (
              <div className="absolute right-3 top-2 z-10">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            )}
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([groupName, items]) => (
              <div key={groupName}>
                <div className="px-4 py-1.5 bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0">
                  {groupName} ({items.length})
                </div>
                {items.map((r) => {
                  const id = r.kind === 'sop' ? r.sopId! : r.taskId!
                  const isSelected = selected?.kind === r.kind && selected.id === id
                  return (
                    <button
                      key={`${r.kind}-${id}`}
                      onClick={() => setSelected({ kind: r.kind, id })}
                      className={cn(
                        'w-full flex items-center gap-2 px-4 py-2 text-left text-xs hover:bg-accent transition-colors border-b border-border/40',
                        isSelected && 'bg-accent font-medium',
                        r.kind === 'task-only' && 'bg-muted/20',
                      )}
                    >
                      <span className={cn(
                        'shrink-0 text-muted-foreground font-mono w-14 text-[10px]',
                        r.kind === 'task-only' && 'italic',
                      )}>
                        {r.taskKey || '—'}
                      </span>
                      <span className={cn(
                        'truncate flex-1',
                        r.kind === 'task-only' && 'text-muted-foreground',
                      )}>{r.title}</span>
                      <span className="shrink-0 flex items-center gap-1">
                        {r.kind === 'task-only' && (
                          <span className="text-[9px] text-muted-foreground border border-dashed border-muted-foreground/40 rounded px-1">
                            kein SOP
                          </span>
                        )}
                        {r.maturityLevel && (
                          <span className={cn('w-2 h-2 rounded-full', {
                            'bg-red-500': r.maturityLevel === 1,
                            'bg-orange-500': r.maturityLevel === 2,
                            'bg-yellow-500': r.maturityLevel === 3,
                            'bg-blue-500': r.maturityLevel === 4,
                            'bg-green-500': r.maturityLevel === 5,
                          })} title={`Reife ${r.maturityLevel}/5`} />
                        )}
                        {r.appStatus && (
                          <span className={cn('w-2 h-2 rounded-full', APP_STATUS_DOT[r.appStatus])}
                            title={APP_STATUS_LABELS[r.appStatus]} />
                        )}
                        {r.coverage === 'automated' && <Bot className="h-3 w-3 text-green-600" />}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
            {rows.length === 0 && !loading && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">Keine Eintraege gefunden</div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar with Stats */}
        <div className="border-b bg-muted/30 px-6 py-3 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!showSidebar && (
                <Button variant="ghost" size="icon" onClick={() => setShowSidebar(true)}>
                  <PanelLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-semibold">Prozesse & SOPs</span>
                {detail && (
                  <span className="text-sm text-muted-foreground hidden md:inline">— {detail.title}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="draft">Entwurf</SelectItem>
                  <SelectItem value="approved">Freigegeben</SelectItem>
                  <SelectItem value="archived">Archiviert</SelectItem>
                </SelectContent>
              </Select>
              <Select value={maturityFilter} onValueChange={setMaturityFilter}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Reife</SelectItem>
                  {[1, 2, 3, 4, 5].map(l => <SelectItem key={l} value={String(l)}>Reife {l}/5</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Stats line */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span><strong className="text-foreground">{stats.sops}</strong> SOPs</span>
            <span>·</span>
            <span><strong className="text-foreground">{stats.taskOnly}</strong> ohne SOP</span>
            <span>·</span>
            <span className="text-green-700"><strong>{stats.automated}</strong> automatisiert ({stats.pct}%)</span>
            <span>·</span>
            <span className="text-red-700"><strong>{stats.gaps}</strong> Luecken</span>
          </div>
        </div>

        {/* Detail or Placeholder */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : detail && selected?.kind === 'sop' ? (
            <SopDetail
              sop={detail}
              allDeliverables={allDeliverables}
              onSaved={() => { if (selected) fetchDetail(selected); load() }}
            />
          ) : detail && selected?.kind === 'task-only' ? (
            <TaskOnlyDetail
              task={detail}
              processKey={rows.find(r => r.taskId === selected.id)?.processKey ?? null}
              processName={rows.find(r => r.taskId === selected.id)?.processName ?? null}
              onCreateSop={() => createSopFromTask(detail)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">Eintrag aus der Seitenleiste auswaehlen</p>
              <p className="text-xs mt-1">{stats.total} Prozesse & SOPs verfuegbar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
