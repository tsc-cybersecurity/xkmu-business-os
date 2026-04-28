'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading-states'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { ClipboardCheck, Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

type Kind = 'single' | 'multiple' | 'truefalse'

interface QuizConfig { id: string; passThreshold: number; allowRetake: boolean }
interface QuestionRow {
  id: string
  position: number
  kind: Kind
  prompt: string
  explanation: string | null
  options: Array<{ id: string; text: string; isCorrect: boolean }>
}

interface Props {
  courseId: string
  lessonId: string
}

export function LessonQuizEditor({ courseId, lessonId }: Props) {
  const [quiz, setQuiz] = useState<QuizConfig | null>(null)
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<QuestionRow | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/lessons/${lessonId}/quiz`).then((r) => r.json())
      if (res.success) {
        if (res.data) {
          setQuiz(res.data.quiz)
          setQuestions(res.data.questions)
        } else {
          setQuiz(null)
          setQuestions([])
        }
      }
    } catch (err) {
      logger.error('Quiz load failed', err, { module: 'LessonQuizEditor' })
    } finally {
      setLoading(false)
    }
  }, [courseId, lessonId])

  useEffect(() => { void load() }, [load])

  async function createQuiz() {
    const res = await fetch(`/api/v1/courses/${courseId}/lessons/${lessonId}/quiz`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passThreshold: 70, allowRetake: true }),
    })
    const json = await res.json()
    if (json.success) {
      toast.success('Quiz angelegt')
      await load()
    } else {
      toast.error(json.error?.message ?? 'Anlegen fehlgeschlagen')
    }
  }

  async function saveConfig(patch: Partial<QuizConfig>) {
    const res = await fetch(`/api/v1/courses/${courseId}/lessons/${lessonId}/quiz`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passThreshold: patch.passThreshold ?? quiz?.passThreshold ?? 70,
        allowRetake: patch.allowRetake ?? quiz?.allowRetake ?? true,
      }),
    })
    const json = await res.json()
    if (json.success) {
      setQuiz(json.data)
      toast.success('Konfiguration gespeichert')
    } else {
      toast.error(json.error?.message ?? 'Speichern fehlgeschlagen')
    }
  }

  async function deleteQuiz() {
    if (!confirm('Quiz löschen? Alle Fragen und Versuche gehen verloren.')) return
    const res = await fetch(`/api/v1/courses/${courseId}/lessons/${lessonId}/quiz`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      toast.success('Quiz gelöscht')
      await load()
    } else {
      toast.error(json.error?.message ?? 'Löschen fehlgeschlagen')
    }
  }

  async function deleteQuestion(q: QuestionRow) {
    if (!confirm('Frage löschen?')) return
    const res = await fetch(
      `/api/v1/courses/${courseId}/lessons/${lessonId}/quiz/questions/${q.id}`,
      { method: 'DELETE' },
    )
    const json = await res.json()
    if (json.success) {
      toast.success('Frage gelöscht')
      await load()
    } else {
      toast.error(json.error?.message ?? 'Löschen fehlgeschlagen')
    }
  }

  if (loading) return <LoadingSpinner />

  if (!quiz) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <EmptyState
            icon={ClipboardCheck}
            title="Diese Lektion hat noch kein Quiz"
            description="Mit einem Quiz wird die Lektion erst nach Bestehen als erledigt markiert."
          />
          <div className="flex justify-center">
            <Button onClick={createQuiz}>
              <Plus className="mr-2 h-4 w-4" />
              Quiz anlegen
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Konfiguration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quiz-threshold">Bestanden ab (% korrekt)</Label>
              <Input
                id="quiz-threshold"
                type="number"
                min={0}
                max={100}
                value={quiz.passThreshold}
                onChange={(e) => setQuiz({ ...quiz, passThreshold: Number(e.target.value) })}
                onBlur={() => void saveConfig({ passThreshold: quiz.passThreshold })}
              />
            </div>
            <div className="space-y-2">
              <Label>Optionen</Label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={quiz.allowRetake}
                  onCheckedChange={(c) => {
                    const v = c === true
                    setQuiz({ ...quiz, allowRetake: v })
                    void saveConfig({ allowRetake: v })
                  }}
                />
                Wiederholungen erlauben
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={deleteQuiz}>
              <Trash2 className="mr-1 h-4 w-4 text-destructive" />
              Quiz entfernen
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fragen ({questions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Fragen — füge unten die erste hinzu.</p>
          ) : (
            <ul className="space-y-2">
              {questions.map((q, i) => (
                <li key={q.id} className="flex items-start gap-3 rounded-md border p-3">
                  <span className="text-sm text-muted-foreground tabular-nums w-6 mt-0.5">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{q.prompt}</span>
                      <Badge variant="outline" className="text-xs">
                        {q.kind === 'single' ? 'Single' : q.kind === 'multiple' ? 'Multi' : 'Wahr/Falsch'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {q.options.length} Antwort{q.options.length === 1 ? '' : 'en'}
                      {' · '}
                      {q.options.filter((o) => o.isCorrect).length} korrekt
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setEditing(q)} aria-label="Bearbeiten">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => void deleteQuestion(q)} aria-label="Löschen">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setCreatingNew(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Frage hinzufügen
            </Button>
          </div>
        </CardContent>
      </Card>

      <QuestionEditDialog
        key={editing?.id ?? (creatingNew ? 'new' : 'closed')}
        courseId={courseId}
        lessonId={lessonId}
        question={editing}
        open={creatingNew || !!editing}
        onClose={() => { setEditing(null); setCreatingNew(false) }}
        onSaved={async () => { setEditing(null); setCreatingNew(false); await load() }}
      />
    </div>
  )
}

function QuestionEditDialog({
  courseId, lessonId, question, open, onClose, onSaved,
}: {
  courseId: string
  lessonId: string
  question: QuestionRow | null
  open: boolean
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  // State is derived from `question` at mount. Parent passes a unique `key`
  // to remount this dialog when target changes — avoids useEffect+setState.
  const initialOptions: Array<{ text: string; isCorrect: boolean }> = question
    ? question.kind === 'truefalse'
      ? [
          { text: 'Wahr', isCorrect: question.options.find((o) => /wahr|true/i.test(o.text))?.isCorrect ?? true },
          { text: 'Falsch', isCorrect: question.options.find((o) => /falsch|false/i.test(o.text))?.isCorrect ?? false },
        ]
      : question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect }))
    : [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ]
  const [kind, setKind] = useState<Kind>(question?.kind ?? 'single')
  const [prompt, setPrompt] = useState(question?.prompt ?? '')
  const [explanation, setExplanation] = useState(question?.explanation ?? '')
  const [options, setOptions] = useState<Array<{ text: string; isCorrect: boolean }>>(initialOptions)
  const [busy, setBusy] = useState(false)

  function changeKind(next: Kind) {
    setKind(next)
    if (next === 'truefalse') {
      setOptions([{ text: 'Wahr', isCorrect: true }, { text: 'Falsch', isCorrect: false }])
    } else if (options.length < 2) {
      setOptions([
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ])
    } else if (next === 'single') {
      // Ensure only one correct
      let hit = false
      setOptions(options.map((o) => {
        if (o.isCorrect && !hit) { hit = true; return o }
        return { ...o, isCorrect: false }
      }))
    }
  }

  function setOptionText(i: number, text: string) {
    setOptions((arr) => arr.map((o, idx) => (idx === i ? { ...o, text } : o)))
  }

  function setSingleCorrect(i: number) {
    setOptions((arr) => arr.map((o, idx) => ({ ...o, isCorrect: idx === i })))
  }

  function toggleCorrect(i: number) {
    setOptions((arr) => arr.map((o, idx) => (idx === i ? { ...o, isCorrect: !o.isCorrect } : o)))
  }

  async function submit() {
    setBusy(true)
    try {
      const payload = {
        kind,
        prompt: prompt.trim(),
        explanation: explanation.trim() ? explanation.trim() : null,
        options:
          kind === 'truefalse'
            ? [
                { text: 'Wahr', isCorrect: options.find((o) => /wahr|true/i.test(o.text))?.isCorrect ?? true },
                { text: 'Falsch', isCorrect: !(options.find((o) => /wahr|true/i.test(o.text))?.isCorrect ?? true) },
              ]
            : options.filter((o) => o.text.trim().length > 0),
      }
      const url = question
        ? `/api/v1/courses/${courseId}/lessons/${lessonId}/quiz/questions/${question.id}`
        : `/api/v1/courses/${courseId}/lessons/${lessonId}/quiz/questions`
      const method = question ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(question ? 'Frage aktualisiert' : 'Frage hinzugefügt')
        await onSaved()
      } else {
        toast.error(json.error?.message ?? 'Speichern fehlgeschlagen')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>{question ? 'Frage bearbeiten' : 'Neue Frage'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select value={kind} onValueChange={(v) => changeKind(v as Kind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single-Choice</SelectItem>
                  <SelectItem value="multiple">Multiple-Choice</SelectItem>
                  <SelectItem value="truefalse">Wahr / Falsch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Frage</Label>
            <Textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>

          {kind === 'truefalse' ? (
            <div className="space-y-2">
              <Label>Korrekt ist</Label>
              <Select
                value={options[0]?.isCorrect ? 'true' : 'false'}
                onValueChange={(v) => setOptions([
                  { text: 'Wahr', isCorrect: v === 'true' },
                  { text: 'Falsch', isCorrect: v !== 'true' },
                ])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Wahr</SelectItem>
                  <SelectItem value="false">Falsch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Antwortoptionen</Label>
              <div className="space-y-2">
                {options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {kind === 'single' ? (
                      <input
                        type="radio"
                        name="correct"
                        checked={o.isCorrect}
                        onChange={() => setSingleCorrect(i)}
                        aria-label="Korrekte Antwort"
                      />
                    ) : (
                      <Checkbox
                        checked={o.isCorrect}
                        onCheckedChange={() => toggleCorrect(i)}
                        aria-label="Korrekte Antwort"
                      />
                    )}
                    <Input
                      value={o.text}
                      placeholder={`Option ${i + 1}`}
                      onChange={(e) => setOptionText(i, e.target.value)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Option entfernen"
                      onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                      disabled={options.length <= 2}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOptions([...options, { text: '', isCorrect: false }])}
              >
                <Plus className="mr-1 h-4 w-4" />
                Option
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label>Erklärung (optional, wird nach Antwort gezeigt)</Label>
            <Textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="p-6 pt-4 border-t bg-background">
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button onClick={submit} disabled={busy || !prompt.trim()}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
