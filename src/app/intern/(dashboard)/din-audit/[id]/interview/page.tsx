'use client'

import { useEffect, useState, useRef, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft, Save } from 'lucide-react'

const MAX_JUSTIFICATION_LENGTH = 500
const AUTO_SAVE_INTERVAL = 30000

type AnswerStatus = 'fulfilled' | 'not_fulfilled' | 'irrelevant'

interface Requirement {
  id: number
  number: string
  groupNumber: string | null
  componentNumber: number | null
  type: string
  topicArea: number
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
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentReq = requirements[currentIndex]
  const currentAnswer = currentReq ? answers.get(currentReq.id) : undefined

  const loadData = useCallback(async () => {
    try {
      const [reqRes, ansRes] = await Promise.all([
        fetch('/api/v1/din/requirements'),
        fetch(`/api/v1/din/audits/${id}/answers`),
      ])
      const reqData = await reqRes.json()
      const ansData = await ansRes.json()

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
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Auto-save
  useEffect(() => {
    if (requirements.length === 0) return

    autoSaveTimerRef.current = setInterval(() => {
      autoSave()
    }, AUTO_SAVE_INTERVAL)

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirements, answers])

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
        handleSaveCurrentAnswer()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, requirements.length])

  const autoSave = async () => {
    if (answers.size === 0) return
    setIsSaving(true)
    try {
      const answersArray = Array.from(answers.entries()).map(([reqId, answer]) => ({
        requirementId: reqId,
        status: answer.status,
        justification: answer.justification,
      }))
      await fetch(`/api/v1/din/audits/${id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersArray }),
      })
      setLastSaved(new Date())
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveCurrentAnswer = async () => {
    if (!currentReq || !currentAnswer) return
    setIsSaving(true)
    try {
      await fetch(`/api/v1/din/audits/${id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementId: currentReq.id,
          status: currentAnswer.status,
          justification: currentAnswer.justification,
        }),
      })
      setLastSaved(new Date())
    } catch (error) {
      console.error('Failed to save answer:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAndNext = async () => {
    await handleSaveCurrentAnswer()
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

  const setAnswer = (status: AnswerStatus, justification: string) => {
    if (!currentReq) return
    const limitedJustification = justification.slice(0, MAX_JUSTIFICATION_LENGTH)
    const newAnswers = new Map(answers)
    newAnswers.set(currentReq.id, { status, justification: limitedJustification })
    setAnswers(newAnswers)
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
                  <span className="text-sm font-medium">{req.number}</span>
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
                        onClick={() => setAnswer(option.value, currentAnswer?.justification || '')}
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
                    onChange={(e) =>
                      setAnswer(
                        currentAnswer?.status || 'fulfilled',
                        e.target.value
                      )
                    }
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
                <Button variant="outline" onClick={handleSaveCurrentAnswer} disabled={!currentAnswer}>
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
