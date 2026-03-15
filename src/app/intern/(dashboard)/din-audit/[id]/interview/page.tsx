'use client'

import { useEffect, useState, useRef, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft, Save, TrendingUp } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

const MAX_JUSTIFICATION_LENGTH = 500

type AnswerStatus = 'fulfilled' | 'not_fulfilled' | 'irrelevant'

interface Requirement {
  id: number
  number: string
  groupNumber: string | null
  componentNumber: number | null
  type: string
  topicArea: number
  points: number | null
  officialAnforderungText: string
  questionText: string
  recommendationText: string | null
  isStatusQuestion: boolean
  dependsOn: number | null
}

interface AnswerData {
  status: AnswerStatus
  justification: string
}

interface ScoringData {
  currentScore: number
  maxScore: number
  fulfilledRequirements: number
  notFulfilledRequirements: number
  irrelevantRequirements: number
  answeredRequirements: number
  riskLevel: { level: string; color: string; description: string }
}

const RISK_COLORS: Record<string, string> = {
  green: 'text-green-600',
  lightgreen: 'text-green-500',
  yellow: 'text-yellow-600',
  orange: 'text-orange-600',
  red: 'text-red-600',
  gray: 'text-muted-foreground',
}

export default function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<number, AnswerData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [scoring, setScoring] = useState<ScoringData | null>(null)
  const justificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentReq = requirements[currentIndex]
  const currentAnswer = currentReq ? answers.get(currentReq.id) : undefined

  const loadData = useCallback(async () => {
    try {
      const [reqRes, ansRes, scoreRes] = await Promise.all([
        fetch('/api/v1/din/requirements'),
        fetch(`/api/v1/din/audits/${id}/answers`),
        fetch(`/api/v1/din/audits/${id}/scoring`),
      ])
      const reqData = await reqRes.json()
      const ansData = await ansRes.json()
      const scoreData = await scoreRes.json()

      if (reqData.success) {
        setRequirements(reqData.data.requirements)
      }

      if (ansData.success && ansData.data.length > 0) {
        const existingAnswers = new Map<number, AnswerData>()
        for (const answer of ansData.data) {
          existingAnswers.set(answer.requirementId, {
            status: answer.status as AnswerStatus,
            justification: answer.justification || '',
          })
        }
        setAnswers(existingAnswers)
      }

      if (scoreData.success) {
        setScoring(scoreData.data)
      }
    } catch (error) {
      logger.error('Failed to load data', error, { module: 'DinAuditInterviewPage' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return

      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault()
        setCurrentIndex(currentIndex - 1)
      } else if (e.key === 'ArrowRight' && currentIndex < requirements.length - 1) {
        e.preventDefault()
        setCurrentIndex(currentIndex + 1)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveAnswer(currentReq?.id, answers.get(currentReq?.id))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, requirements.length, answers])

  const saveAnswer = async (reqId: number | undefined, answer: AnswerData | undefined) => {
    if (!reqId || !answer) return
    setIsSaving(true)
    try {
      await fetch(`/api/v1/din/audits/${id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementId: reqId,
          status: answer.status,
          justification: answer.justification,
        }),
      })
      setLastSaved(new Date())
      // Refresh scoring after save
      const scoreRes = await fetch(`/api/v1/din/audits/${id}/scoring`)
      const scoreData = await scoreRes.json()
      if (scoreData.success) {
        setScoring(scoreData.data)
      }
    } catch (error) {
      logger.error('Failed to save answer', error, { module: 'DinAuditInterviewPage' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusClick = (status: AnswerStatus) => {
    if (!currentReq) return
    const justification = currentAnswer?.justification || ''
    const newAnswers = new Map(answers)
    const newAnswer: AnswerData = { status, justification }
    newAnswers.set(currentReq.id, newAnswer)
    setAnswers(newAnswers)
    // Immediately save on status click
    saveAnswer(currentReq.id, newAnswer)
  }

  const handleJustificationChange = (value: string) => {
    if (!currentReq) return
    const limitedValue = value.slice(0, MAX_JUSTIFICATION_LENGTH)
    const status = currentAnswer?.status || 'fulfilled'
    const newAnswers = new Map(answers)
    const newAnswer: AnswerData = { status, justification: limitedValue }
    newAnswers.set(currentReq.id, newAnswer)
    setAnswers(newAnswers)
    // Debounce justification saves (500ms)
    if (justificationTimerRef.current) clearTimeout(justificationTimerRef.current)
    justificationTimerRef.current = setTimeout(() => {
      saveAnswer(currentReq.id, newAnswer)
    }, 500)
  }

  const handleSaveAndNext = async () => {
    await saveAnswer(currentReq?.id, currentAnswer)
    if (currentIndex < requirements.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Complete the audit
      await fetch(`/api/v1/din/audits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', completedAt: new Date().toISOString() }),
      })
      router.push(`/intern/din-audit/${id}/report`)
    }
  }

  const getAnswerStatusIcon = (reqId: number) => {
    const answer = answers.get(reqId)
    if (!answer) return '\u25CB'
    if (answer.status === 'fulfilled') return '\u2713'
    if (answer.status === 'not_fulfilled') return '\u2717'
    return '\u2212'
  }

  const getAnswerStatusColor = (reqId: number) => {
    const answer = answers.get(reqId)
    if (!answer) return 'text-muted-foreground'
    if (answer.status === 'fulfilled') return 'text-green-600'
    if (answer.status === 'not_fulfilled') return 'text-red-600'
    return 'text-muted-foreground'
  }

  const getProgress = () => {
    const answeredCount = requirements.filter((req) => answers.has(req.id)).length
    return requirements.length > 0 ? (answeredCount / requirements.length) * 100 : 0
  }

  // Get scoring info for the current requirement's group
  const getGroupScoringInfo = (req: Requirement) => {
    if (req.isStatusQuestion) {
      return { label: 'Statusabfrage', detail: 'Bestimmt, ob Folgefragen relevant sind', pointsLabel: null }
    }

    const groupKey = req.groupNumber || req.number
    const groupReqs = requirements.filter(
      (r) => !r.isStatusQuestion && (r.groupNumber === groupKey || (!r.groupNumber && r.number === groupKey))
    )
    const isGrouped = groupReqs.length > 1
    const points = req.type === 'top' ? 3 : 1

    // Determine group fulfillment status
    const groupAnswers = groupReqs.map((r) => answers.get(r.id))
    const allAnswered = groupAnswers.every((a) => a !== undefined)
    const allFulfilled = allAnswered && groupAnswers.every((a) => a?.status === 'fulfilled')
    const anyNotFulfilled = groupAnswers.some((a) => a?.status === 'not_fulfilled')
    const anyIrrelevant = groupAnswers.some((a) => a?.status === 'irrelevant')

    let statusText = ''
    let statusColor = 'text-muted-foreground'
    if (anyIrrelevant) {
      statusText = 'Nicht relevant - Punkte entfallen'
      statusColor = 'text-muted-foreground'
    } else if (allFulfilled) {
      statusText = req.type === 'top' ? `+${points} Punkte` : `+${points} Punkt`
      statusColor = 'text-green-600'
    } else if (anyNotFulfilled && req.type === 'top') {
      statusText = `\u2212${points} Punkte`
      statusColor = 'text-red-600'
    } else if (anyNotFulfilled) {
      statusText = '0 Punkte'
      statusColor = 'text-orange-600'
    }

    const detail = isGrouped
      ? `Gruppe ${groupKey}: ${groupReqs.length} Teilanforderungen - alle muessen erfuellt sein`
      : `Einzelanforderung ${groupKey}`

    return {
      label: req.type === 'top' ? `TOP-Anforderung (${points} Pkt.)` : `Anforderung (${points} Pkt.)`,
      detail,
      pointsLabel: statusText || null,
      pointsColor: statusColor,
      groupReqs: isGrouped ? groupReqs : null,
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!currentReq) {
    return <p className="text-muted-foreground">Keine Fragen verfuegbar.</p>
  }

  const groupInfo = getGroupScoringInfo(currentReq)

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-card border-r flex flex-col shrink-0">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Fragen ({requirements.length})</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSidebar(false)}>
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            <Progress value={getProgress()} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {requirements.filter((req) => answers.has(req.id)).length} von {requirements.length} beantwortet
            </p>
          </div>

          {/* Live Score in Sidebar */}
          {scoring && (
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">
                  Punktestand: {scoring.currentScore} / {scoring.maxScore}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Progress
                  value={scoring.maxScore > 0 ? (scoring.currentScore / scoring.maxScore) * 100 : 0}
                  className="h-1.5 flex-1"
                />
                <span className={`text-xs font-medium ${RISK_COLORS[scoring.riskLevel.color] || 'text-muted-foreground'}`}>
                  {scoring.riskLevel.level}
                </span>
              </div>
            </div>
          )}

          <div className="overflow-y-auto flex-1">
            {requirements.map((req, index) => (
              <button
                key={req.id}
                onClick={() => setCurrentIndex(index)}
                className={`w-full p-3 text-left border-b hover:bg-accent transition-colors ${
                  index === currentIndex ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">{req.number}</span>
                    {req.points !== null && req.points > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        ({req.type === 'top' ? `${req.points}P` : `${req.points}P`})
                      </span>
                    )}
                  </div>
                  <span className={`text-lg ${getAnswerStatusColor(req.id)}`}>
                    {getAnswerStatusIcon(req.id)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {req.questionText}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="border-b bg-muted/30 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {!showSidebar && (
              <Button variant="ghost" size="icon" onClick={() => setShowSidebar(true)}>
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
            <Link href={`/intern/din-audit/${id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurueck zur Uebersicht
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {scoring && (
              <span className="text-sm font-medium">
                {scoring.currentScore} / {scoring.maxScore} Punkte
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              Frage {currentIndex + 1} von {requirements.length}
            </span>
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                {isSaving ? 'Speichert...' : `Gespeichert: ${lastSaved.toLocaleTimeString('de-DE')}`}
              </span>
            )}
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Requirement Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={currentReq.type === 'top' ? 'destructive' : 'secondary'}>
                    {currentReq.type.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">Anforderung {currentReq.number}</Badge>
                  {currentReq.isStatusQuestion && (
                    <Badge variant="outline">Statusabfrage</Badge>
                  )}
                </div>
                <CardTitle className="text-2xl">{currentReq.questionText}</CardTitle>
                {currentReq.officialAnforderungText && !currentReq.isStatusQuestion && (
                  <CardDescription className="mt-4">
                    <strong>Offizielle Anforderung:</strong><br />
                    {currentReq.officialAnforderungText}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>

            {/* Scoring Info Card */}
            <div className="p-4 bg-muted/50 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold">{groupInfo.label}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{groupInfo.detail}</p>
                </div>
                {groupInfo.pointsLabel && (
                  <span className={`text-sm font-bold ${groupInfo.pointsColor}`}>
                    {groupInfo.pointsLabel}
                  </span>
                )}
              </div>
              {/* Show group component status for grouped requirements */}
              {groupInfo.groupReqs && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {groupInfo.groupReqs.map((r) => {
                    const a = answers.get(r.id)
                    return (
                      <span
                        key={r.id}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border ${
                          a?.status === 'fulfilled'
                            ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300'
                            : a?.status === 'not_fulfilled'
                              ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300'
                              : a?.status === 'irrelevant'
                                ? 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400'
                                : 'bg-muted border-border text-muted-foreground'
                        }`}
                      >
                        {r.number}
                        {a ? (
                          a.status === 'fulfilled' ? ' \u2713' : a.status === 'not_fulfilled' ? ' \u2717' : ' \u2212'
                        ) : ' \u25CB'}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Answer Section */}
            <Card>
              <CardHeader>
                <CardTitle>Ihre Antwort</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-3 block">Status auswaehlen:</label>
                  <div className="flex flex-col gap-2">
                    {[
                      { value: 'fulfilled' as AnswerStatus, label: 'Erfuellt', icon: '\u2713', color: 'border-green-500 bg-green-50 dark:bg-green-950' },
                      { value: 'not_fulfilled' as AnswerStatus, label: 'Nicht erfuellt', icon: '\u2717', color: 'border-red-500 bg-red-50 dark:bg-red-950' },
                      { value: 'irrelevant' as AnswerStatus, label: 'Nicht relevant', icon: '\u2212', color: 'border-gray-400 bg-gray-50 dark:bg-gray-900' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleStatusClick(option.value)}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                          currentAnswer?.status === option.value
                            ? option.color
                            : 'border-transparent bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        <span className="text-lg font-bold">{option.icon}</span>
                        <span className="font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="justification" className="text-sm font-medium mb-2 block">
                    Begruendung ({currentAnswer?.justification?.length || 0}/{MAX_JUSTIFICATION_LENGTH}):
                  </label>
                  <Textarea
                    id="justification"
                    value={currentAnswer?.justification || ''}
                    onChange={(e) => handleJustificationChange(e.target.value)}
                    placeholder="Bitte begruenden Sie Ihre Antwort..."
                    rows={4}
                  />
                </div>

                {currentReq.recommendationText && !currentReq.isStatusQuestion && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Empfehlung:</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">{currentReq.recommendationText}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex(currentIndex - 1)}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Vorherige
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => saveAnswer(currentReq?.id, currentAnswer)} disabled={!currentAnswer}>
                  <Save className="mr-1 h-4 w-4" />
                  Speichern
                </Button>
                <Button onClick={handleSaveAndNext} disabled={!currentAnswer}>
                  {currentIndex < requirements.length - 1
                    ? 'Speichern & Weiter'
                    : 'Speichern & Abschliessen'}
                  {currentIndex < requirements.length - 1 && (
                    <ChevronRight className="ml-1 h-4 w-4" />
                  )}
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => setCurrentIndex(currentIndex + 1)}
                disabled={currentIndex === requirements.length - 1}
              >
                Naechste
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
