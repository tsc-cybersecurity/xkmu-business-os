'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Loader2, Download } from 'lucide-react'
import dynamic from 'next/dynamic'
import { generateWibaPdf } from '@/lib/services/wiba-pdf.service'
import { logger } from '@/lib/utils/logger'

const SpiderChart = dynamic(() => import('@/components/wiba/spider-chart'), { ssr: false })

interface ScoringData {
  currentScore: number
  maxScore: number
  categoryProgress: Record<number, number>
  categoryNames: Record<number, string>
  categoryOrder?: number[]
  categoryPriorities?: Record<number, number>
  totalRequirements: number
  answeredRequirements: number
  jaCount: number
  neinCount: number
  nichtRelevantCount: number
  riskLevel: { level: string; color: string; description: string }
}

interface Requirement {
  id: number
  number: string
  category: number
  questionText: string
  helpText: string | null
  effort: string | null
}

interface Answer {
  requirementId: number
  status: string
  notes: string | null
}

interface AuditDetail {
  id: string
  status: string | null
  completedAt: string | null
  clientCompany: {
    id: string; name: string; legalForm?: string | null
    street?: string | null; houseNumber?: string | null; postalCode?: string | null
    city: string | null; phone?: string | null; email?: string | null
    website?: string | null; industry?: string | null; employeeCount: number | null
  } | null
  consultant: { firstName?: string | null; lastName?: string | null; email: string } | null
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

export default function WibaReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [scoring, setScoring] = useState<ScoringData | null>(null)
  const [audit, setAudit] = useState<AuditDetail | null>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [scoringRes, auditRes, reqRes] = await Promise.all([
        fetch(`/api/v1/wiba/audits/${id}/scoring`),
        fetch(`/api/v1/wiba/audits/${id}`),
        fetch('/api/v1/wiba/requirements'),
      ])
      const scoringData = await scoringRes.json()
      const auditData = await auditRes.json()
      const reqData = await reqRes.json()

      if (scoringData.success) setScoring(scoringData.data)
      if (auditData.success) setAudit(auditData.data)
      if (reqData.success) setRequirements(reqData.data.requirements)
    } catch (error) {
      logger.error('Failed to fetch report data', error, { module: 'WibaReportPage' })
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

  const handleDownloadPdf = () => {
    if (!scoring || !audit) return
    const doc = generateWibaPdf({
      company: audit.clientCompany,
      consultant: audit.consultant,
      scoring,
      requirements,
      answers: audit.answers || [],
      categoryNames: scoring.categoryNames,
      categoryOrder: scoring.categoryOrder || Object.keys(scoring.categoryNames).map(Number),
      categoryPriorities: scoring.categoryPriorities || {},
      auditDate: audit.completedAt,
    })
    const fileName = `WiBA-Bericht_${(audit.clientCompany?.name || 'Unbekannt').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
    doc.save(fileName)
  }

  const answerMap = new Map<number, Answer>()
  for (const answer of audit.answers || []) {
    answerMap.set(answer.requirementId, answer)
  }

  const neinReqs = requirements.filter(
    (req) => answerMap.get(req.id)?.status === 'nein'
  )

  // Group nein requirements by category
  const neinByCategory = new Map<number, Requirement[]>()
  for (const req of neinReqs) {
    if (!neinByCategory.has(req.category)) {
      neinByCategory.set(req.category, [])
    }
    neinByCategory.get(req.category)!.push(req)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/intern/wiba/${id}`}>
            <Button variant="ghost" size="icon" aria-label="Zurueck">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              WiBA-Bericht: {audit.clientCompany?.name || 'Unbekannt'}
            </h1>
            <p className="text-muted-foreground">BSI WiBA Ergebnisbericht</p>
          </div>
        </div>
        <Button onClick={handleDownloadPdf} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          PDF herunterladen
        </Button>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Erfuellungsgrad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {scoring.currentScore} / {scoring.maxScore}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {scoring.maxScore > 0 ? Math.round((scoring.currentScore / scoring.maxScore) * 100) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bewertung</CardTitle>
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
            <CardTitle className="text-base">Ja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{scoring.jaCount}</div>
            <p className="text-sm text-muted-foreground">von {scoring.totalRequirements} Prueffragen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Nein</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{scoring.neinCount}</div>
            <p className="text-sm text-muted-foreground">Handlungsbedarf</p>
          </CardContent>
        </Card>
      </div>

      {/* Spider Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Erfuellungsgrad nach Kategorie</CardTitle>
          <CardDescription>Radar-Diagramm der 19 WiBA-Kategorien</CardDescription>
        </CardHeader>
        <CardContent>
          <SpiderChart
            categoryProgress={scoring.categoryProgress}
            categoryNames={scoring.categoryNames}
            categoryOrder={scoring.categoryOrder}
          />
        </CardContent>
      </Card>

      {/* Category Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detailergebnisse pro Kategorie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            { prio: 1, label: 'Prioritaet 1 - Grundlagen & groesste Cyberrisiken', color: 'text-red-700 dark:text-red-400' },
            { prio: 2, label: 'Prioritaet 2 - Schutz sensitiver IT-Systeme', color: 'text-orange-700 dark:text-orange-400' },
            { prio: 3, label: 'Prioritaet 3 - Informationsschutz intern/extern', color: 'text-yellow-700 dark:text-yellow-400' },
            { prio: 4, label: 'Prioritaet 4 - Weitere Bereiche', color: 'text-gray-600 dark:text-gray-400' },
          ].map((group) => {
            const catIds = (scoring.categoryOrder || Object.keys(scoring.categoryNames).map(Number))
              .filter((catId) => scoring.categoryPriorities?.[Number(catId)] === group.prio)
            if (catIds.length === 0) return null
            return (
              <div key={group.prio} className="space-y-3">
                <h4 className={`text-sm font-bold ${group.color}`}>{group.label}</h4>
                {catIds.map((catId) => {
                  const name = scoring.categoryNames[Number(catId)]
                  const progress = scoring.categoryProgress[Number(catId)] || 0
                  return (
                    <div key={catId}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{name}</span>
                        <span className="font-bold">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-3" />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Recommendations - grouped by category */}
      {neinReqs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Handlungsbedarf</CardTitle>
            <CardDescription>
              {neinReqs.length} Prueffragen mit &quot;Nein&quot; beantwortet - Massnahmen empfohlen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Array.from(neinByCategory.entries())
              .sort(([a], [b]) => {
                const order = scoring.categoryOrder || []
                const aIdx = order.indexOf(a)
                const bIdx = order.indexOf(b)
                if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
                return a - b
              })
              .map(([catId, reqs]) => {
                const priority = scoring.categoryPriorities?.[catId]
                return (
                <div key={catId}>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    {priority && (
                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                        priority === 1 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' :
                        priority === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' :
                        priority === 3 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>Prioritaet {priority}</span>
                    )}
                    {scoring.categoryNames[catId]}
                  </h3>
                  <div className="space-y-3">
                    {reqs.map((req) => (
                      <div key={req.id} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">Nein</Badge>
                          <Badge variant="outline">Frage {req.number}</Badge>
                          {req.effort && (
                            <Badge variant="secondary" className="text-xs">
                              Aufwand: {req.effort}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{req.questionText}</p>
                        {req.helpText && (
                          <p className="text-sm text-muted-foreground">{req.helpText}</p>
                        )}
                        {answerMap.get(req.id)?.notes && (
                          <div className="text-sm bg-muted/50 p-2 rounded">
                            <strong>Notizen:</strong> {answerMap.get(req.id)?.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                )
              })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
