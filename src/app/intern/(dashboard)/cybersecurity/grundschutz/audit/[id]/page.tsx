'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Loader2, Shield, CheckCircle2, XCircle, MinusCircle, HelpCircle, ChevronRight, Save, BarChart3, Link2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AuditSession {
  id: string; title: string; status: string; companyName: string | null
  consultantName: string | null; stats: Record<string, number>; createdAt: string
}

interface AnswerRow {
  answer: { id: string; controlId: string; status: string; notes: string | null; answeredAt: string | null }
  controlTitle: string; controlStatement: string | null; controlGuidance: string | null
  controlModalVerb: string | null; controlActionWord: string | null
  controlResult: string | null; controlSecLevel: string | null
  controlEffortLevel: string | null; controlGroupId: string; controlSortOrder: number
}

interface ControlLink { controlId: string; title: string; rel: string }

interface Group { id: string; title: string; controlCount: number }

interface Scoring {
  total: number; erfuellt: number; teilweise: number; nichtErfuellt: number
  nichtRelevant: number; offen: number; erfuellungsgrad: number
  byGroup: Array<{ groupId: string; groupTitle: string; total: number; erfuellt: number; erfuellungsgrad: number }>
}

const STATUS_OPTIONS = [
  { value: 'offen', label: 'Offen', icon: HelpCircle, color: 'text-gray-400' },
  { value: 'erfuellt', label: 'Erfuellt', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'teilweise', label: 'Teilweise', icon: MinusCircle, color: 'text-yellow-500' },
  { value: 'nicht_erfuellt', label: 'Nicht erfuellt', icon: XCircle, color: 'text-red-500' },
  { value: 'nicht_relevant', label: 'Nicht relevant', icon: MinusCircle, color: 'text-gray-300' },
]

const SEC_COLORS: Record<string, string> = { 'normal-SdT': 'bg-green-100 text-green-700', 'hoch': 'bg-orange-100 text-orange-700' }
const SEC_LABELS: Record<string, string> = { 'normal-SdT': 'Normal', 'hoch': 'Hoch' }

