'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, Plus, Loader2 } from 'lucide-react'

interface AuditSession {
  id: string
  status: string | null
  companyName: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
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
      console.error('Failed to fetch audits:', error)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">DIN SPEC 27076 Audits</h1>
          <p className="text-muted-foreground">
            IT-Sicherheitsaudits nach DIN SPEC 27076 durchfuehren und verwalten
          </p>
        </div>
        <Link href="/intern/din-audit/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neues Audit
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : audits.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldCheck className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-semibold">Noch keine Audits</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Erstellen Sie Ihr erstes IT-Sicherheitsaudit nach DIN SPEC 27076.
            </p>
            <Link href="/intern/din-audit/new" className="mt-4">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Erstes Audit erstellen
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {audits.map((audit) => (
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
                <CardContent className="pt-0">
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <span>Erstellt: {formatDate(audit.createdAt)}</span>
                    {audit.startedAt && <span>Gestartet: {formatDate(audit.startedAt)}</span>}
                    {audit.completedAt && <span>Abgeschlossen: {formatDate(audit.completedAt)}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
