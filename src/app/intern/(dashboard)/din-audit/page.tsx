'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, Plus, Loader2, CheckCircle2, XCircle, MinusCircle, ClipboardList } from 'lucide-react'
import { EmptyState } from '@/components/shared'
import { logger } from '@/lib/utils/logger'

interface AuditSession {
  id: string
  status: string | null
  companyName: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  answeredCount: number
  fulfilledCount: number
  notFulfilledCount: number
  irrelevantCount: number
  totalRequirements: number
}

const statusLabels: Record<string, string> = {
  draft: 'Entwurf',
  in_progress: 'In Bearbeitung',
  completed: 'Abgeschlossen',
  approved: 'Freigegeben',
}

const statusColors: Record<string, string> = {
  draft: 'secondary',
  in_progress: 'default',
  completed: 'outline',
  approved: 'default',
}

export default function DinAuditPage() {
  const [audits, setAudits] = useState<AuditSession[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAudits = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/din/audits')
      const data = await response.json()
      if (data.success) {
        setAudits(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch audits', error, { module: 'DinAuditPage' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAudits()
  }, [fetchAudits])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // Status summary counts
  const statusCounts = audits.reduce<Record<string, number>>((acc, a) => {
    const s = a.status || 'draft'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">DIN SPEC 27076 Audits</h1>
          <p className="text-muted-foreground">
            IT-Sicherheitsaudits nach DIN SPEC 27076 durchfuehren und verwalten
          </p>
        </div>
        <Link href="/intern/din-audit/new" className="self-start sm:self-auto">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neues Audit
          </Button>
        </Link>
      </div>

      {/* Status Summary */}
      {!loading && audits.length > 0 && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Entwurf</p>
                  <p className="text-2xl font-bold">{statusCounts.draft || 0}</p>
                </div>
                <ClipboardList className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Bearbeitung</p>
                  <p className="text-2xl font-bold">{statusCounts.in_progress || 0}</p>
                </div>
                <Loader2 className="h-8 w-8 text-blue-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Abgeschlossen</p>
                  <p className="text-2xl font-bold">{statusCounts.completed || 0}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Freigegeben</p>
                  <p className="text-2xl font-bold">{statusCounts.approved || 0}</p>
                </div>
                <ShieldCheck className="h-8 w-8 text-emerald-500/30" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : audits.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <EmptyState
              icon={ShieldCheck}
              title="Noch keine Audits"
              description="Erstellen Sie Ihr erstes IT-Sicherheitsaudit nach DIN SPEC 27076."
              action={
                <Link href="/intern/din-audit/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Erstes Audit erstellen
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {audits.map((audit) => {
            const progress = audit.totalRequirements > 0
              ? Math.round((audit.answeredCount / audit.totalRequirements) * 100)
              : 0

            return (
              <Link key={audit.id} href={`/intern/din-audit/${audit.id}`}>
                <Card className="transition-shadow hover:shadow-md cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {audit.companyName || 'Ohne Firma'}
                      </CardTitle>
                      <Badge variant={statusColors[audit.status || 'draft'] as 'default' | 'secondary' | 'outline'}>
                        {statusLabels[audit.status || 'draft']}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex gap-6 text-sm text-muted-foreground">
                      <span>Erstellt: {formatDate(audit.createdAt)}</span>
                      {audit.startedAt && <span>Gestartet: {formatDate(audit.startedAt)}</span>}
                      {audit.completedAt && <span>Abgeschlossen: {formatDate(audit.completedAt)}</span>}
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Fortschritt: {audit.answeredCount} / {audit.totalRequirements} Anforderungen
                        </span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Answer breakdown */}
                    {audit.answeredCount > 0 && (
                      <div className="flex gap-4 text-xs">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {audit.fulfilledCount} Erfuellt
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-3.5 w-3.5" />
                          {audit.notFulfilledCount} Nicht erfuellt
                        </span>
                        {audit.irrelevantCount > 0 && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <MinusCircle className="h-3.5 w-3.5" />
                            {audit.irrelevantCount} Irrelevant
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
