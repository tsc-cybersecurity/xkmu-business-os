'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Play, FileText, Loader2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ScoringData {
  currentScore: number
  maxScore: number
  categoryProgress: Record<number, number>
  categoryNames: Record<number, string>
  totalRequirements: number
  answeredRequirements: number
  jaCount: number
  neinCount: number
  nichtRelevantCount: number
  riskLevel: { level: string; color: string; description: string }
}

interface AuditDetail {
  id: string
  status: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  clientCompany: { id: string; name: string; city: string | null; employeeCount: number | null } | null
  consultant: { id: string; firstName: string | null; lastName: string | null; email: string } | null
  answers: Array<{ id: string; requirementId: number; status: string }>
}

const statusLabels: Record<string, string> = {
  draft: 'Entwurf',
  in_progress: 'In Bearbeitung',
  completed: 'Abgeschlossen',
}

const riskColors: Record<string, string> = {
  green: 'bg-green-500',
  lightgreen: 'bg-emerald-400',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  gray: 'bg-gray-400',
}

export default function WibaAuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [audit, setAudit] = useState<AuditDetail | null>(null)
  const [scoring, setScoring] = useState<ScoringData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [auditRes, scoringRes] = await Promise.all([
        fetch(`/api/v1/wiba/audits/${id}`),
        fetch(`/api/v1/wiba/audits/${id}/scoring`),
      ])
      const auditData = await auditRes.json()
      const scoringData = await scoringRes.json()

      if (auditData.success) setAudit(auditData.data)
      if (scoringData.success) setScoring(scoringData.data)
    } catch (error) {
      console.error('Failed to fetch WiBA audit:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleStartInterview = async () => {
    if (audit?.status === 'draft') {
      await fetch(`/api/v1/wiba/audits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress', startedAt: new Date().toISOString() }),
      })
    }
    router.push(`/intern/wiba/${id}/interview`)
  }

  const handleDelete = async () => {
    if (!confirm('WiBA-Check wirklich loeschen?')) return
    const res = await fetch(`/api/v1/wiba/audits/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) router.push('/intern/wiba')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!audit) {
    return <p className="text-muted-foreground">WiBA-Check nicht gefunden.</p>
  }

  const answeredCount = audit.answers?.length || 0
  const totalQuestions = 257
  const progressPercent = (answeredCount / totalQuestions) * 100

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/intern/wiba">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {audit.clientCompany?.name || 'WiBA-Check'}
            </h1>
            <p className="text-muted-foreground">
              BSI WiBA - Weg in die Basis-Absicherung
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{statusLabels[audit.status || 'draft']}</Badge>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fortschritt</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercent} className="h-3 mb-2" />
            <p className="text-sm text-muted-foreground">
              {answeredCount} von {totalQuestions} Prueffragen beantwortet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Erfuellungsgrad</CardTitle>
          </CardHeader>
          <CardContent>
            {scoring ? (
              <div>
                <div className="text-3xl font-bold">
                  {scoring.currentScore} / {scoring.maxScore}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {scoring.maxScore > 0 ? Math.round((scoring.currentScore / scoring.maxScore) * 100) : 0}% erfuellt
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Noch keine Bewertung</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bewertung</CardTitle>
          </CardHeader>
          <CardContent>
            {scoring?.riskLevel ? (
              <div className="flex items-center gap-3">
                <div className={`h-4 w-4 rounded-full ${riskColors[scoring.riskLevel.color]}`} />
                <div>
                  <div className="font-semibold">{scoring.riskLevel.level}</div>
                  <p className="text-xs text-muted-foreground">{scoring.riskLevel.description}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Noch keine Bewertung</p>
            )}
          </CardContent>
        </Card>
      </div>

      {scoring && scoring.categoryNames && (
        <Card>
          <CardHeader>
            <CardTitle>Kategorien</CardTitle>
            <CardDescription>Erfuellungsgrad pro Kategorie (19 Bereiche)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(scoring.categoryNames).map(([catId, name]) => {
              const progress = scoring.categoryProgress[Number(catId)] || 0
              return (
                <div key={catId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{name}</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {audit.clientCompany && (
        <Card>
          <CardHeader>
            <CardTitle>Unternehmensdaten</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Firma</dt>
                <dd className="font-medium">{audit.clientCompany.name}</dd>
              </div>
              {audit.clientCompany.city && (
                <div>
                  <dt className="text-muted-foreground">Ort</dt>
                  <dd className="font-medium">{audit.clientCompany.city}</dd>
                </div>
              )}
              {audit.clientCompany.employeeCount && (
                <div>
                  <dt className="text-muted-foreground">Mitarbeiter</dt>
                  <dd className="font-medium">{audit.clientCompany.employeeCount}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button onClick={handleStartInterview} size="lg">
          <Play className="mr-2 h-4 w-4" />
          {audit.status === 'draft' ? 'Check starten' : 'Check fortsetzen'}
        </Button>
        {answeredCount > 0 && (
          <Link href={`/intern/wiba/${id}/report`}>
            <Button variant="outline" size="lg">
              <FileText className="mr-2 h-4 w-4" />
              Bericht anzeigen
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
