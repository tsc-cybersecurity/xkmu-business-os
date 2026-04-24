'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ListOrdered } from 'lucide-react'
import { toast } from 'sonner'

interface OrderRow {
  id: string
  title: string
  status: string
  priority: string
  categoryId: string | null
  categoryName: string | null
  companyId: string
  companyName: string | null
  assignedTo: string | null
  assignedToName: string | null
  createdAt: string
}

interface Category {
  id: string
  name: string
}

const STATUS_UI: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending:     { label: 'Offen',           variant: 'outline' },
  accepted:    { label: 'Angenommen',      variant: 'default' },
  in_progress: { label: 'In Bearbeitung',  variant: 'default' },
  done:        { label: 'Abgeschlossen',   variant: 'secondary' },
  rejected:    { label: 'Abgelehnt',       variant: 'destructive' },
  cancelled:   { label: 'Storniert',       variant: 'secondary' },
}

const PRIORITY_DOT: Record<string, string> = {
  kritisch: 'bg-red-700',
  hoch:     'bg-red-500',
  mittel:   'bg-amber-500',
  niedrig:  'bg-emerald-500',
}

const STATUS_OPTIONS = [
  { value: 'OPEN',     label: 'Alle offenen' },
  { value: 'ALL',      label: 'Alle' },
  { value: 'pending',     label: 'Offen' },
  { value: 'accepted',    label: 'Angenommen' },
  { value: 'in_progress', label: 'In Bearbeitung' },
  { value: 'done',        label: 'Abgeschlossen' },
  { value: 'rejected',    label: 'Abgelehnt' },
  { value: 'cancelled',   label: 'Storniert' },
]

const PRIORITY_OPTIONS = [
  { value: 'ALL',      label: 'Alle Prioritäten' },
  { value: 'kritisch', label: 'Kritisch' },
  { value: 'hoch',     label: 'Hoch' },
  { value: 'mittel',   label: 'Mittel' },
  { value: 'niedrig',  label: 'Niedrig' },
]

export default function AdminOrdersQueuePage() {
  const router = useRouter()
  const [rows, setRows] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('OPEN')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [categories, setCategories] = useState<Category[]>([])

  // Load categories once
  useEffect(() => {
    fetch('/api/v1/portal/order-categories')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) setCategories(d.data ?? [])
      })
      .catch(() => {/* ignore */})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter === 'OPEN') {
        params.set('status', 'pending,accepted,in_progress')
      } else if (statusFilter !== 'ALL') {
        params.set('status', statusFilter)
      }
      if (priorityFilter !== 'ALL') params.set('priority', priorityFilter)
      if (categoryFilter !== 'ALL') params.set('categoryId', categoryFilter)

      const res = await fetch(`/api/v1/orders?${params}`)
      const data = await res.json()
      if (data?.success) {
        setRows(data.data ?? [])
      } else {
        toast.error(data?.error?.message ?? 'Laden fehlgeschlagen')
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter, priorityFilter, categoryFilter])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ListOrdered className="h-6 w-6 shrink-0 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold">Aufträge</h1>
            <p className="text-sm text-muted-foreground">Alle Service-Aufträge verwalten</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Alle Kategorien" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Alle Kategorien</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aktualisieren'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Aufträge</span>
            {!loading && (
              <span className="text-sm font-normal text-muted-foreground">
                {rows.length} {rows.length === 1 ? 'Eintrag' : 'Einträge'}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center">
              <ListOrdered className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Keine Aufträge gefunden.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-6">Prio</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kategorie</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Firma</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Titel</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Zugewiesen</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Datum</th>
                    <th className="px-4 py-3 w-6" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const statusUi = STATUS_UI[row.status] ?? { label: row.status, variant: 'outline' as const }
                    const dotClass = PRIORITY_DOT[row.priority] ?? 'bg-muted-foreground'
                    return (
                      <tr
                        key={row.id}
                        className="border-b hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => router.push(`/intern/orders/${row.id}`)}
                      >
                        <td className="px-4 py-3">
                          <span
                            title={row.priority}
                            className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusUi.variant}>{statusUi.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.categoryName ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {row.companyName ?? row.companyId}
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate">
                          {row.title}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.assignedToName ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(row.createdAt).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">→</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
