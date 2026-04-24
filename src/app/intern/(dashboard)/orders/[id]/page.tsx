'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft, ListOrdered } from 'lucide-react'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────────────────────────────

interface OrderDetail {
  id: string
  title: string
  description: string
  status: string
  priority: string
  rejectReason: string | null
  categoryId: string | null
  categoryName: string | null
  companyId: string
  companyName: string | null
  requestedBy: string | null
  requestedByEmail: string | null
  contractId: string | null
  contractNumber: string | null
  projectId: string | null
  projectName: string | null
  assignedTo: string | null
  createdAt: string
  acceptedAt: string | null
  startedAt: string | null
  completedAt: string | null
  rejectedAt: string | null
  cancelledAt: string | null
  updatedAt: string
}

interface UserOption {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
}

// ── Static maps ────────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('de-DE')
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  // Reject dialog
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false)
  const [users, setUsers] = useState<UserOption[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string>('__null__')

  // ── Load order ────────────────────────────────────────────────────────

  const loadOrder = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/orders/${id}`)
      const data = await res.json()
      if (data?.success) {
        setOrder(data.data)
      } else {
        toast.error(data?.error?.message ?? 'Laden fehlgeschlagen')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadOrder() }, [loadOrder])

  // ── Load users for assign dialog ──────────────────────────────────────

  const openAssign = async () => {
    setSelectedUser(order?.assignedTo ?? '__null__')
    setAssignOpen(true)
    if (users.length > 0) return
    setUsersLoading(true)
    try {
      const res = await fetch('/api/v1/users?limit=200')
      const data = await res.json()
      if (data?.success) {
        const items: UserOption[] = (data.data ?? []).filter(
          (u: UserOption) => ['owner', 'admin', 'member'].includes(u.role)
        )
        setUsers(items)
      }
    } catch {
      toast.error('Benutzer konnten nicht geladen werden')
    } finally {
      setUsersLoading(false)
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────

  const doAction = async (action: string, extra?: Record<string, unknown>) => {
    setActing(true)
    try {
      const res = await fetch(`/api/v1/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (data?.success) {
        toast.success('Aktion erfolgreich')
        await loadOrder()
      } else {
        toast.error(data?.error?.message ?? 'Aktion fehlgeschlagen')
      }
    } finally {
      setActing(false)
    }
  }

  const handleAccept = () => doAction('accept')
  const handleStart = () => doAction('start')
  const handleComplete = () => doAction('complete')

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return
    await doAction('reject', { rejectReason: rejectReason.trim() })
    setRejectOpen(false)
    setRejectReason('')
  }

  const handleAssignSubmit = async () => {
    const assignedTo = selectedUser === '__null__' ? null : selectedUser
    await doAction('assign', { assignedTo })
    setAssignOpen(false)
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="py-16 text-center">
        <ListOrdered className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">Auftrag nicht gefunden.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/intern/orders')}>
          Zurück zur Übersicht
        </Button>
      </div>
    )
  }

  const statusUi = STATUS_UI[order.status] ?? { label: order.status, variant: 'outline' as const }
  const dotClass = PRIORITY_DOT[order.priority] ?? 'bg-muted-foreground'

  const canAccept   = order.status === 'pending'
  const canStart    = order.status === 'accepted'
  const canComplete = order.status === 'in_progress'
  const canReject   = ['pending', 'accepted', 'in_progress'].includes(order.status)
  const canAssign   = !['done', 'rejected', 'cancelled'].includes(order.status)

  const hasActions = canAccept || canStart || canComplete || canReject || canAssign

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Section 1: Header ── */}
      <div className="flex items-start gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => router.push('/intern/orders')} title="Zurück">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span
              title={order.priority}
              className={`inline-block h-3 w-3 rounded-full shrink-0 mt-0.5 ${dotClass}`}
            />
            <h1 className="text-2xl font-semibold leading-tight">{order.title}</h1>
            <Badge variant={statusUi.variant}>{statusUi.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Priorität: <strong>{order.priority}</strong>
            {order.categoryName && <> · Kategorie: <strong>{order.categoryName}</strong></>}
          </p>
        </div>
      </div>

      {/* ── Section 2: Meta-Grid ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Kategorie</dt>
              <dd className="font-medium mt-0.5">{order.categoryName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Firma</dt>
              <dd className="font-medium mt-0.5">
                <Link
                  href={`/intern/contacts/companies/${order.companyId}`}
                  className="hover:underline text-primary"
                >
                  {order.companyName ?? order.companyId}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Eingereicht von</dt>
              <dd className="font-medium mt-0.5">{order.requestedByEmail ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Vertrag</dt>
              <dd className="font-medium mt-0.5">
                {order.contractId ? (
                  <Link
                    href={`/intern/finance/contracts/${order.contractId}`}
                    className="hover:underline text-primary"
                  >
                    {order.contractNumber ?? order.contractId}
                  </Link>
                ) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Projekt</dt>
              <dd className="font-medium mt-0.5">
                {order.projectId ? (
                  <Link
                    href={`/intern/projekte/${order.projectId}`}
                    className="hover:underline text-primary"
                  >
                    {order.projectName ?? order.projectId}
                  </Link>
                ) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Zugewiesen an</dt>
              <dd className="font-medium mt-0.5">{order.assignedTo ? (order.assignedTo) : '—'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* ── Section 3: Beschreibung ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Beschreibung</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{order.description}</p>
        </CardContent>
      </Card>

      {/* ── Section 4: Timeline ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm">
            <TimelineRow label="Eingereicht" value={order.createdAt} />
            {order.acceptedAt   && <TimelineRow label="Angenommen"     value={order.acceptedAt} />}
            {order.startedAt    && <TimelineRow label="Gestartet"      value={order.startedAt} />}
            {order.completedAt  && <TimelineRow label="Abgeschlossen"  value={order.completedAt} />}
            {order.rejectedAt   && (
              <>
                <TimelineRow label="Abgelehnt" value={order.rejectedAt} />
                {order.rejectReason && (
                  <li className="ml-6 text-muted-foreground italic">
                    Grund: {order.rejectReason}
                  </li>
                )}
              </>
            )}
            {order.cancelledAt  && <TimelineRow label="Storniert"      value={order.cancelledAt} />}
          </ol>
        </CardContent>
      </Card>

      {/* ── Section 5: Action-Bar ── */}
      {hasActions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aktionen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {canAccept && (
                <Button onClick={handleAccept} disabled={acting}>
                  {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Annehmen
                </Button>
              )}
              {canStart && (
                <Button onClick={handleStart} disabled={acting}>
                  {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Starten
                </Button>
              )}
              {canComplete && (
                <Button onClick={handleComplete} disabled={acting}>
                  {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Abschließen
                </Button>
              )}
              {canReject && (
                <Button
                  variant="destructive"
                  onClick={() => { setRejectReason(''); setRejectOpen(true) }}
                  disabled={acting}
                >
                  Ablehnen
                </Button>
              )}
              {canAssign && (
                <Button variant="outline" onClick={openAssign} disabled={acting}>
                  Zuweisen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Reject Dialog ── */}
      <Dialog open={rejectOpen} onOpenChange={(open) => !open && setRejectOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auftrag ablehnen</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Ablehnungsgrund</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Bitte kurz begründen (wird dem Kunden angezeigt)..."
              rows={4}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)} disabled={acting}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={!rejectReason.trim() || acting}
            >
              {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Dialog ── */}
      <Dialog open={assignOpen} onOpenChange={(open) => !open && setAssignOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auftrag zuweisen</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="assign-user">Benutzer</Label>
            {usersLoading ? (
              <div className="py-4 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : (
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger id="assign-user">
                  <SelectValue placeholder="Benutzer wählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__null__">— Nicht zugewiesen —</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName && u.lastName
                        ? `${u.firstName} ${u.lastName} (${u.email})`
                        : u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignOpen(false)} disabled={acting}>
              Abbrechen
            </Button>
            <Button onClick={handleAssignSubmit} disabled={usersLoading || acting}>
              {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Sub-component: Timeline row ────────────────────────────────────────────

function TimelineRow({ label, value }: { label: string; value: string | null }) {
  return (
    <li className="flex items-center gap-3">
      <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
      <span className="text-muted-foreground w-32 shrink-0">{label}</span>
      <span>{value ? new Date(value).toLocaleString('de-DE') : '—'}</span>
    </li>
  )
}
