'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Clock, Plus, Play, Pause, Trash2, Pencil, Loader2,
  CheckCircle2, AlertCircle, RefreshCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { INTERVAL_OPTIONS, ACTION_TYPE_OPTIONS } from '@/lib/services/cron.service'

interface CronJobItem {
  id: string
  name: string
  description: string | null
  interval: string
  dailyAt: string | null
  actionType: string
  actionConfig: Record<string, unknown>
  isActive: boolean
  lastRunAt: string | null
  lastRunStatus: string | null
  lastRunError: string | null
  nextRunAt: string | null
  runCount: number
  createdAt: string
}

const intervalLabel = (v: string) => INTERVAL_OPTIONS.find(o => o.value === v)?.label ?? v
const actionLabel = (v: string) => ACTION_TYPE_OPTIONS.find(o => o.value === v)?.label ?? v

function formatDate(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function CronJobsPage() {
  const [jobs, setJobs] = useState<CronJobItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formInterval, setFormInterval] = useState('60min')
  const [formDailyAt, setFormDailyAt] = useState('08:00')
  const [formActionType, setFormActionType] = useState('email_sync')
  const [formConfigTrigger, setFormConfigTrigger] = useState('cron.triggered')
  const [formConfigUrl, setFormConfigUrl] = useState('')
  const [formConfigMethod, setFormConfigMethod] = useState('GET')
  const [formConfigJson, setFormConfigJson] = useState('{}')

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/cron-jobs')
      const data = await res.json()
      if (data.success) setJobs(data.data)
    } catch {
      toast.error('Cron-Jobs konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const resetForm = () => {
    setEditingId(null)
    setFormName('')
    setFormDescription('')
    setFormInterval('60min')
    setFormDailyAt('08:00')
    setFormActionType('email_sync')
    setFormConfigTrigger('cron.triggered')
    setFormConfigUrl('')
    setFormConfigMethod('GET')
    setFormConfigJson('{}')
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (job: CronJobItem) => {
    setEditingId(job.id)
    setFormName(job.name)
    setFormDescription(job.description || '')
    setFormInterval(job.interval)
    setFormDailyAt(job.dailyAt || '08:00')
    setFormActionType(job.actionType)
    const cfg = job.actionConfig || {}
    setFormConfigTrigger((cfg.trigger as string) || 'cron.triggered')
    setFormConfigUrl((cfg.url as string) || '')
    setFormConfigMethod((cfg.method as string) || 'GET')
    setFormConfigJson(JSON.stringify(cfg, null, 2))
    setDialogOpen(true)
  }

  const buildActionConfig = (): Record<string, unknown> => {
    switch (formActionType) {
      case 'email_sync': return {}
      case 'workflow': return { trigger: formConfigTrigger }
      case 'api_call': return { url: formConfigUrl, method: formConfigMethod }
      case 'custom':
        try { return JSON.parse(formConfigJson) } catch { return {} }
      default: return {}
    }
  }

  const saveJob = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: formName,
        description: formDescription || undefined,
        interval: formInterval,
        dailyAt: formInterval === 'daily' ? formDailyAt : undefined,
        actionType: formActionType,
        actionConfig: buildActionConfig(),
      }

      const url = editingId ? `/api/v1/cron-jobs/${editingId}` : '/api/v1/cron-jobs'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(editingId ? 'Cron-Job aktualisiert' : 'Cron-Job erstellt')
        setDialogOpen(false)
        resetForm()
        fetchJobs()
      } else {
        toast.error(data.error?.message || 'Fehler beim Speichern')
      }
    } catch {
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (job: CronJobItem) => {
    try {
      await fetch(`/api/v1/cron-jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !job.isActive }),
      })
      fetchJobs()
    } catch {
      toast.error('Fehler beim Ändern')
    }
  }

  const runNow = async (job: CronJobItem) => {
    setRunningId(job.id)
    try {
      const res = await fetch(`/api/v1/cron-jobs/${job.id}/run`, { method: 'POST' })
      const data = await res.json()
      if (data.success && data.data?.success) {
        toast.success(`"${job.name}" erfolgreich ausgeführt`)
      } else {
        toast.error(data.data?.error || 'Ausführung fehlgeschlagen')
      }
      fetchJobs()
    } catch {
      toast.error('Fehler bei der Ausführung')
    } finally {
      setRunningId(null)
    }
  }

  const deleteJob = async (job: CronJobItem) => {
    if (!confirm(`Cron-Job "${job.name}" wirklich löschen?`)) return
    try {
      await fetch(`/api/v1/cron-jobs/${job.id}`, { method: 'DELETE' })
      toast.success('Cron-Job gelöscht')
      fetchJobs()
    } catch {
      toast.error('Fehler beim Löschen')
    }
  }

  const statusIndicator = (job: CronJobItem) => {
    if (!job.isActive) return <span className="h-2.5 w-2.5 rounded-full bg-gray-400 shrink-0" title="Inaktiv" />
    if (job.lastRunStatus === 'failed') return <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
    if (job.lastRunStatus === 'success') return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
    return <span className="h-2.5 w-2.5 rounded-full bg-gray-400 shrink-0" title="Noch nicht ausgeführt" />
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Clock className="h-8 w-8" />
            Cron-Jobs
          </h1>
          <p className="text-muted-foreground mt-1">Geplante Aufgaben konfigurieren und verwalten</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />Neuer Cron-Job
        </Button>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">Noch keine Cron-Jobs</h3>
            <p className="text-sm text-muted-foreground mb-4">Erstellen Sie Ihren ersten Cron-Job, um wiederkehrende Aufgaben zu automatisieren.</p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />Cron-Job erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map(job => (
            <Card key={job.id} className="h-full">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {statusIndicator(job)}
                      <h3 className="font-semibold truncate">{job.name}</h3>
                    </div>
                    {job.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{job.description}</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap text-xs mb-3">
                      <Badge variant="outline" className="text-xs">{intervalLabel(job.interval)}</Badge>
                      <Badge variant="secondary" className="text-xs">{actionLabel(job.actionType)}</Badge>
                      <Badge variant={job.isActive ? 'default' : 'secondary'} className="text-xs">
                        {job.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Letzter Lauf:</span>
                        <span>{formatDate(job.lastRunAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Nächster Lauf:</span>
                        <span>{formatDate(job.nextRunAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ausführungen:</span>
                        <span>{job.runCount ?? 0}</span>
                      </div>
                    </div>

                    {job.lastRunStatus === 'failed' && job.lastRunError && (
                      <p className="text-xs text-destructive mt-2 line-clamp-2">{job.lastRunError}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(job)} title="Bearbeiten">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => runNow(job)}
                      disabled={runningId === job.id}
                      title="Jetzt ausführen"
                    >
                      {runningId === job.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <RefreshCcw className="h-3.5 w-3.5" />
                      }
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(job)} title={job.isActive ? 'Deaktivieren' : 'Aktivieren'}>
                      {job.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteJob(job)} title="Löschen">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm() } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Cron-Job bearbeiten' : 'Neuer Cron-Job'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="z.B. E-Mail Sync" />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Intervall</Label>
              <Select value={formInterval} onValueChange={setFormInterval}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formInterval === 'daily' && (
              <div className="space-y-2">
                <Label>Uhrzeit</Label>
                <Input type="time" value={formDailyAt} onChange={e => setFormDailyAt(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Aktion</Label>
              <Select value={formActionType} onValueChange={setFormActionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_TYPE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Config fields depending on action type */}
            {formActionType === 'workflow' && (
              <div className="space-y-2">
                <Label>Workflow-Trigger</Label>
                <Input value={formConfigTrigger} onChange={e => setFormConfigTrigger(e.target.value)} placeholder="cron.triggered" />
              </div>
            )}
            {formActionType === 'api_call' && (
              <>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input value={formConfigUrl} onChange={e => setFormConfigUrl(e.target.value)} placeholder="/api/v1/..." />
                </div>
                <div className="space-y-2">
                  <Label>Methode</Label>
                  <Select value={formConfigMethod} onValueChange={setFormConfigMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {formActionType === 'custom' && (
              <div className="space-y-2">
                <Label>Konfiguration (JSON)</Label>
                <Textarea
                  value={formConfigJson}
                  onChange={e => setFormConfigJson(e.target.value)}
                  rows={5}
                  className="font-mono text-sm"
                  placeholder='{"key": "value"}'
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Abbrechen</Button>
            <Button onClick={saveJob} disabled={!formName.trim() || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
