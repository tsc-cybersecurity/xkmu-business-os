'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, History, CheckCircle2, XCircle, Clock, ArrowLeft } from 'lucide-react'

interface ChangeRequest {
  id: string
  status: string
  proposedChanges: Record<string, unknown>
  requestedAt: string
  reviewedAt: string | null
  reviewComment: string | null
}

type BadgeVariant = 'outline' | 'default' | 'destructive' | 'secondary'

const STATUS_LABELS: Record<string, { label: string; variant: BadgeVariant; icon: React.ReactNode }> = {
  pending: { label: 'Offen', variant: 'outline', icon: <Clock className="h-3 w-3" /> },
  approved: { label: 'Genehmigt', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: 'Abgelehnt', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
}

export default function PortalChangeRequestsPage() {
  const [rows, setRows] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/portal/me/company/change-requests')
      const data = await res.json()
      if (data?.success) setRows(data.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const cancel = async (id: string) => {
    const res = await fetch(`/api/v1/portal/me/company/change-request/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      toast.success('Antrag storniert')
      load()
    } else {
      toast.error(data.error?.message || 'Stornieren fehlgeschlagen')
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <History className="h-6 w-6" />
            Meine Anträge
          </h1>
          <p className="text-muted-foreground">Historie Ihrer Firmendaten-Anträge</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/portal/company">
            <ArrowLeft className="h-4 w-4 mr-2" />Zur Firmendaten-Bearbeitung
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Noch keine Anträge eingereicht.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const sc = STATUS_LABELS[r.status] ?? STATUS_LABELS.pending
            const changes = r.proposedChanges as Record<string, string | null>
            return (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">
                      Antrag vom {new Date(r.requestedAt).toLocaleString('de-DE')}
                    </CardTitle>
                    {r.reviewedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Entschieden am {new Date(r.reviewedAt).toLocaleString('de-DE')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={sc.variant} className="gap-1">
                      {sc.icon}{sc.label}
                    </Badge>
                    {r.status === 'pending' && (
                      <Button variant="ghost" size="sm" onClick={() => cancel(r.id)}>
                        Stornieren
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="text-sm grid gap-1">
                    {Object.entries(changes).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="text-muted-foreground font-mono text-xs">{k}:</dt>
                        <dd>{v === null ? <em className="text-muted-foreground">(geleert)</em> : String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                  {r.reviewComment && (
                    <p className="mt-3 text-sm p-3 rounded bg-muted/50">
                      <strong className="text-xs text-muted-foreground">Admin-Kommentar:</strong><br />
                      {r.reviewComment}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
