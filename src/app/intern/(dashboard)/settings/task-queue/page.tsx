'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  ListTodo, Loader2, Play, Trash2, XCircle, CheckCircle2, Clock,
  AlertCircle, ChevronDown, ChevronRight, Mail, Bot, Eye, Pencil,
  ExternalLink, RefreshCcw,
} from 'lucide-react'
import { toast } from 'sonner'

interface QueueItem {
  id: string
  type: string
  status: string
  priority: number
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  error: string | null
  scheduledFor: string
  executedAt: string | null
  referenceType: string | null
  referenceId: string | null
  createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Wartend', variant: 'outline', icon: <Clock className="h-3 w-3" /> },
  running: { label: 'Läuft', variant: 'default', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  completed: { label: 'Erledigt', variant: 'secondary', icon: <CheckCircle2 className="h-3 w-3 text-green-600" /> },
  failed: { label: 'Fehler', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
  cancelled: { label: 'Storniert', variant: 'secondary', icon: <XCircle className="h-3 w-3" /> },
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  email: { label: 'E-Mail', icon: <Mail className="h-4 w-4" />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950' },
  ai: { label: 'KI-Aufgabe', icon: <Bot className="h-4 w-4" />, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950' },
}

const PRIORITY_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'Hoch', color: 'text-red-600' },
  2: { label: 'Mittel', color: 'text-amber-600' },
  3: { label: 'Niedrig', color: 'text-muted-foreground' },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function getPayloadSummary(item: QueueItem): string {
  const p = item.payload
  if (item.type === 'email') {
    const to = (p.to as string) || '–'
    const tmpl = (p.templateSlug as string) || ''
    const name = (p.placeholders as Record<string, string>)?.name || ''
    return `An: ${to === '__ADMIN__' ? 'Admin' : to}${tmpl ? ` · Vorlage: ${tmpl}` : ''}${name ? ` · ${name}` : ''}`
  }
  if (item.type === 'ai') {
    const action = (p.action as string) || ''
    const name = (p.companyName as string) || ''
    return `${action === 'company_research' ? 'Firmenrecherche' : action}${name ? `: ${name}` : ''}`
  }
  return JSON.stringify(p).substring(0, 100)
}

function getReferenceLink(item: QueueItem): string | null {
  if (!item.referenceType || !item.referenceId) return null
  if (item.referenceType === 'lead') return `/intern/leads/${item.referenceId}`
  if (item.referenceType === 'company') return `/intern/contacts/companies/${item.referenceId}`
  return null
}

export default function TaskQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editItem, setEditItem] = useState<QueueItem | null>(null)
  const [editPayload, setEditPayload] = useState('')

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      const response = await fetch(`/api/v1/task-queue?${params}`)
      const data = await response.json()
      if (data.success) setItems(data.data)
    } catch {
      toast.error('Tasks konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => { fetchItems() }, [fetchItems])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    const pendingIds = items.filter(i => i.status === 'pending').map(i => i.id)
    setSelected(prev => prev.size === pendingIds.length ? new Set() : new Set(pendingIds))
  }

  const executeSelected = async () => {
    if (selected.size === 0) return
    setExecuting(true)
    try {
      const response = await fetch('/api/v1/task-queue/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(`${data.data.completed} erledigt, ${data.data.failed} fehlgeschlagen`)
        setSelected(new Set())
        fetchItems()
      }
    } catch {
      toast.error('Ausführung fehlgeschlagen')
    } finally {
      setExecuting(false)
    }
  }

  const executeAll = async () => {
    setExecuting(true)
    try {
      const response = await fetch('/api/v1/task-queue/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(`${data.data.completed} erledigt, ${data.data.failed} fehlgeschlagen`)
        fetchItems()
      }
    } catch {
      toast.error('Ausführung fehlgeschlagen')
    } finally {
      setExecuting(false)
    }
  }

  const deleteItem = async (id: string) => {
    try {
      await fetch(`/api/v1/task-queue/${id}`, { method: 'DELETE' })
      toast.success('Task gelöscht')
      fetchItems()
    } catch {
      toast.error('Löschen fehlgeschlagen')
    }
  }

  const savePayload = async () => {
    if (!editItem) return
    try {
      const parsed = JSON.parse(editPayload)
      await fetch(`/api/v1/task-queue/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: parsed }),
      })
      toast.success('Payload gespeichert')
      setEditItem(null)
      fetchItems()
    } catch {
      toast.error('Ungültiges JSON oder Speichern fehlgeschlagen')
    }
  }

  const types = [...new Set(items.map(i => i.type))].sort()
  const pendingCount = items.filter(i => i.status === 'pending').length
  const stats = {
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    completed: items.filter(i => i.status === 'completed').length,
    failed: items.filter(i => i.status === 'failed').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ListTodo className="h-8 w-8" />
            Task-Queue
          </h1>
          <p className="text-muted-foreground mt-1">Automatisierte Aufgaben verwalten und ausführen</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchItems} title="Aktualisieren">
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={executeSelected} disabled={selected.size === 0 || executing}>
            {executing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Ausgewählte ({selected.size})
          </Button>
          <Button onClick={executeAll} disabled={pendingCount === 0 || executing}>
            {executing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Alle ausführen ({pendingCount})
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Gesamt</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Wartend</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Erledigt</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">Fehler</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="pending">Wartend</SelectItem>
            <SelectItem value="running">Läuft</SelectItem>
            <SelectItem value="completed">Erledigt</SelectItem>
            <SelectItem value="failed">Fehler</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Typ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            {types.map(t => (
              <SelectItem key={t} value={t}>{TYPE_CONFIG[t]?.label || t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Keine Tasks in der Queue
            </CardContent>
          </Card>
        ) : items.map(item => {
          const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending
          const tc = TYPE_CONFIG[item.type] || { label: item.type, icon: <ListTodo className="h-4 w-4" />, color: 'text-muted-foreground bg-muted' }
          const pc = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG[2]
          const isExpanded = expandedId === item.id
          const refLink = getReferenceLink(item)

          return (
            <Card key={item.id} className={`transition-all ${isExpanded ? 'ring-1 ring-primary/30' : ''}`}>
              <CardContent className="p-0">
                {/* Main Row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {item.status === 'pending' && (
                    <Checkbox
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                    />
                  )}
                  {item.status !== 'pending' && <div className="w-4" />}

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>

                  <div className={`shrink-0 rounded-lg p-2 ${tc.color}`}>
                    {tc.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{tc.label}</span>
                      <Badge variant={sc.variant} className="text-xs gap-1">
                        {sc.icon}{sc.label}
                      </Badge>
                      <span className={`text-xs font-medium ${pc.color}`}>{pc.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {getPayloadSummary(item)}
                    </p>
                  </div>

                  <div className="shrink-0 text-xs text-muted-foreground text-right hidden sm:block">
                    {formatDate(item.scheduledFor)}
                  </div>

                  <div className="shrink-0 flex items-center gap-1">
                    {refLink && (
                      <Link href={refLink}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Referenz öffnen">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedId(isExpanded ? null : item.id)} title="Details">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {item.status === 'pending' && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditItem(item); setEditPayload(JSON.stringify(item.payload, null, 2)) }} title="Bearbeiten">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteItem(item.id)} title="Löschen">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t px-4 py-4 bg-muted/30 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">ID</div>
                        <code className="text-xs">{item.id.substring(0, 8)}...</code>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Erstellt</div>
                        <span className="text-xs">{formatDate(item.createdAt)}</span>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Geplant</div>
                        <span className="text-xs">{formatDate(item.scheduledFor)}</span>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Ausgeführt</div>
                        <span className="text-xs">{item.executedAt ? formatDate(item.executedAt) : '–'}</span>
                      </div>
                    </div>

                    {item.referenceType && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Referenz</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{item.referenceType}</Badge>
                          {refLink ? (
                            <Link href={refLink} className="text-xs text-primary hover:underline">{item.referenceId}</Link>
                          ) : (
                            <code className="text-xs">{item.referenceId}</code>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Payload</div>
                      <pre className="text-xs bg-card rounded-lg border p-3 overflow-x-auto max-h-60">
                        {JSON.stringify(item.payload, null, 2)}
                      </pre>
                    </div>

                    {item.result && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Ergebnis</div>
                        <pre className="text-xs bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 p-3 overflow-x-auto max-h-40">
                          {JSON.stringify(item.result, null, 2)}
                        </pre>
                      </div>
                    )}

                    {item.error && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Fehler</div>
                        <pre className="text-xs bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800 p-3 overflow-x-auto">
                          {item.error}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Edit Payload Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Task Payload bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Payload (JSON)</Label>
            <Textarea
              value={editPayload}
              onChange={(e) => setEditPayload(e.target.value)}
              rows={15}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Abbrechen</Button>
            <Button onClick={savePayload}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
