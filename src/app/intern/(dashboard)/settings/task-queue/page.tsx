'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ListTodo,
  Loader2,
  Play,
  Trash2,
  XCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
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

const STATUS_BADGES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Wartend', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: <Clock className="h-3 w-3" /> },
  running: { label: 'Laeuft', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  completed: { label: 'Erledigt', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: 'Fehler', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: <AlertCircle className="h-3 w-3" /> },
  cancelled: { label: 'Storniert', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: <XCircle className="h-3 w-3" /> },
}

const PRIORITY_LABELS: Record<number, string> = { 1: 'Hoch', 2: 'Mittel', 3: 'Niedrig' }

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function TaskQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

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
    if (selected.size === pendingIds.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(pendingIds))
    }
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
      toast.error('Ausfuehrung fehlgeschlagen')
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
      toast.error('Ausfuehrung fehlgeschlagen')
    } finally {
      setExecuting(false)
    }
  }

  const deleteItem = async (id: string) => {
    try {
      await fetch(`/api/v1/task-queue/${id}`, { method: 'DELETE' })
      fetchItems()
    } catch {
      toast.error('Loeschen fehlgeschlagen')
    }
  }

  const types = [...new Set(items.map(i => i.type))].sort()
  const pendingCount = items.filter(i => i.status === 'pending').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ListTodo className="h-8 w-8" />
            Task-Queue
          </h1>
          <p className="text-muted-foreground mt-1">
            Automatisierte Aufgaben verwalten und ausfuehren
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={executeSelected}
            disabled={selected.size === 0 || executing}
          >
            {executing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Ausgewaehlte ({selected.size})
          </Button>
          <Button
            onClick={executeAll}
            disabled={pendingCount === 0 || executing}
          >
            {executing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Alle ausfuehren ({pendingCount})
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="pending">Wartend</SelectItem>
                <SelectItem value="running">Laeuft</SelectItem>
                <SelectItem value="completed">Erledigt</SelectItem>
                <SelectItem value="failed">Fehler</SelectItem>
                <SelectItem value="cancelled">Storniert</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Typ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selected.size > 0 && selected.size === items.filter(i => i.status === 'pending').length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prio</TableHead>
              <TableHead>Geplant</TableHead>
              <TableHead>Referenz</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="w-20">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Keine Tasks in der Queue
                </TableCell>
              </TableRow>
            ) : items.map(item => {
              const sb = STATUS_BADGES[item.status] || STATUS_BADGES.pending
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.status === 'pending' && (
                      <Checkbox
                        checked={selected.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{item.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${sb.color}`}>
                      {sb.icon}
                      <span className="ml-1">{sb.label}</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{PRIORITY_LABELS[item.priority] || item.priority}</TableCell>
                  <TableCell className="text-xs">{formatDate(item.scheduledFor)}</TableCell>
                  <TableCell className="text-xs">
                    {item.referenceType && (
                      <span>{item.referenceType}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">
                    {item.error || (item.payload ? JSON.stringify(item.payload).substring(0, 80) : '—')}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteItem(item.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
