'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, ShoppingCart, Clock } from 'lucide-react'
import { DocumentSection } from '@/app/portal/_components/document-section'

interface OrderDetail {
  id: string
  title: string
  description: string
  status: string
  priority: string
  rejectReason: string | null
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  contractId: string | null
  contractNumber: string | null
  projectId: string | null
  projectName: string | null
  createdAt: string
  acceptedAt: string | null
  startedAt: string | null
  completedAt: string | null
  rejectedAt: string | null
  cancelledAt: string | null
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

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDateShort(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE')
}

export default function PortalOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    fetch(`/api/v1/portal/me/orders/${id}`)
      .then(r => r.json())
      .then(d => { if (d?.success) setOrder(d.data) })
      .finally(() => setLoading(false))
  }, [id])

  async function handleCancel() {
    if (!window.confirm('Möchten Sie diesen Auftrag wirklich stornieren?')) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/v1/portal/me/orders/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok && data?.success) {
        toast.success('Auftrag wurde storniert')
        router.push('/portal/orders')
      } else {
        toast.error(data?.error?.message || 'Stornierung fehlgeschlagen')
      }
    } catch {
      toast.error('Stornierung fehlgeschlagen')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Link href="/portal/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Zurück zur Liste
        </Link>
        <p className="text-muted-foreground">Auftrag nicht gefunden.</p>
      </div>
    )
  }

  const sc = STATUS_UI[order.status] ?? { label: order.status, variant: 'outline' as const }
  const dot = PRIORITY_DOT[order.priority] ?? 'bg-muted-foreground'

  // Build timeline events
  const timeline: { date: string; label: string; note?: string }[] = []
  timeline.push({ date: order.createdAt, label: `Eingereicht am ${formatDate(order.createdAt)}` })
  if (order.acceptedAt) timeline.push({ date: order.acceptedAt, label: `Angenommen am ${formatDate(order.acceptedAt)}` })
  if (order.startedAt) timeline.push({ date: order.startedAt, label: `Bearbeitung gestartet am ${formatDate(order.startedAt)}` })
  if (order.completedAt) timeline.push({ date: order.completedAt, label: `Abgeschlossen am ${formatDate(order.completedAt)}` })
  if (order.rejectedAt) timeline.push({
    date: order.rejectedAt,
    label: `Abgelehnt am ${formatDate(order.rejectedAt)}`,
    note: order.rejectReason ?? undefined,
  })
  if (order.cancelledAt) timeline.push({ date: order.cancelledAt, label: `Storniert am ${formatDate(order.cancelledAt)}` })

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="space-y-3">
        <Link href="/portal/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Zurück zur Liste
        </Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold flex items-start gap-2">
            <ShoppingCart className="h-6 w-6 mt-0.5 shrink-0" />
            <span>{order.title}</span>
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
            <Badge variant={sc.variant}>{sc.label}</Badge>
          </div>
        </div>
      </div>

      {/* Eckdaten */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eckdaten</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Kategorie</dt>
              <dd>
                {order.categoryName ? (
                  <span
                    className="font-medium"
                    style={order.categoryColor ? { color: order.categoryColor } : undefined}
                  >
                    {order.categoryName}
                  </span>
                ) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Priorität</dt>
              <dd className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${dot}`} />
                {order.priority}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Vertrag</dt>
              <dd>
                {order.contractId && order.contractNumber ? (
                  <Link
                    href={`/portal/contracts/${order.contractId}`}
                    className="text-primary underline underline-offset-2"
                  >
                    {order.contractNumber}
                  </Link>
                ) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Projekt</dt>
              <dd>
                {order.projectId && order.projectName ? (
                  <Link
                    href={`/portal/projects/${order.projectId}`}
                    className="text-primary underline underline-offset-2"
                  >
                    {order.projectName}
                  </Link>
                ) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Eingereicht am</dt>
              <dd>{formatDateShort(order.createdAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Beschreibung */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Beschreibung</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{order.description}</p>
        </CardContent>
      </Card>

      {/* Verlauf */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Verlauf
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {timeline.map((event, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary mt-0.5 shrink-0" />
                  {i < timeline.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-1" />
                  )}
                </div>
                <div className="pb-4 last:pb-0">
                  <p className="text-sm">{event.label}</p>
                  {event.note && (
                    <blockquote className="mt-1 border-l-2 pl-3 text-sm text-muted-foreground italic">
                      {event.note}
                    </blockquote>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <DocumentSection linkedType="order" linkedId={id} />

      {/* Cancel action */}
      {order.status === 'pending' && (
        <div className="flex justify-end">
          <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
            {cancelling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Auftrag stornieren
          </Button>
        </div>
      )}
    </div>
  )
}
