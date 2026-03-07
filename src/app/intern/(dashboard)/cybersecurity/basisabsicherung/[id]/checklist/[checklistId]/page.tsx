'use client'

import { useEffect, useState, useRef, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft, Save, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

const MAX_NOTIZEN_LENGTH = 2000
const AUTO_SAVE_INTERVAL = 30000

type WibaAnswer = 'ja' | 'nein' | 'nicht_relevant'

interface Prueffrage {
  id: number
  checklistId: number
  questionNumber: number
  questionText: string
  hilfsmittel: string | null
  aufwandKategorie: number | null
  grundschutzRef: string | null
}

interface AnswerData {
  answer: WibaAnswer
  notizen: string
}

interface ChecklistData {
  id: number
  slug: string
  name: string
  description: string | null
  priority: number
  prueffragen: Prueffrage[]
}

const aufwandLabels: Record<number, string> = {
  1: 'Gering',
  2: 'Mittel',
  3: 'Hoch',
  4: 'Sehr hoch',
}

const aufwandColors: Record<number, string> = {
  1: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  2: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  3: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  4: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export default function ChecklistInterviewPage({
  params,
}: {
  params: Promise<{ id: string; checklistId: string }>
}) {
  const { id, checklistId } = use(params)
  const router = useRouter()
  const [checklist, setChecklist] = useState<ChecklistData | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<number, AnswerData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showHilfsmittel, setShowHilfsmittel] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const prueffragen = checklist?.prueffragen || []
  const currentFrage = prueffragen[currentIndex]
  const currentAnswer = currentFrage ? answers.get(currentFrage.id) : undefined

  const loadData = useCallback(async () => {
    try {
      const [clRes, ansRes] = await Promise.all([
        fetch(`/api/v1/wiba/checklists/${checklistId}`),
        fetch(`/api/v1/wiba/assessments/${id}/answers?checklistId=${checklistId}`),
      ])
      const clData = await clRes.json()
      const ansData = await ansRes.json()

      if (clData.success) {
        setChecklist(clData.data)
      }

      if (ansData.success && ansData.data.length > 0) {
        const existingAnswers = new Map<number, AnswerData>()
        for (const answer of ansData.data) {
          existingAnswers.set(answer.prueffrageId, {
            answer: answer.answer as WibaAnswer,
            notizen: answer.notizen || '',
          })
        }
        setAnswers(existingAnswers)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }, [id, checklistId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Update assessment status to in_progress if needed
  useEffect(() => {
    fetch(`/api/v1/wiba/assessments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    }).catch(() => {})
  }, [id])

  // Auto-save
  useEffect(() => {
    if (prueffragen.length === 0) return

    autoSaveTimerRef.current = setInterval(() => {
      autoSave()
    }, AUTO_SAVE_INTERVAL)

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prueffragen, answers])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return

      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault()
        setCurrentIndex(currentIndex - 1)
        setShowHilfsmittel(false)
      } else if (e.key === 'ArrowRight' && currentIndex < prueffragen.length - 1) {
        e.preventDefault()
        setCurrentIndex(currentIndex + 1)
        setShowHilfsmittel(false)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveCurrentAnswer()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, prueffragen.length])

  const autoSave = async () => {
    if (answers.size === 0) return
    setIsSaving(true)
    try {
      const answersArray = Array.from(answers.entries()).map(([frageId, answer]) => ({
        prueffrageId: frageId,
        answer: answer.answer,
        notizen: answer.notizen || undefined,
      }))
      await fetch(`/api/v1/wiba/assessments/${id}/answers`, {
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
    if (!currentFrage || !currentAnswer) return
    setIsSaving(true)
    try {
      await fetch(`/api/v1/wiba/assessments/${id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prueffrageId: currentFrage.id,
          answer: currentAnswer.answer,
          notizen: currentAnswer.notizen || undefined,
        }),
      })
      setLastSaved(new Date())
      toast.success('Gespeichert')
    } catch (error) {
      console.error('Failed to save answer:', error)
      toast.error('Speichern fehlgeschlagen')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAndNext = async () => {
    await handleSaveCurrentAnswer()
    if (currentIndex < prueffragen.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setShowHilfsmittel(false)
    } else {
      // All questions in this checklist answered - go back to dashboard
      router.push(`/intern/cybersecurity/basisabsicherung/${id}`)
    }
  }

  const setAnswer = (answer: WibaAnswer, notizen: string) => {
    if (!currentFrage) return
    const limitedNotizen = notizen.slice(0, MAX_NOTIZEN_LENGTH)
    const newAnswers = new Map(answers)
    newAnswers.set(currentFrage.id, { answer, notizen: limitedNotizen })
    setAnswers(newAnswers)
  }

  const getAnswerStatusIcon = (frageId: number) => {
    const answer = answers.get(frageId)
    if (!answer) return '\u25CB'
    if (answer.answer === 'ja') return '\u2713'
    if (answer.answer === 'nein') return '\u2717'
    return '\u2212'
  }

  const getAnswerStatusColor = (frageId: number) => {
    const answer = answers.get(frageId)
    if (!answer) return 'text-muted-foreground'
    if (answer.answer === 'ja') return 'text-green-600'
    if (answer.answer === 'nein') return 'text-red-600'
    return 'text-muted-foreground'
  }

  const getProgress = () => {
    const answeredCount = prueffragen.filter((f) => answers.has(f.id)).length
    return prueffragen.length > 0 ? (answeredCount / prueffragen.length) * 100 : 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!checklist || !currentFrage) {
    return <p className="text-muted-foreground">Keine Prueffragen verfuegbar.</p>
  }

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-card border-r flex flex-col shrink-0">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm">{checklist.name} ({prueffragen.length})</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSidebar(false)}>
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            <Progress value={getProgress()} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {prueffragen.filter((f) => answers.has(f.id)).length} von {prueffragen.length} beantwortet
            </p>
          </div>
          <div className="overflow-y-auto flex-1">
            {prueffragen.map((frage, index) => (
              <button
                key={frage.id}
                onClick={() => { setCurrentIndex(index); setShowHilfsmittel(false) }}
                className={`w-full p-3 text-left border-b hover:bg-accent transition-colors ${
                  index === currentIndex ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Frage {frage.questionNumber}</span>
                  <span className={`text-lg ${getAnswerStatusColor(frage.id)}`}>
                    {getAnswerStatusIcon(frage.id)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {frage.questionText}
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
            <Link href={`/intern/cybersecurity/basisabsicherung/${id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurueck
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Frage {currentIndex + 1} von {prueffragen.length}
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
            {/* Question Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">Frage {currentFrage.questionNumber}</Badge>
                  {currentFrage.aufwandKategorie && (
                    <Badge className={aufwandColors[currentFrage.aufwandKategorie]}>
                      Aufwand: {aufwandLabels[currentFrage.aufwandKategorie]}
                    </Badge>
                  )}
                  {currentFrage.grundschutzRef && (
                    <Badge variant="secondary">{currentFrage.grundschutzRef}</Badge>
                  )}
                </div>
                <CardTitle className="text-2xl">{currentFrage.questionText}</CardTitle>
              </CardHeader>
              {currentFrage.hilfsmittel && (
                <CardContent className="pt-0">
                  <button
                    onClick={() => setShowHilfsmittel(!showHilfsmittel)}
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {showHilfsmittel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Hilfsmittel & Hinweise
                  </button>
                  {showHilfsmittel && (
                    <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">{currentFrage.hilfsmittel}</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Answer Section */}
            <Card>
              <CardHeader>
                <CardTitle>Ihre Antwort</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-3 block">Bewertung:</label>
                  <div className="flex flex-col gap-2">
                    {[
                      { value: 'ja' as WibaAnswer, label: 'Ja - Umgesetzt', icon: '\u2713', color: 'border-green-500 bg-green-50 dark:bg-green-950' },
                      { value: 'nein' as WibaAnswer, label: 'Nein - Nicht umgesetzt', icon: '\u2717', color: 'border-red-500 bg-red-50 dark:bg-red-950' },
                      { value: 'nicht_relevant' as WibaAnswer, label: 'Nicht relevant', icon: '\u2212', color: 'border-gray-400 bg-gray-50 dark:bg-gray-900' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setAnswer(option.value, currentAnswer?.notizen || '')}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                          currentAnswer?.answer === option.value
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
                  <label htmlFor="notizen" className="text-sm font-medium mb-2 block">
                    Notizen ({currentAnswer?.notizen?.length || 0}/{MAX_NOTIZEN_LENGTH}):
                  </label>
                  <Textarea
                    id="notizen"
                    value={currentAnswer?.notizen || ''}
                    onChange={(e) =>
                      setAnswer(
                        currentAnswer?.answer || 'ja',
                        e.target.value
                      )
                    }
                    placeholder="Dokumentation, Begruendung oder Anmerkungen..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between items-center gap-4">
              <Button
                variant="outline"
                onClick={() => { setCurrentIndex(currentIndex - 1); setShowHilfsmittel(false) }}
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
                  {currentIndex < prueffragen.length - 1
                    ? 'Speichern & Weiter'
                    : 'Speichern & Zurueck'}
                  {currentIndex < prueffragen.length - 1 && (
                    <ChevronRight className="ml-1 h-4 w-4" />
                  )}
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => { setCurrentIndex(currentIndex + 1); setShowHilfsmittel(false) }}
                disabled={currentIndex === prueffragen.length - 1}
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
