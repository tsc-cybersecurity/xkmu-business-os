'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Loader2, Plus, ArrowLeft, MessageSquarePlus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Link from 'next/link'

/* eslint-disable @typescript-eslint/no-explicit-any */

const CONF_COLORS = ['bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500']
const CONF_LABELS = ['Rot', 'Gelb', 'Gruen', 'Blau']

export default function OkrPage() {
  const [loading, setLoading] = useState(true)
  const [cycles, setCycles] = useState<any[]>([])
  const [selectedCycle, setSelectedCycle] = useState<string>('')
  const [objectives, setObjectives] = useState<any[]>([])
  const [overallProgress, setOverallProgress] = useState(0)
  const [activeCycleName, setActiveCycleName] = useState('')

  // Dialogs
  const [showCycleDlg, setShowCycleDlg] = useState(false)
  const [cycleForm, setCycleForm] = useState({ name: '', startDate: '', endDate: '', isActive: true })
  const [showObjDlg, setShowObjDlg] = useState(false)
  const [objForm, setObjForm] = useState({ title: '', description: '', ownerId: '' })
  const [showKrDlg, setShowKrDlg] = useState(false)
  const [krObjId, setKrObjId] = useState('')
  const [krForm, setKrForm] = useState({ title: '', startValue: '0', targetValue: '100', unit: '%' })
  const [showCheckinDlg, setShowCheckinDlg] = useState(false)
  const [checkinKrId, setCheckinKrId] = useState('')
  const [checkinForm, setCheckinForm] = useState({ value: '', confidence: 1, note: '' })

  const api = async (url: string, opts?: RequestInit) => {
    const res = await fetch(url, opts)
    return res.json()
  }

  const loadCycles = useCallback(async () => {
    const d = await api('/api/v1/okr/cycles')
    if (d.success) {
      setCycles(d.data)
      const active = d.data.find((c: any) => c.isActive)
      if (active) {
        setSelectedCycle(active.id)
        setActiveCycleName(active.name)
      } else {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  const loadObjectives = useCallback(async () => {
    if (!selectedCycle) { setObjectives([]); return }
    const d = await api(`/api/v1/okr/objectives?cycleId=${selectedCycle}`)
    if (d.success) {
      setObjectives(d.data)
      const total = d.data.length > 0 ? Math.round(d.data.reduce((s: number, o: any) => s + o.progress, 0) / d.data.length) : 0
      setOverallProgress(total)
    }
    setLoading(false)
  }, [selectedCycle])

  useEffect(() => { loadCycles() }, [loadCycles])
  useEffect(() => {
    if (selectedCycle) {
      const cycle = cycles.find(c => c.id === selectedCycle)
      if (cycle) setActiveCycleName(cycle.name)
      loadObjectives()
    }
  }, [selectedCycle, loadObjectives, cycles])

  const createCycle = async () => {
    if (!cycleForm.name.trim() || !cycleForm.startDate || !cycleForm.endDate) return
    const d = await api('/api/v1/okr/cycles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cycleForm) })
    if (d.success) { toast.success('Zyklus erstellt'); setShowCycleDlg(false); setCycleForm({ name: '', startDate: '', endDate: '', isActive: true }); loadCycles() }
    else toast.error('Fehler')
  }

  const createObj = async () => {
    if (!objForm.title.trim() || !selectedCycle) return
    const d = await api('/api/v1/okr/objectives', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...objForm, cycleId: selectedCycle }) })
    if (d.success) { toast.success('Objective erstellt'); setShowObjDlg(false); setObjForm({ title: '', description: '', ownerId: '' }); loadObjectives() }
  }

  const addKr = async () => {
    if (!krForm.title.trim() || !krObjId) return
    const d = await api(`/api/v1/okr/objectives/${krObjId}/kr`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...krForm, startValue: Number(krForm.startValue), targetValue: Number(krForm.targetValue) }) })
    if (d.success) { toast.success('Key Result erstellt'); setShowKrDlg(false); setKrForm({ title: '', startValue: '0', targetValue: '100', unit: '%' }); loadObjectives() }
  }

  const submitCheckin = async () => {
    if (!checkinKrId) return
    const d = await api(`/api/v1/okr/kr/${checkinKrId}/checkin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: Number(checkinForm.value), confidence: checkinForm.confidence, note: checkinForm.note }) })
    if (d.success) { toast.success('Check-in gespeichert'); setShowCheckinDlg(false); setCheckinForm({ value: '', confidence: 1, note: '' }); loadObjectives() }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/intern/management"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">OKR</h1>
      </div>

      {/* Cycle Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedCycle} onValueChange={setSelectedCycle}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Zyklus waehlen" /></SelectTrigger>
          <SelectContent>{cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.isActive ? ' (aktiv)' : ''}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setShowCycleDlg(true)}><Plus className="h-4 w-4 mr-2" />Neuer Zyklus</Button>
        <Button onClick={() => setShowObjDlg(true)} disabled={!selectedCycle}><Plus className="h-4 w-4 mr-2" />Neues Objective</Button>
      </div>

      {/* Overall Progress */}
      {selectedCycle && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{activeCycleName} — Gesamtfortschritt</span>
              <Badge>{overallProgress}%</Badge>
            </div>
            <div className="w-full bg-secondary rounded-full h-3">
              <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Objectives */}
      {objectives.length === 0 && selectedCycle ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Keine Objectives in diesem Zyklus</CardContent></Card>
      ) : !selectedCycle ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Bitte waehle einen Zyklus aus oder erstelle einen neuen</CardContent></Card>
      ) : (
        <div className="space-y-4">{objectives.map(obj => (
          <Card key={obj.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{obj.title}</CardTitle>
                  {obj.description && <p className="text-sm text-muted-foreground mt-1">{obj.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-secondary rounded-full h-2">
                    <div className={cn('h-2 rounded-full', obj.progress >= 70 ? 'bg-green-500' : obj.progress >= 40 ? 'bg-yellow-500' : 'bg-red-500')} style={{ width: `${obj.progress}%` }} />
                  </div>
                  <span className="text-sm font-medium w-10 text-right">{obj.progress}%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {obj.keyResults?.map((kr: any) => {
                const start = Number(kr.startValue) || 0
                const target = Number(kr.targetValue) || 1
                const current = Number(kr.currentValue) || 0
                const range = target - start
                const pct = range > 0 ? Math.min(100, Math.round(((current - start) / range) * 100)) : 0
                return (
                  <div key={kr.id} className="flex items-center gap-3 p-2 rounded border">
                    <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', CONF_COLORS[kr.confidence ?? 1])} title={CONF_LABELS[kr.confidence ?? 1]} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{kr.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{start} {kr.unit}</span>
                        <div className="flex-1 bg-secondary rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-medium">{current}</span>
                        <span className="text-xs text-muted-foreground">/ {target} {kr.unit}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setCheckinKrId(kr.id); setCheckinForm({ value: String(current), confidence: kr.confidence ?? 1, note: '' }); setShowCheckinDlg(true) }}>
                      <MessageSquarePlus className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
              <Button variant="outline" size="sm" onClick={() => { setKrObjId(obj.id); setShowKrDlg(true) }}>
                <Plus className="h-3 w-3 mr-1" />Key Result
              </Button>
            </CardContent>
          </Card>
        ))}</div>
      )}

      {/* Cycle Dialog */}
      <Dialog open={showCycleDlg} onOpenChange={setShowCycleDlg}>
        <DialogContent><DialogHeader><DialogTitle>Neuer OKR-Zyklus</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium block mb-1">Name *</label><Input value={cycleForm.name} onChange={e => setCycleForm({ ...cycleForm, name: e.target.value })} placeholder="z.B. Q2 2026" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium block mb-1">Start</label><Input type="date" value={cycleForm.startDate} onChange={e => setCycleForm({ ...cycleForm, startDate: e.target.value })} /></div>
              <div><label className="text-sm font-medium block mb-1">Ende</label><Input type="date" value={cycleForm.endDate} onChange={e => setCycleForm({ ...cycleForm, endDate: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCycleDlg(false)}>Abbrechen</Button><Button onClick={createCycle}>Erstellen</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Objective Dialog */}
      <Dialog open={showObjDlg} onOpenChange={setShowObjDlg}>
        <DialogContent><DialogHeader><DialogTitle>Neues Objective</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium block mb-1">Titel *</label><Input value={objForm.title} onChange={e => setObjForm({ ...objForm, title: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Beschreibung</label><Textarea value={objForm.description} onChange={e => setObjForm({ ...objForm, description: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowObjDlg(false)}>Abbrechen</Button><Button onClick={createObj}>Erstellen</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Key Result Dialog */}
      <Dialog open={showKrDlg} onOpenChange={setShowKrDlg}>
        <DialogContent><DialogHeader><DialogTitle>Neues Key Result</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium block mb-1">Titel *</label><Input value={krForm.title} onChange={e => setKrForm({ ...krForm, title: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-sm font-medium block mb-1">Startwert</label><Input value={krForm.startValue} onChange={e => setKrForm({ ...krForm, startValue: e.target.value })} /></div>
              <div><label className="text-sm font-medium block mb-1">Zielwert</label><Input value={krForm.targetValue} onChange={e => setKrForm({ ...krForm, targetValue: e.target.value })} /></div>
              <div><label className="text-sm font-medium block mb-1">Einheit</label><Input value={krForm.unit} onChange={e => setKrForm({ ...krForm, unit: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowKrDlg(false)}>Abbrechen</Button><Button onClick={addKr}>Erstellen</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-in Dialog */}
      <Dialog open={showCheckinDlg} onOpenChange={setShowCheckinDlg}>
        <DialogContent><DialogHeader><DialogTitle>Check-in</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium block mb-1">Aktueller Wert</label><Input value={checkinForm.value} onChange={e => setCheckinForm({ ...checkinForm, value: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Confidence</label>
              <Select value={String(checkinForm.confidence)} onValueChange={v => setCheckinForm({ ...checkinForm, confidence: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Rot — Unwahrscheinlich</SelectItem>
                  <SelectItem value="1">Gelb — Unsicher</SelectItem>
                  <SelectItem value="2">Gruen — Auf Kurs</SelectItem>
                  <SelectItem value="3">Blau — Sicher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium block mb-1">Notiz</label><Textarea value={checkinForm.note} onChange={e => setCheckinForm({ ...checkinForm, note: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCheckinDlg(false)}>Abbrechen</Button><Button onClick={submitCheckin}>Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
