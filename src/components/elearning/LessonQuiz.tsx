'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface ConsumerOption { id: string; text: string }
interface ConsumerQuestion {
  id: string
  kind: 'single' | 'multiple' | 'truefalse'
  prompt: string
  options: ConsumerOption[]
}

interface PerQuestionResult {
  questionId: string
  correct: boolean
  correctOptionIds: string[]
  explanation: string | null
}

interface Props {
  courseId: string
  lessonId: string
  quiz: { id: string; passThreshold: number; allowRetake: boolean }
  questions: ConsumerQuestion[]
  alreadyPassed: boolean
  lastScore?: number
}

export function LessonQuiz({ courseId, lessonId, quiz, questions, alreadyPassed, lastScore }: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    score: number
    passed: boolean
    perQuestion: PerQuestionResult[]
  } | null>(null)
  const [retake, setRetake] = useState(false)

  const showQuiz = !alreadyPassed || retake
  const allAnswered = questions.every((q) => (answers[q.id] ?? []).length > 0)

  function setSingle(questionId: string, optionId: string) {
    setAnswers((s) => ({ ...s, [questionId]: [optionId] }))
  }

  function toggleMulti(questionId: string, optionId: string) {
    setAnswers((s) => {
      const cur = new Set(s[questionId] ?? [])
      if (cur.has(optionId)) cur.delete(optionId)
      else cur.add(optionId)
      return { ...s, [questionId]: Array.from(cur) }
    })
  }

  async function submit() {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/lessons/${lessonId}/quiz/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error?.message ?? 'Abschicken fehlgeschlagen')
        return
      }
      setResult({
        score: json.data.score,
        passed: json.data.passed,
        perQuestion: json.data.perQuestion,
      })
      if (json.data.passed) {
        toast.success(`Bestanden — ${json.data.score} %`)
        router.refresh()
      } else {
        toast.error(`Nicht bestanden (${json.data.score} %, benötigt ${quiz.passThreshold} %)`)
      }
    } catch (err) {
      logger.error('Quiz submit failed', err, { module: 'LessonQuiz' })
      toast.error('Abschicken fehlgeschlagen')
    } finally {
      setSubmitting(false)
    }
  }

  if (alreadyPassed && !retake) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Quiz bestanden
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Du hast diese Lektion erfolgreich abgeschlossen
            {typeof lastScore === 'number' ? ` mit ${lastScore} %` : ''}.
          </p>
          {quiz.allowRetake && (
            <Button variant="outline" size="sm" onClick={() => { setRetake(true); setResult(null); setAnswers({}) }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Erneut versuchen
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  if (result) {
    const perQ = new Map(result.perQuestion.map((p) => [p.questionId, p]))
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result.passed ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            Ergebnis: {result.score} %
            <Badge variant="outline" className="ml-2">
              Bestanden ab {quiz.passThreshold} %
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((q, idx) => {
            const pq = perQ.get(q.id)
            const correctIds = new Set(pq?.correctOptionIds ?? [])
            const userAnswered = new Set(answers[q.id] ?? [])
            return (
              <div key={q.id} className="space-y-2 rounded-md border p-3">
                <div className="flex items-start gap-2">
                  {pq?.correct ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                  )}
                  <div className="font-medium">
                    {idx + 1}. {q.prompt}
                  </div>
                </div>
                <ul className="space-y-1 text-sm">
                  {q.options.map((o) => {
                    const isCorrect = correctIds.has(o.id)
                    const wasSelected = userAnswered.has(o.id)
                    return (
                      <li
                        key={o.id}
                        className={
                          isCorrect
                            ? 'text-green-700'
                            : wasSelected
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                        }
                      >
                        {isCorrect ? '✓ ' : wasSelected ? '✗ ' : '  '}
                        {o.text}
                      </li>
                    )
                  })}
                </ul>
                {pq?.explanation && (
                  <p className="text-xs text-muted-foreground italic">{pq.explanation}</p>
                )}
              </div>
            )
          })}
          {!result.passed && quiz.allowRetake && (
            <Button onClick={() => { setResult(null); setAnswers({}) }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Nochmal versuchen
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  if (!showQuiz) return null
  if (questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Noch keine Fragen verfügbar.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz</CardTitle>
        <p className="text-sm text-muted-foreground">
          Bestanden ab {quiz.passThreshold} %. Schließe alle Fragen ab, um die Lektion zu vollenden.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {questions.map((q, idx) => (
          <div key={q.id} className="space-y-2">
            <div className="font-medium">
              {idx + 1}. {q.prompt}
              {q.kind === 'multiple' && (
                <span className="ml-2 text-xs text-muted-foreground">(mehrere Antworten möglich)</span>
              )}
            </div>
            <ul className="space-y-1.5">
              {q.options.map((o) => {
                const checked = (answers[q.id] ?? []).includes(o.id)
                return (
                  <li key={o.id}>
                    <label className="flex items-center gap-2 cursor-pointer rounded-md p-2 hover:bg-muted">
                      <input
                        type={q.kind === 'multiple' ? 'checkbox' : 'radio'}
                        name={q.id}
                        checked={checked}
                        onChange={() =>
                          q.kind === 'multiple' ? toggleMulti(q.id, o.id) : setSingle(q.id, o.id)
                        }
                        className="h-4 w-4"
                      />
                      <span>{o.text}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        <div className="flex justify-end">
          <Button onClick={submit} disabled={!allAnswered || submitting}>
            Quiz abschicken
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
