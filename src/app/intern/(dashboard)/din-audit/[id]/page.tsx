'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Play, FileText, Loader2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/utils/logger'

interface ScoringData {
  currentScore: number
  maxScore: number
  topicProgress: Record<number, number>
  topicNames: Record<number, string>
  totalRequirements: number
  answeredRequirements: number
  fulfilledRequirements: number
  notFulfilledRequirements: number
  irrelevantRequirements: number
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
  approved: 'Freigegeben',
}

const riskColors: Record<string, string> = {
  green: 'bg-green-500',
  lightgreen: 'bg-emerald-400',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  gray: 'bg-gray-400',
}

export default function DinAuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [audit, setAudit] = useState<AuditDetail | null>(null)
  const [scoring, setScoring] = useState<ScoringData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [auditRes, scoringRes] = await Promise.all([
        fetch(`/api/v1/din/audits/${id}`),
        fetch(`/api/v1/din/audits/${id}/scoring`),
      ])
      const auditData = await auditRes.json()
      const scoringData = await scoringRes.json()

      if (auditData.success) setAudit(auditData.data)
      if (scoringData.success) setScoring(scoringData.data)
    } catch (error) {
      logger.error('Failed to fetch audit', error, { module: 'DinAuditPage' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleStartInterview = async () => {
    if (audit?.status === 'draft') {
      await fetch(`/api/v1/din/audits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress', startedAt: new Date().toISOString() }),
      })
    }
    router.push(`/intern/din-audit/${id}/interview`)
  }

  const handleDelete = async () => {
    if (!confirm('Audit wirklich loeschen?')) return
    const res = await fetch(`/api/v1/din/audits/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) router.push('/intern/din-audit')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!audit) {
    return <p className="text-muted-foreground">Audit nicht gefunden.</p>
  }

  const answeredCount = audit.answers?.length || 0
  const totalQuestions = 54
  const progressPercent = (answeredCount / totalQuestions) * 100

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/intern/din-audit">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {audit.clientCompany?.name || 'Audit'}
            </h1>
            <p className="text-muted-foreground">
              DIN SPEC 27076 Audit
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
        {/* Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fortschritt</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercent} className="h-3 mb-2" />
            <p className="text-sm text-muted-foreground">
              {answeredCount} von {totalQuestions} Fragen beantwortet
            </p>
          </CardContent>
        </Card>

        {/* Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gesamtscore</CardTitle>
          </CardHeader>
          <CardContent>
            {scoring ? (
              <div>
                <div className="text-3xl font-bold">
                  {scoring.currentScore} / {scoring.maxScore}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {Math.round((scoring.currentScore / scoring.maxScore) * 100)}% Erfuellungsgrad
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Noch keine Bewertung</p>
            )}
          </CardContent>
        </Card>

        {/* Risk Level */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Risikobewertung</CardTitle>
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

      {/* Topic Progress */}
      {scoring && scoring.topicNames && (
        <Card>
          <CardHeader>
            <CardTitle>Themenbereiche</CardTitle>
            <CardDescription>Erfuellungsgrad pro Themenbereich</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(scoring.topicNames).map(([topicId, name]) => {
              const progress = scoring.topicProgress[Number(topicId)] || 0
              return (
                <div key={topicId}>
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

      {/* Company Info */}
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

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleStartInterview} size="lg">
          <Play className="mr-2 h-4 w-4" />
          {audit.status === 'draft' ? 'Interview starten' : 'Interview fortsetzen'}
        </Button>
        {answeredCount > 0 && (
          <Link href={`/intern/din-audit/${id}/report`}>
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
