'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, Clock, Award, ExternalLink, Ban } from 'lucide-react'

interface CertificateRequest {
  id: string
  userId: string
  courseId: string
  status: 'requested' | 'issued' | 'rejected' | 'revoked' | string
  identifier: string
  requestedAt: string
  issuedAt: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  reviewComment: string | null
}

type StatusTab = 'requested' | 'issued' | 'rejected' | 'revoked'

const TAB_LABELS: Record<StatusTab, string> = {
  requested: 'Offen',
  issued: 'Ausgestellt',
  rejected: 'Abgelehnt',
  revoked: 'Widerrufen',
}

const STATUS_BADGE: Record<string, { label: string; variant: 'outline' | 'default' | 'destructive' | 'secondary'; icon: React.ReactNode }> = {
  requested: { label: 'Offen', variant: 'outline', icon: <Clock className="h-3 w-3" /> },
  issued: { label: 'Ausgestellt', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: 'Abgelehnt', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  revoked: { label: 'Widerrufen', variant: 'secondary', icon: <Ban className="h-3 w-3" /> },
}

export default function CertificateRequestsQueuePage() {
  const [tab, setTab] = useState<StatusTab>('requested')
  const [rows, setRows] = useState<CertificateRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectComment, setRejectComment] = useState('')
  const [approveId, setApproveId] = useState<string | null>(null)
  const [approveComment, setApproveComment] = useState('')
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const [revokeComment, setRevokeComment] = useState('')
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/portal/certificate-requests?status=${tab}`)
      const data = await res.json()
      if (data?.success) setRows(data.data || [])
      else toast.error(data?.error?.message || 'Laden fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { load() }, [load])

  const submitApprove = async () => {
    if (!approveId) return
    setActing(true)
    try {
      const res = await fetch(`/api/v1/portal/certificate-requests/${approveId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approveComment.trim() ? { reviewComment: approveComment.trim() } : {}),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Zertifikat ausgestellt')
        setApproveId(null); setApproveComment('')
        load()
      } else toast.error(data.error?.message || 'Ausstellen fehlgeschlagen')
    } finally { setActing(false) }
  }

  const submitReject = async () => {
    if (!rejectId || !rejectComment.trim()) return
    setActing(true)
    try {
      const res = await fetch(`/api/v1/portal/certificate-requests/${rejectId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewComment: rejectComment.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Antrag abgelehnt')
        setRejectId(null); setRejectComment('')
        load()
      } else toast.error(data.error?.message || 'Ablehnen fehlgeschlagen')
    } finally { setActing(false) }
  }

  const submitRevoke = async () => {
    if (!revokeId || !revokeComment.trim()) return
    setActing(true)
    try {
      const res = await fetch(`/api/v1/portal/certificate-requests/${revokeId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewComment: revokeComment.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Zertifikat widerrufen')
        setRevokeId(null); setRevokeComment('')
        load()
      } else toast.error(data.error?.message || 'Widerrufen fehlgeschlagen')
    } finally { setActing(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Award className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold">Zertifikats-Anträge</h1>
            <p className="text-sm text-muted-foreground">
              Anträge und ausgestellte Zertifikate verwalten
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aktualisieren'}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as StatusTab)}>
        <TabsList>
          {(Object.keys(TAB_LABELS) as StatusTab[]).map((k) => (
            <TabsTrigger key={k} value={k}>{TAB_LABELS[k]}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{TAB_LABELS[tab]}</span>
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
              <Award className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Keine Einträge.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((r) => {
                const sb = STATUS_BADGE[r.status] ?? STATUS_BADGE.requested
                return (
                  <div key={r.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            Antrag vom {new Date(r.requestedAt).toLocaleString('de-DE')}
                          </span>
                          <Badge variant={sb.variant} className="gap-1 flex items-center">
                            {sb.icon}
                            {sb.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>User:</span>
                          <span className="font-mono">{r.userId}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Kurs:</span>
                          <Link
                            href={`/intern/elearning/${r.courseId}`}
                            className="font-mono hover:underline flex items-center gap-1"
                          >
                            {r.courseId}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Verifikations-ID:</span>
                          <Link
                            href={`/zertifikat/${r.identifier}`}
                            className="font-mono hover:underline flex items-center gap-1"
                            target="_blank"
                          >
                            {r.identifier}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                        {r.issuedAt && (
                          <div className="text-xs text-muted-foreground">
                            Ausgestellt am {new Date(r.issuedAt).toLocaleString('de-DE')}
                          </div>
                        )}
                        {r.reviewedAt && r.status !== 'requested' && (
                          <div className="text-xs text-muted-foreground">
                            Entschieden am {new Date(r.reviewedAt).toLocaleString('de-DE')}
                          </div>
                        )}
                      </div>
                    </div>

                    {r.reviewComment && (
                      <p className="text-sm p-3 rounded bg-muted/50">
                        <strong className="text-xs text-muted-foreground">Kommentar:</strong><br />{r.reviewComment}
                      </p>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {r.status === 'requested' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => { setApproveId(r.id); setApproveComment('') }}
                            disabled={acting}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Ausstellen
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setRejectId(r.id); setRejectComment('') }}
                            disabled={acting}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Ablehnen
                          </Button>
                        </>
                      )}
                      {r.status === 'issued' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setRevokeId(r.id); setRevokeComment('') }}
                          disabled={acting}
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Widerrufen
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!approveId} onOpenChange={(open) => !open && setApproveId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Zertifikat ausstellen</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Glückwunsch-Kommentar (optional)</label>
            <Textarea value={approveComment} onChange={(e) => setApproveComment(e.target.value)}
              placeholder="Optional — wird dem Kunden angezeigt..." rows={3} maxLength={1000} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setApproveId(null)}>Abbrechen</Button>
            <Button onClick={submitApprove} disabled={acting}>
              {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Ausstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Antrag ablehnen</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Begründung</label>
            <Textarea value={rejectComment} onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Bitte kurz begründen (wird dem Kunden angezeigt)..." rows={4} maxLength={1000} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectId(null)}>Abbrechen</Button>
            <Button onClick={submitReject} disabled={!rejectComment.trim() || acting}>
              {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revokeId} onOpenChange={(open) => !open && setRevokeId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Zertifikat widerrufen</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Begründung</label>
            <Textarea value={revokeComment} onChange={(e) => setRevokeComment(e.target.value)}
              placeholder="Bitte kurz begründen — Verifikations-Page zeigt 'widerrufen' an..." rows={4} maxLength={1000} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevokeId(null)}>Abbrechen</Button>
            <Button variant="destructive" onClick={submitRevoke} disabled={!revokeComment.trim() || acting}>
              {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Widerrufen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
