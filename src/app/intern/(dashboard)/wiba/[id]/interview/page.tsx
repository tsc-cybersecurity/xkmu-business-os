'use client'

import { useEffect, useState, useRef, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft, Save, TrendingUp } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

type AnswerStatus = 'ja' | 'nein' | 'nicht_relevant'

interface Requirement {
  id: number
  number: string
  category: number
  questionText: string
  helpText: string | null
  effort: string | null
}

interface AnswerData {
  status: AnswerStatus
  notes: string
}

interface ScoringData {
  currentScore: number
  maxScore: number
  jaCount: number
  neinCount: number
  nichtRelevantCount: number
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

const EFFORT_LABELS: Record<string, string> = {
  '1': 'Gering',
  '2': 'Mittel',
  '3': 'Hoch',
  '4': 'Sehr hoch',
}

export default function WibaInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [categoryNames, setCategoryNames] = useState<Record<number, string>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<number, AnswerData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [scoring, setScoring] = useState<ScoringData | null>(null)
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentReq = requirements[currentIndex]
  const currentAnswer = currentReq ? answers.get(currentReq.id) : undefined

  const [categoryPriorities, setCategoryPriorities] = useState<Record<number, number>>({})

  const loadData = useCallback(async () => {
    try {
      const [reqRes, ansRes, scoreRes] = await Promise.all([
        fetch('/api/v1/wiba/requirements'),
        fetch(`/api/v1/wiba/audits/${id}/answers`),
        fetch(`/api/v1/wiba/audits/${id}/scoring`),
      ])
      const reqData = await reqRes.json()
      const ansData = await ansRes.json()
      const scoreData = await scoreRes.json()

      if (reqData.success) {
        setRequirements(reqData.data.requirements)
        setCategoryNames(reqData.data.categoryNames)
        if (reqData.data.categoryPriorities) {
          setCategoryPriorities(reqData.data.categoryPriorities)
        }
      }

      if (ansData.success && ansData.data.length > 0) {
        const existingAnswers = new Map<number, AnswerData>()
        for (const answer of ansData.data) {
          existingAnswers.set(answer.requirementId, {
            status: answer.status as AnswerStatus,
            notes: answer.notes || '',
          })
        }
        setAnswers(existingAnswers)
      }

      if (scoreData.success) {
        setScoring(scoreData.data)
      }
    } catch (error) {
      logger.error('Failed to load data', error, { module: 'WibaInterviewPage' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

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
      await fetch(`/api/v1/wiba/audits/${id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementId: reqId,
          status: answer.status,
          notes: answer.notes,
        }),
      })
      setLastSaved(new Date())
      const scoreRes = await fetch(`/api/v1/wiba/audits/${id}/scoring`)
      const scoreData = await scoreRes.json()
      if (scoreData.success) {
        setScoring(scoreData.data)
      }
    } catch (error) {
      logger.error('Failed to save answer', error, { module: 'WibaInterviewPage' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusClick = (status: AnswerStatus) => {
    if (!currentReq) return
    const notes = currentAnswer?.notes || ''
    const newAnswers = new Map(answers)
    const newAnswer: AnswerData = { status, notes }
    newAnswers.set(currentReq.id, newAnswer)
    setAnswers(newAnswers)
    saveAnswer(currentReq.id, newAnswer)
  }

  const handleNotesChange = (value: string) => {
    if (!currentReq) return
    const status = currentAnswer?.status || 'ja'
    const newAnswers = new Map(answers)
    const newAnswer: AnswerData = { status, notes: value }
    newAnswers.set(currentReq.id, newAnswer)
    setAnswers(newAnswers)
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current)
    notesTimerRef.current = setTimeout(() => {
      saveAnswer(currentReq.id, newAnswer)
    }, 500)
  }

  const handleSaveAndNext = async () => {
    await saveAnswer(currentReq?.id, currentAnswer)
    if (currentIndex < requirements.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      await fetch(`/api/v1/wiba/audits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', completedAt: new Date().toISOString() }),
      })
      router.push(`/intern/wiba/${id}/report`)
    }
  }

  const getAnswerStatusIcon = (reqId: number) => {
    const answer = answers.get(reqId)
    if (!answer) return '\u25CB'
    if (answer.status === 'ja') return '\u2713'
    if (answer.status === 'nein') return '\u2717'
    return '\u2212'
  }

  const getAnswerStatusColor = (reqId: number) => {
    const answer = answers.get(reqId)
    if (!answer) return 'text-muted-foreground'
    if (answer.status === 'ja') return 'text-green-600'
    if (answer.status === 'nein') return 'text-red-600'
    return 'text-muted-foreground'
  }

  const getProgress = () => {
    const answeredCount = requirements.filter((req) => answers.has(req.id)).length
    return requirements.length > 0 ? (answeredCount / requirements.length) * 100 : 0
  }

  // Group requirements by category for sidebar
  const getCategoryGroups = () => {
    const groups: { category: number; name: string; reqs: Requirement[] }[] = []
    let currentCat = -1
    for (const req of requirements) {
      if (req.category !== currentCat) {
        currentCat = req.category
        groups.push({ category: currentCat, name: categoryNames[currentCat] || `Kategorie ${currentCat}`, reqs: [] })
      }
      groups[groups.length - 1].reqs.push(req)
    }
    return groups
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!currentReq) {
    return <p className="text-muted-foreground">Keine Fragen verfügbar.</p>
  }

  const categoryGroups = getCategoryGroups()
  const effortBase = currentReq.effort?.replace(/\s/g, '').split('-')[0] || '2'

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-card border-r flex flex-col shrink-0">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Prueffragen ({requirements.length})</h2>
              <Button variant="ghost" size="icon" aria-label="Seitenleiste schliessen" onClick={() => setShowSidebar(false)}>
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            <Progress value={getProgress()} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {requirements.filter((req) => answers.has(req.id)).length} von {requirements.length} beantwortet
            </p>
          </div>

          {scoring && (
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">
                  Erfuellt: {scoring.currentScore} / {scoring.maxScore}
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
            {[
              { prio: 1, label: 'Prioritaet 1', color: 'bg-red-600 dark:bg-red-700' },
              { prio: 2, label: 'Prioritaet 2', color: 'bg-orange-600 dark:bg-orange-700' },
              { prio: 3, label: 'Prioritaet 3', color: 'bg-yellow-600 dark:bg-yellow-700' },
              { prio: 4, label: 'Prioritaet 4', color: 'bg-gray-500 dark:bg-gray-600' },
            ].map((prioGroup) => {
              const groups = categoryGroups.filter(g => categoryPriorities[g.category] === prioGroup.prio)
              if (groups.length === 0) return null
              return (
                <div key={prioGroup.prio}>
                  <div className={`px-3 py-1.5 text-[10px] font-bold text-white uppercase tracking-widest ${prioGroup.color}`}>
                    {prioGroup.label}
                  </div>
                  {groups.map((group) => (
                    <div key={group.category}>
                      <div className="px-3 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0">
                        {group.name}
                      </div>
                      {group.reqs.map((req) => {
                        const globalIndex = requirements.indexOf(req)
                        return (
                          <button
                            key={req.id}
                            onClick={() => setCurrentIndex(globalIndex)}
                            className={`w-full p-2.5 text-left border-b hover:bg-accent transition-colors ${
                              globalIndex === currentIndex ? 'bg-accent' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Frage {req.number}</span>
                              <span className={`text-lg ${getAnswerStatusColor(req.id)}`}>
                                {getAnswerStatusIcon(req.id)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {req.questionText}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="border-b bg-muted/30 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {!showSidebar && (
              <Button variant="ghost" size="icon" aria-label="Seitenleiste öffnen" onClick={() => setShowSidebar(true)}>
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
            <Link href={`/intern/wiba/${id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurueck zur Uebersicht
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {scoring && (
              <span className="text-sm font-medium">
                {scoring.currentScore} / {scoring.maxScore} erfuellt
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
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{categoryNames[currentReq.category]}</Badge>
                  <Badge variant="secondary">Frage {currentReq.number}</Badge>
                  {currentReq.effort && (
                    <Badge variant="outline" className="text-xs">
                      Aufwand: {EFFORT_LABELS[effortBase] || currentReq.effort}
                    </Badge>
                  )}
                </div>
                {currentReq.bsiBausteine && currentReq.bsiBausteine.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground mr-1">BSI Grundschutz:</span>
                    {currentReq.bsiAnforderungen.map((anf: string) => (
                      <Badge key={anf} variant="outline" className="text-[10px] font-mono bg-blue-50 text-blue-700">
                        {anf}
                      </Badge>
                    ))}
                  </div>
                )}
                <CardTitle className="text-2xl">{currentReq.questionText}</CardTitle>
              </CardHeader>
            </Card>

            {currentReq.helpText && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Hilfsmittel / Erlaeuterung:</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-line">{currentReq.helpText}</p>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Ihre Antwort</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-3 block">Status auswaehlen:</label>
                  <div className="flex flex-col gap-2">
                    {[
                      { value: 'ja' as AnswerStatus, label: 'Ja', icon: '\u2713', color: 'border-green-500 bg-green-50 dark:bg-green-950' },
                      { value: 'nein' as AnswerStatus, label: 'Nein', icon: '\u2717', color: 'border-red-500 bg-red-50 dark:bg-red-950' },
                      { value: 'nicht_relevant' as AnswerStatus, label: 'Nicht relevant', icon: '\u2212', color: 'border-gray-400 bg-gray-50 dark:bg-gray-900' },
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
                  <label htmlFor="notes" className="text-sm font-medium mb-2 block">
                    Notizen:
                  </label>
                  <Textarea
                    id="notes"
                    value={currentAnswer?.notes || ''}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Optionale Notizen zu dieser Prueffrage..."
                    rows={4}
                  />
                </div>
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
