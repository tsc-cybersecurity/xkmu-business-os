'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Loader2, ExternalLink } from 'lucide-react'
import dynamic from 'next/dynamic'

const SpiderChart = dynamic(() => import('@/components/din-audit/spider-chart'), { ssr: false })

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

interface Requirement {
  id: number
  number: string
  type: string
  topicArea: number
  questionText: string
  recommendationText: string | null
  isStatusQuestion: boolean
}

interface Answer {
  requirementId: number
  status: string
  justification: string | null
}

interface Grant {
  id: string
  name: string
  provider: string
  purpose: string | null
  url: string | null
  region: string
  minEmployees: number | null
  maxEmployees: number | null
}

interface AuditDetail {
  id: string
  status: string | null
  clientCompany: { id: string; name: string; city: string | null; employeeCount: number | null; country: string | null } | null
  answers: Answer[]
}

const riskColors: Record<string, string> = {
  green: 'bg-green-500',
  lightgreen: 'bg-emerald-400',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  gray: 'bg-gray-400',
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [scoring, setScoring] = useState<ScoringData | null>(null)
  const [audit, setAudit] = useState<AuditDetail | null>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [grants, setGrants] = useState<Grant[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [scoringRes, auditRes, reqRes] = await Promise.all([
        fetch(`/api/v1/din/audits/${id}/scoring`),
        fetch(`/api/v1/din/audits/${id}`),
        fetch('/api/v1/din/requirements'),
      ])
      const scoringData = await scoringRes.json()
      const auditData = await auditRes.json()
      const reqData = await reqRes.json()

      if (scoringData.success) setScoring(scoringData.data)
      if (auditData.success) setAudit(auditData.data)
      if (reqData.success) setRequirements(reqData.data.requirements)

      // Load matching grants
      if (auditData.success && auditData.data.clientCompany) {
        const company = auditData.data.clientCompany
        const grantParams = new URLSearchParams()
        if (company.employeeCount) grantParams.set('employeeCount', String(company.employeeCount))
        const grantsRes = await fetch(`/api/v1/din/grants?${grantParams}`)
        const grantsData = await grantsRes.json()
        if (grantsData.success) setGrants(grantsData.data.grants)
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!scoring || !audit) {
    return <p className="text-muted-foreground">Bericht nicht verfuegbar.</p>
  }

  // Group answers by topic
  const answerMap = new Map<number, Answer>()
  for (const answer of audit.answers || []) {
    answerMap.set(answer.requirementId, answer)
  }

  const notFulfilledReqs = requirements.filter(
    (req) => !req.isStatusQuestion && answerMap.get(req.id)?.status === 'not_fulfilled'
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/intern/din-audit/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            Audit-Bericht: {audit.clientCompany?.name || 'Unbekannt'}
          </h1>
          <p className="text-muted-foreground">DIN SPEC 27076 Ergebnisbericht</p>
        </div>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gesamtscore</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {scoring.currentScore} / {scoring.maxScore}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {Math.round((scoring.currentScore / scoring.maxScore) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Risikobewertung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className={`h-5 w-5 rounded-full ${riskColors[scoring.riskLevel.color]}`} />
              <span className="text-xl font-bold">{scoring.riskLevel.level}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{scoring.riskLevel.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Erfuellt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{scoring.fulfilledRequirements}</div>
            <p className="text-sm text-muted-foreground">von {scoring.totalRequirements} Anforderungen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Nicht erfuellt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{scoring.notFulfilledRequirements}</div>
            <p className="text-sm text-muted-foreground">Handlungsbedarf</p>
          </CardContent>
        </Card>
      </div>

      {/* Spider Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Erfuellungsgrad nach Themenbereich</CardTitle>
          <CardDescription>Radar-Diagramm der 6 Themenbereiche</CardDescription>
        </CardHeader>
        <CardContent>
          <SpiderChart
            topicProgress={scoring.topicProgress}
            topicNames={scoring.topicNames}
          />
        </CardContent>
      </Card>

      {/* Topic Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detailergebnisse pro Themenbereich</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(scoring.topicNames).map(([topicId, name]) => {
            const progress = scoring.topicProgress[Number(topicId)] || 0
            return (
              <div key={topicId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{name}</span>
                  <span className="font-bold">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {notFulfilledReqs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Empfehlungen</CardTitle>
            <CardDescription>
              Massnahmen fuer nicht erfuellte Anforderungen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {notFulfilledReqs.map((req) => (
              <div key={req.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={req.type === 'top' ? 'destructive' : 'secondary'}>
                    {req.type.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">Anforderung {req.number}</Badge>
                </div>
                <p className="text-sm font-medium">{req.questionText}</p>
                {req.recommendationText && (
                  <p className="text-sm text-muted-foreground">{req.recommendationText}</p>
                )}
                {answerMap.get(req.id)?.justification && (
                  <div className="text-sm bg-muted/50 p-2 rounded">
                    <strong>Begruendung:</strong> {answerMap.get(req.id)?.justification}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Matching Grants */}
      {grants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Passende Foerdermittel</CardTitle>
            <CardDescription>
              Foerderprogramme fuer {audit.clientCompany?.name}
              {audit.clientCompany?.employeeCount && ` (${audit.clientCompany.employeeCount} Mitarbeiter)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {grants.map((grant) => (
                <div key={grant.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{grant.name}</div>
                    <div className="text-sm text-muted-foreground">{grant.provider}</div>
                    {grant.purpose && (
                      <p className="text-sm">{grant.purpose}</p>
                    )}
                    <Badge variant="outline">{grant.region}</Badge>
                  </div>
                  {grant.url && (
                    <a href={grant.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