export default function AuditPage() {
  const params = useParams()
  const auditId = params.id as string
  const [session, setSession] = useState<AuditSession | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [answers, setAnswers] = useState<AnswerRow[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerRow | null>(null)
  const [scoring, setScoring] = useState<Scoring | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingAnswers, setLoadingAnswers] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editNotes, setEditNotes] = useState('')
  const [showScoring, setShowScoring] = useState(false)
  const [controlLinks, setControlLinks] = useState<ControlLink[]>([])
  const [loadingLinks, setLoadingLinks] = useState(false)

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/grundschutz/audits/${auditId}`)
      const data = await res.json()
      if (data.success) setSession(data.data)
    } catch { /* */ }
    finally { setLoading(false) }
  }, [auditId])

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/grundschutz/groups')
      const data = await res.json()
      if (data.success) setGroups(data.data)
    } catch { /* */ }
  }, [])

  const fetchScoring = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/grundschutz/audits/${auditId}/scoring`)
      const data = await res.json()
      if (data.success) setScoring(data.data)
    } catch { /* */ }
  }, [auditId])

  useEffect(() => { fetchSession(); fetchGroups(); fetchScoring() }, [fetchSession, fetchGroups, fetchScoring])

  const loadAnswers = async (groupId: string) => {
    setSelectedGroup(groupId); setSelectedAnswer(null); setLoadingAnswers(true)
    try {
      const res = await fetch(`/api/v1/grundschutz/audits/${auditId}/answers?groupId=${groupId}`)
      const data = await res.json()
      if (data.success) setAnswers(data.data)
    } catch { /* */ }
    finally { setLoadingAnswers(false) }
  }

  const selectAnswer = async (a: AnswerRow) => {
    setSelectedAnswer(a)
    setEditNotes(a.answer.notes || '')
    setLoadingLinks(true)
    setControlLinks([])
    try {
      const res = await fetch(`/api/v1/grundschutz/controls/${encodeURIComponent(a.answer.controlId)}`)
      const data = await res.json()
      if (data.success && data.data.links) setControlLinks(data.data.links)
    } catch { /* */ }
    finally { setLoadingLinks(false) }
  }

  const saveAnswer = async (status: string) => {
    if (!selectedAnswer) return
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/grundschutz/audits/${auditId}/answers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ controlId: selectedAnswer.answer.controlId, status, notes: editNotes || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        // Lokales Update
        setAnswers(prev => prev.map(a =>
          a.answer.controlId === selectedAnswer.answer.controlId
            ? { ...a, answer: { ...a.answer, status, notes: editNotes, answeredAt: new Date().toISOString() } }
            : a
        ))
        setSelectedAnswer(prev => prev ? { ...prev, answer: { ...prev.answer, status, notes: editNotes, answeredAt: new Date().toISOString() } } : null)
        fetchScoring()

        // Zum naechsten offenen springen
        const currentIdx = answers.findIndex(a => a.answer.controlId === selectedAnswer.answer.controlId)
        const next = answers.find((a, i) => i > currentIdx && a.answer.status === 'offen')
        if (next) selectAnswer(next)
      }
    } catch { toast.error('Fehler beim Speichern') }
    finally { setSaving(false) }
  }

  const startAudit = async () => {
    await fetch(`/api/v1/grundschutz/audits/${auditId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    })
    fetchSession()
  }

  const completeAudit = async () => {
    await fetch(`/api/v1/grundschutz/audits/${auditId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    fetchSession(); toast.success('Audit abgeschlossen')
  }

  if (loading || !session) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  const statusIcon = (status: string) => {
    const opt = STATUS_OPTIONS.find(o => o.value === status)
    if (!opt) return null
    const Icon = opt.icon
    return <Icon className={cn('h-4 w-4', opt.color)} />
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/intern/cybersecurity/grundschutz"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-lg font-bold">{session.title}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {session.companyName && <span>{session.companyName}</span>}
              {scoring && <span>Erfuellung: {scoring.erfuellungsgrad}%</span>}
              {scoring && <span>{scoring.offen} offen</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowScoring(!showScoring)}>
            <BarChart3 className="h-4 w-4 mr-1" />{showScoring ? 'Audit' : 'Scoring'}
          </Button>
          {session.status === 'draft' && <Button size="sm" onClick={startAudit}>Audit starten</Button>}
          {session.status === 'in_progress' && scoring && scoring.offen === 0 && (
            <Button size="sm" onClick={completeAudit} className="bg-green-600 hover:bg-green-700">Abschliessen</Button>
          )}
        </div>
      </div>

      {showScoring && scoring ? (
        /* SCORING VIEW */
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {[
                { label: 'Gesamt', value: scoring.total, color: '' },
                { label: 'Erfuellt', value: scoring.erfuellt, color: 'text-green-600' },
                { label: 'Teilweise', value: scoring.teilweise, color: 'text-yellow-600' },
                { label: 'Nicht erfuellt', value: scoring.nichtErfuellt, color: 'text-red-600' },
                { label: 'N/A', value: scoring.nichtRelevant, color: 'text-gray-400' },
                { label: 'Offen', value: scoring.offen, color: 'text-blue-500' },
              ].map(s => (
                <Card key={s.label}><CardContent className="pt-4 text-center">
                  <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </CardContent></Card>
              ))}
            </div>
            <Card><CardHeader><CardTitle>Erfuellungsgrad: {scoring.erfuellungsgrad}%</CardTitle></CardHeader>
              <CardContent>
                <div className="w-full h-4 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-all" style={{ width: `${scoring.erfuellungsgrad}%` }} /></div>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle>Nach Gruppe</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {scoring.byGroup.map(g => (
                  <div key={g.groupId} className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs w-16 justify-center">{g.groupId}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm truncate">{g.groupTitle}</span>
                        <span className="text-xs text-muted-foreground">{g.erfuellt}/{g.total}</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 transition-all" style={{ width: `${g.erfuellungsgrad}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-semibold w-12 text-right">{g.erfuellungsgrad}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* AUDIT VIEW — 3 Spalten */
        <div className="flex flex-1 overflow-hidden">
          {/* Gruppen */}
          <div className="w-64 border-r flex flex-col shrink-0 overflow-y-auto">
            {groups.map(g => {
              const groupScore = scoring?.byGroup.find(b => b.groupId === g.id)
              return (
                <button key={g.id} onClick={() => loadAnswers(g.id)} className={cn('w-full text-left px-3 py-2 border-b hover:bg-muted/50', selectedGroup === g.id && 'bg-muted')}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">{g.id}</Badge><span className="text-xs font-medium truncate">{g.title}</span></div>
                      {groupScore && <div className="w-full h-1 bg-muted rounded-full mt-1 overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${groupScore.erfuellungsgrad}%` }} /></div>}
                    </div>
                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 ml-1" />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Controls-Liste */}
          <div className="w-80 border-r flex flex-col shrink-0">
            {loadingAnswers ? <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin" /></div> :
            selectedGroup ? (
              <div className="flex-1 overflow-y-auto">
                {answers.map(a => (
                  <button key={a.answer.controlId} onClick={() => selectAnswer(a)} className={cn('w-full text-left px-3 py-2 border-b hover:bg-muted/50', selectedAnswer?.answer.controlId === a.answer.controlId && 'bg-muted')}>
                    <div className="flex items-center gap-2">
                      {statusIcon(a.answer.status)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <code className="text-[9px] font-mono bg-muted px-1 rounded">{a.answer.controlId}</code>
                          {a.controlSecLevel && <Badge variant="outline" className={cn('text-[8px] px-0.5 py-0', SEC_COLORS[a.controlSecLevel])}>{SEC_LABELS[a.controlSecLevel]}</Badge>}
                        </div>
                        <p className="text-xs truncate">{a.controlTitle}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Gruppe waehlen</div>}
          </div>

          {/* Detail + Bewertung */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedAnswer ? (
              <div className="max-w-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{selectedAnswer.answer.controlId}</code>
                  {selectedAnswer.controlSecLevel && <Badge variant="outline" className={SEC_COLORS[selectedAnswer.controlSecLevel]}>{SEC_LABELS[selectedAnswer.controlSecLevel]}</Badge>}
                  {statusIcon(selectedAnswer.answer.status)}
                  <span className="text-sm">{STATUS_OPTIONS.find(o => o.value === selectedAnswer.answer.status)?.label}</span>
                </div>
                <h2 className="text-lg font-bold">{selectedAnswer.controlTitle}</h2>

                {/* Meta-Badges */}
                <div className="flex flex-wrap gap-2">
                  {selectedAnswer.controlModalVerb && <Badge className={cn('text-xs', selectedAnswer.controlModalVerb === 'MUSS' ? 'bg-red-100 text-red-700' : selectedAnswer.controlModalVerb === 'SOLLTE' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700')}>{selectedAnswer.controlModalVerb}</Badge>}
                  {selectedAnswer.controlActionWord && <Badge variant="outline" className="text-xs">{selectedAnswer.controlActionWord}</Badge>}
                  {selectedAnswer.controlResult && <Badge variant="secondary" className="text-xs">{selectedAnswer.controlResult.substring(0, 60)}{selectedAnswer.controlResult.length > 60 ? '...' : ''}</Badge>}
                </div>

                {selectedAnswer.controlStatement && (
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Anforderung</CardTitle></CardHeader>
                    <CardContent><p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedAnswer.controlStatement}</p></CardContent>
                  </Card>
                )}

                {selectedAnswer.controlGuidance && (
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Umsetzungshinweise</CardTitle></CardHeader>
                    <CardContent><p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{selectedAnswer.controlGuidance}</p></CardContent>
                  </Card>
                )}

                {/* Verknuepfte Controls */}
                {loadingLinks ? <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Links laden...</div> : controlLinks.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Link2 className="h-4 w-4" />Verknuepfte Controls ({controlLinks.length})</CardTitle></CardHeader>
                    <CardContent className="space-y-1">
                      {controlLinks.filter(l => l.rel === 'required').length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-red-600 mb-1">Voraussetzungen</p>
                          {controlLinks.filter(l => l.rel === 'required').map(l => {
                            const linkedAnswer = answers.find(a => a.answer.controlId === l.controlId)
                            return (
                              <button key={l.controlId} onClick={() => { const a = answers.find(x => x.answer.controlId === l.controlId); if (a) selectAnswer(a) }} className="flex items-center gap-2 w-full text-left px-2 py-1 rounded hover:bg-muted/50">
                                <ArrowRight className="h-3 w-3 text-red-400 shrink-0" />
                                <code className="text-[10px] font-mono bg-red-50 text-red-700 px-1 rounded">{l.controlId}</code>
                                <span className="text-xs truncate flex-1">{l.title}</span>
                                {linkedAnswer && statusIcon(linkedAnswer.answer.status)}
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {controlLinks.filter(l => l.rel === 'related').length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-blue-600 mb-1">Verwandt</p>
                          {controlLinks.filter(l => l.rel === 'related').map(l => {
                            const linkedAnswer = answers.find(a => a.answer.controlId === l.controlId)
                            return (
                              <button key={l.controlId} onClick={() => { const a = answers.find(x => x.answer.controlId === l.controlId); if (a) selectAnswer(a) }} className="flex items-center gap-2 w-full text-left px-2 py-1 rounded hover:bg-muted/50">
                                <Link2 className="h-3 w-3 text-blue-400 shrink-0" />
                                <code className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1 rounded">{l.controlId}</code>
                                <span className="text-xs truncate flex-1">{l.title}</span>
                                {linkedAnswer && statusIcon(linkedAnswer.answer.status)}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Bewertung */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Bewertung</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map(opt => {
                        const Icon = opt.icon
                        const active = selectedAnswer.answer.status === opt.value
                        return (
                          <Button key={opt.value} variant={active ? 'default' : 'outline'} size="sm"
                            onClick={() => saveAnswer(opt.value)} disabled={saving}
                            className={cn(active && opt.value === 'erfuellt' && 'bg-green-600 hover:bg-green-700', active && opt.value === 'nicht_erfuellt' && 'bg-red-600 hover:bg-red-700', active && opt.value === 'teilweise' && 'bg-yellow-600 hover:bg-yellow-700')}>
                            <Icon className="h-3.5 w-3.5 mr-1" />{opt.label}
                          </Button>
                        )
                      })}
                    </div>
                    <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notizen zur Bewertung..." rows={3} className="text-sm" />
                    <Button size="sm" variant="outline" onClick={() => saveAnswer(selectedAnswer.answer.status)} disabled={saving}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}Notiz speichern
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><Shield className="h-10 w-10 mb-3" /><p className="text-sm">Control auswaehlen</p></div>}
          </div>
        </div>
      )}
    </div>
  )
}
