'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'

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

interface Props { companyId: string }

const STATUS_UI: Record<string, { label: string; variant: 'outline' | 'default' | 'destructive'; icon: React.ReactNode }> = {
  pending: { label: 'Offen', variant: 'outline', icon: <Clock className="h-3 w-3" /> },
  approved: { label: 'Genehmigt', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: 'Abgelehnt', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
}

export function ChangeRequestsTab({ companyId }: Props) {
  const [rows, setRows] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectComment, setRejectComment] = useState('')
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/companies/${companyId}/change-requests`)
      const data = await res.json()
      if (data?.success) setRows(data.data || [])
    } finally { setLoading(false) }
  }, [companyId])

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
    <Card>
      <CardHeader>
        <CardTitle>Änderungsanträge</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center"><Loader2 className="h-5 w-5 mx-auto animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Änderungsanträge für diese Firma.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const sc = STATUS_UI[r.status] ?? STATUS_UI.pending
              const changes = r.proposedChanges as Record<string, string | null>
              return (
                <div key={r.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">
                        Antrag vom {new Date(r.requestedAt).toLocaleString('de-DE')}
                      </div>
                      {r.reviewedAt && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Entschieden am {new Date(r.reviewedAt).toLocaleString('de-DE')}
                        </div>
                      )}
                    </div>
                    <Badge variant={sc.variant} className="gap-1 flex items-center">
                      {sc.icon}
                      {sc.label}
                    </Badge>
                  </div>
                  <dl className="text-sm grid gap-1">
                    {Object.entries(changes).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="text-muted-foreground font-mono text-xs min-w-[120px]">{k}:</dt>
                        <dd>{v === null ? <em className="text-muted-foreground">(geleert)</em> : String(v)}</dd>
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
                      <Button size="sm" variant="outline" onClick={() => { setRejectId(r.id); setRejectComment('') }} disabled={acting}>
                        <XCircle className="h-4 w-4 mr-2" />Ablehnen
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

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
    </Card>
  )
}
