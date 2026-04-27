'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, Clock, Award, ExternalLink } from 'lucide-react'

interface CertificateRequest {
  id: string
  userId: string
  courseId: string
  status: 'requested' | 'issued' | 'rejected' | string
  identifier: string
  requestedAt: string
  issuedAt: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  reviewComment: string | null
}

export default function CertificateRequestsQueuePage() {
  const [rows, setRows] = useState<CertificateRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectComment, setRejectComment] = useState('')
  const [approveId, setApproveId] = useState<string | null>(null)
  const [approveComment, setApproveComment] = useState('')
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/portal/certificate-requests')
      const data = await res.json()
      if (data?.success) setRows(data.data || [])
      else toast.error(data?.error?.message || 'Laden fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }, [])

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
        setApproveId(null)
        setApproveComment('')
        load()
      } else {
        toast.error(data.error?.message || 'Ausstellen fehlgeschlagen')
      }
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
          <Award className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold">Zertifikats-Anträge</h1>
            <p className="text-sm text-muted-foreground">
              Anträge von Portal-Usern mit 100% abgeschlossenem Kurs prüfen und Zertifikat ausstellen
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aktualisieren'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Offene Anträge</span>
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
              <p className="text-sm text-muted-foreground">Keine offenen Anträge.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((r) => (
                <div key={r.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          Antrag vom {new Date(r.requestedAt).toLocaleString('de-DE')}
                        </span>
                        <Badge variant="outline" className="gap-1 flex items-center">
                          <Clock className="h-3 w-3" />
                          Offen
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
                        <span className="font-mono">{r.identifier}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => { setApproveId(r.id); setApproveComment('') }}
                      disabled={acting}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Zertifikat ausstellen
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!approveId} onOpenChange={(open) => !open && setApproveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zertifikat ausstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Glückwunsch-Kommentar (optional)</label>
            <Textarea
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder="Optional — wird dem Kunden angezeigt..."
              rows={3}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setApproveId(null)}>Abbrechen</Button>
            <Button onClick={submitApprove} disabled={acting}>
              {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ausstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
