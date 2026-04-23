'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, Clock, ClipboardList, ExternalLink } from 'lucide-react'

interface ChangeRequest {
  id: string
  companyId: string
  requestedBy: string | null
  requestedAt: string
  proposedChanges: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected' | string
  reviewedBy: string | null
  reviewedAt: string | null
  reviewComment: string | null
}

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all'

const STATUS_UI: Record<string, { label: string; variant: 'outline' | 'default' | 'destructive'; icon: React.ReactNode }> = {
  pending: { label: 'Offen', variant: 'outline', icon: <Clock className="h-3 w-3" /> },
  approved: { label: 'Genehmigt', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: 'Abgelehnt', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
}

export default function ChangeRequestsQueuePage() {
  const [rows, setRows] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectComment, setRejectComment] = useState('')
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/v1/portal/change-requests?${params}`)
      const data = await res.json()
      if (data?.success) setRows(data.data || [])
      else toast.error(data?.error?.message || 'Laden fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const approve = async (id: string) => {
    setActing(true)
    try {
      const res = await fetch(`/api/v1/portal/change-requests/${id}/approve`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success('Antrag genehmigt — Daten wurden übernommen')
        load()
      } else {
        toast.error(data.error?.message || 'Genehmigen fehlgeschlagen')
      }
    } finally { setActing(false) }
  }

  const submitReject = async () => {
    if (!rejectId || !rejectComment.trim()) return
    setActing(true)
    try {
      const res = await fetch(`/api/v1/portal/change-requests/${rejectId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewComment: rejectComment.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Antrag abgelehnt')
        setRejectId(null)
        setRejectComment('')
        load()
      } else {
        toast.error(data.error?.message || 'Ablehnen fehlgeschlagen')
      }
    } finally { setActing(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold">Portal-Anträge</h1>
            <p className="text-sm text-muted-foreground">Änderungsanträge von Kunden-Portalen verwalten</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Offen</SelectItem>
              <SelectItem value="approved">Genehmigt</SelectItem>
              <SelectItem value="rejected">Abgelehnt</SelectItem>
              <SelectItem value="all">Alle</SelectItem>
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
            <span>Anträge</span>
            {!loading && (
              <span className="text-sm font-normal text-muted-foreground">
                {rows.length} {rows.length === 1 ? 'Eintrag' : 'Einträge'}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Keine Anträge gefunden.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((r) => {
                const sc = STATUS_UI[r.status] ?? STATUS_UI.pending
                const changes = r.proposedChanges as Record<string, string | null>
                return (
                  <div key={r.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            Antrag vom {new Date(r.requestedAt).toLocaleString('de-DE')}
                          </span>
                          <Badge variant={sc.variant} className="gap-1 flex items-center">
                            {sc.icon}
                            {sc.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Firma:</span>
                          <Link
                            href={`/intern/contacts/companies/${r.companyId}?tab=change-requests`}
                            className="font-mono hover:underline flex items-center gap-1"
                          >
                            {r.companyId}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                        {r.reviewedAt && (
                          <div className="text-xs text-muted-foreground">
                            Entschieden am {new Date(r.reviewedAt).toLocaleString('de-DE')}
                          </div>
                        )}
                      </div>
                    </div>

                    <dl className="text-sm grid gap-1 bg-muted/30 rounded p-3">
                      {Object.entries(changes).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <dt className="text-muted-foreground font-mono text-xs min-w-[140px] shrink-0">{k}:</dt>
                          <dd className="break-all">
                            {v === null ? <em className="text-muted-foreground">(geleert)</em> : String(v)}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    {r.reviewComment && (
                      <p className="text-sm p-3 rounded bg-muted/50">
                        <strong className="text-xs text-muted-foreground">Kommentar:</strong><br />{r.reviewComment}
                      </p>
                    )}

                    {r.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approve(r.id)} disabled={acting}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />Genehmigen
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setRejectId(r.id); setRejectComment('') }}
                          disabled={acting}
                        >
                          <XCircle className="h-4 w-4 mr-2" />Ablehnen
                        </Button>
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/intern/contacts/companies/${r.companyId}?tab=change-requests`}>
                            <ExternalLink className="h-4 w-4 mr-2" />Zur Firma
                          </Link>
                        </Button>
                      </div>
                    )}
                    {r.status !== 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/intern/contacts/companies/${r.companyId}?tab=change-requests`}>
                            <ExternalLink className="h-4 w-4 mr-2" />Zur Firma
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Antrag ablehnen</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Begründung</label>
            <Textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Bitte kurz begründen (wird dem Kunden angezeigt)..."
              rows={4}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectId(null)}>Abbrechen</Button>
            <Button onClick={submitReject} disabled={!rejectComment.trim() || acting}>
              {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
