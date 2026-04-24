'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ShoppingCart } from 'lucide-react'

interface OrderRow {
  id: string
  title: string
  status: string
  priority: string
  categoryName: string | null
  categoryColor: string | null
  createdAt: string
}

const STATUS_UI: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending:     { label: 'Offen',          variant: 'outline' },
  accepted:    { label: 'Angenommen',     variant: 'default' },
  in_progress: { label: 'In Bearbeitung', variant: 'default' },
  done:        { label: 'Abgeschlossen',  variant: 'secondary' },
  rejected:    { label: 'Abgelehnt',      variant: 'destructive' },
  cancelled:   { label: 'Storniert',      variant: 'secondary' },
}

const PRIORITY_DOT: Record<string, string> = {
  kritisch: 'bg-red-700',
  hoch:     'bg-red-500',
  mittel:   'bg-amber-500',
  niedrig:  'bg-emerald-500',
}

type FilterKey = 'open' | 'all' | 'pending' | 'accepted' | 'in_progress' | 'done' | 'rejected' | 'cancelled'

const FILTER_OPTIONS: { value: FilterKey; label: string }[] = [
  { value: 'open',        label: 'Alle offenen' },
  { value: 'all',         label: 'Alle' },
  { value: 'pending',     label: 'Offen' },
  { value: 'accepted',    label: 'Angenommen' },
  { value: 'in_progress', label: 'In Bearbeitung' },
  { value: 'done',        label: 'Abgeschlossen' },
  { value: 'rejected',    label: 'Abgelehnt' },
  { value: 'cancelled',   label: 'Storniert' },
]

const OPEN_STATUSES = new Set(['pending', 'accepted', 'in_progress'])

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE')
}

function applyFilter(rows: OrderRow[], filter: FilterKey): OrderRow[] {
  if (filter === 'all') return rows
  if (filter === 'open') return rows.filter(r => OPEN_STATUSES.has(r.status))
  return rows.filter(r => r.status === filter)
}

export default function PortalOrdersListPage() {
  const [rows, setRows] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('open')

  useEffect(() => {
    fetch('/api/v1/portal/me/orders')
      .then(r => r.json())
      .then(d => { if (d?.success) setRows(d.data || []) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  const filtered = applyFilter(rows, filter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Aufträge
          </h1>
          <p className="text-muted-foreground">Ihre eingereichten Aufträge</p>
        </div>
        <Button asChild>
          <Link href="/portal/orders/new">Neuen Auftrag einreichen</Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {rows.length === 0
              ? 'Sie haben noch keine Aufträge eingereicht.'
              : 'Keine Aufträge für den gewählten Filter.'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {filtered.map(row => {
                const sc = STATUS_UI[row.status] ?? { label: row.status, variant: 'outline' as const }
                const dot = PRIORITY_DOT[row.priority] ?? 'bg-muted-foreground'
                return (
                  <li key={row.id}>
                    <Link
                      href={`/portal/orders/${row.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dot}`} />
                      <Badge variant={sc.variant} className="shrink-0">{sc.label}</Badge>
                      {row.categoryName && (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-xs font-normal"
                          style={row.categoryColor ? { borderColor: row.categoryColor, color: row.categoryColor } : undefined}
                        >
                          {row.categoryName}
                        </Badge>
                      )}
                      <span className="flex-1 text-sm font-medium truncate">{row.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDate(row.createdAt)}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
