'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Plus, Save, Check, X, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Link from 'next/link'

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_COLORS: Record<string, string> = { 'on-track': 'bg-green-600', 'off-track': 'bg-red-600', done: 'bg-gray-500' }
const PRIORITY_COLORS: Record<string, string> = { high: 'bg-red-600', medium: 'bg-yellow-600', low: 'bg-blue-500' }
const currentQ = () => { const d = new Date(); return `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}` }

export default function EosPage() {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('rocks')

  // VTO
  const [vto, setVto] = useState<any>({})
  const [saving, setSaving] = useState(false)

  // Rocks
  const [rocks, setRocks] = useState<any[]>([])
  const [rockQ, setRockQ] = useState('all')
  const [showRockDlg, setShowRockDlg] = useState(false)
  const [editRock, setEditRock] = useState<any>(null)
  const [rockForm, setRockForm] = useState({ title: '', description: '', quarter: currentQ(), status: 'on-track' })

  // Scorecard
  const [metrics, setMetrics] = useState<any[]>([])
  const [showMetricDlg, setShowMetricDlg] = useState(false)
  const [metricForm, setMetricForm] = useState({ name: '', goal: '', unit: 'Stk' })

  // Issues
  const [issues, setIssues] = useState<any[]>([])
  const [issueFilter, setIssueFilter] = useState('open')
  const [showIssueDlg, setShowIssueDlg] = useState(false)
  const [editIssue, setEditIssue] = useState<any>(null)
  const [issueForm, setIssueForm] = useState({ title: '', description: '', priority: 'medium' })
  const [solutionText, setSolutionText] = useState('')

  // Meetings
  const [meetings, setMeetings] = useState<any[]>([])
  const [showMeetDlg, setShowMeetDlg] = useState(false)
  const [meetTitle, setMeetTitle] = useState('L10 Meeting')
  const [editMeet, setEditMeet] = useState<any>(null)
  const [meetNotes, setMeetNotes] = useState('')

  const api = async (url: string, opts?: RequestInit) => {
    const res = await fetch(url, opts)
    return res.json()
  }

  const load = useCallback(async () => {
    const [v, r, s, i, m] = await Promise.all([
      api('/api/v1/eos/vto'), api('/api/v1/eos/rocks'), api('/api/v1/eos/scorecard'),
      api('/api/v1/eos/issues'), api('/api/v1/eos/meetings'),
    ])
    if (v.success) setVto(v.data || {})
    if (r.success) setRocks(r.data)
    if (s.success) setMetrics(s.data)
    if (i.success) setIssues(i.data)
    if (m.success) setMeetings(m.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // VTO handlers
  const saveVto = async () => {
    setSaving(true)
    const d = await api('/api/v1/eos/vto', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vto) })
    if (d.success) toast.success('VTO gespeichert'); else toast.error('Fehler beim Speichern')
    setSaving(false)
  }

  // Rock handlers
  const filteredRocks = rockQ === 'all' ? rocks : rocks.filter(r => r.quarter === rockQ)
  const saveRock = async () => {
    if (!rockForm.title.trim()) return
    const method = editRock ? 'PUT' : 'POST'
    const url = editRock ? `/api/v1/eos/rocks/${editRock.id}` : '/api/v1/eos/rocks'
    const d = await api(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rockForm) })
    if (d.success) { toast.success(editRock ? 'Rock aktualisiert' : 'Rock erstellt'); setShowRockDlg(false); setEditRock(null); load() }
    else toast.error('Fehler')
  }
  const openEditRock = (r: any) => { setEditRock(r); setRockForm({ title: r.title, description: r.description || '', quarter: r.quarter, status: r.status }); setShowRockDlg(true) }
  const openNewRock = () => { setEditRock(null); setRockForm({ title: '', description: '', quarter: currentQ(), status: 'on-track' }); setShowRockDlg(true) }

  // Scorecard handlers
  const weeks = (() => { const ws: string[] = []; for (let i = 0; i < 13; i++) { const d = new Date(); d.setDate(d.getDate() - i * 7); ws.push(d.toISOString().slice(0, 10)) }; return ws })()
  const saveEntry = async (metricId: string, week: string, val: string) => {
    const actual = parseFloat(val); if (isNaN(actual)) return
    await api('/api/v1/eos/scorecard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'entry', metricId, week, actual }) })
    load()
  }
  const addMetric = async () => {
    if (!metricForm.name.trim()) return
    const d = await api('/api/v1/eos/scorecard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metricForm) })
    if (d.success) { toast.success('Metrik erstellt'); setShowMetricDlg(false); setMetricForm({ name: '', goal: '', unit: 'Stk' }); load() }
  }

  // Issue handlers
  const filteredIssues = issueFilter === 'all' ? issues : issues.filter(i => i.status === issueFilter)
  const saveIssue = async () => {
    if (!issueForm.title.trim()) return
    const d = await api('/api/v1/eos/issues', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(issueForm) })
    if (d.success) { toast.success('Issue erstellt'); setShowIssueDlg(false); setIssueForm({ title: '', description: '', priority: 'medium' }); load() }
  }
  const solveIssue = async () => {
    if (!editIssue) return
    const d = await api(`/api/v1/eos/issues/${editIssue.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'solved', solution: solutionText }) })
    if (d.success) { toast.success('Issue geloest'); setEditIssue(null); load() }
  }

  // Meeting handlers
  const createMeet = async () => {
    const d = await api('/api/v1/eos/meetings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: meetTitle }) })
    if (d.success) { toast.success('Meeting erstellt'); setShowMeetDlg(false); setMeetTitle('L10 Meeting'); load() }
  }
  const saveMeetNotes = async () => {
    if (!editMeet) return
    const d = await api(`/api/v1/eos/meetings/${editMeet.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: meetNotes }) })
    if (d.success) { toast.success('Notizen gespeichert'); load() }
  }
  const closeMeet = async () => {
    if (!editMeet) return
    const d = await api(`/api/v1/eos/meetings/${editMeet.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'closed' }) })
    if (d.success) { toast.success('Meeting geschlossen'); setEditMeet(null); load() }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/intern/management"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">EOS</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="vto">VTO</TabsTrigger><TabsTrigger value="rocks">Rocks</TabsTrigger><TabsTrigger value="scorecard">Scorecard</TabsTrigger><TabsTrigger value="issues">Issues</TabsTrigger><TabsTrigger value="meetings">Meetings</TabsTrigger></TabsList>

        {/* ── VTO ─────────────────────────────────────────── */}
        <TabsContent value="vto" className="space-y-4">
          <Card><CardContent className="pt-6 space-y-4">
            <div><label className="text-sm font-medium block mb-1">Core Values (kommagetrennt)</label>
              <Input value={vto.coreValues?.join(', ') || ''} onChange={e => setVto({ ...vto, coreValues: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} /></div>
            <div><label className="text-sm font-medium block mb-1">Core Focus</label>
              <Input value={vto.coreFocus || ''} onChange={e => setVto({ ...vto, coreFocus: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">10-Jahres-Ziel</label>
              <Input value={vto.tenYearTarget || ''} onChange={e => setVto({ ...vto, tenYearTarget: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Marketing-Strategie</label>
              <Textarea value={vto.marketingStrategy || ''} onChange={e => setVto({ ...vto, marketingStrategy: e.target.value })} rows={3} /></div>
            <div><label className="text-sm font-medium block mb-1">3-Jahres-Bild</label>
              <Textarea value={vto.threeYearPicture || ''} onChange={e => setVto({ ...vto, threeYearPicture: e.target.value })} rows={3} /></div>
            <div><label className="text-sm font-medium block mb-1">1-Jahres-Plan</label>
              <Textarea value={vto.oneYearPlan || ''} onChange={e => setVto({ ...vto, oneYearPlan: e.target.value })} rows={3} /></div>
            <Button onClick={saveVto} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" />Speichern</>}</Button>
          </CardContent></Card>
        </TabsContent>

        {/* ── Rocks ────────────────────────────────────────── */}
        <TabsContent value="rocks" className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={rockQ} onValueChange={setRockQ}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Alle Quartale</SelectItem>
                {[...new Set(rocks.map(r => r.quarter))].sort().map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
              </SelectContent></Select>
            <Button onClick={openNewRock}><Plus className="h-4 w-4 mr-2" />Neuer Rock</Button>
          </div>
          {filteredRocks.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">Keine Rocks</CardContent></Card> : (
            <div className="space-y-2">{filteredRocks.map(r => (
              <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEditRock(r)}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div><p className="font-medium">{r.title}</p><p className="text-sm text-muted-foreground">{r.quarter}{r.description ? ` — ${r.description}` : ''}</p></div>
                  <Badge className={cn('text-white', STATUS_COLORS[r.status])}>{r.status}</Badge>
                </CardContent>
              </Card>
            ))}</div>
          )}
        </TabsContent>

        {/* ── Scorecard ─────────────────────────────────────── */}
        <TabsContent value="scorecard" className="space-y-4">
          <Button onClick={() => setShowMetricDlg(true)}><Plus className="h-4 w-4 mr-2" />Metrik hinzufuegen</Button>
          {metrics.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">Keine Metriken</CardContent></Card> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="border-b">
                  <th className="text-left p-2 sticky left-0 bg-background min-w-[160px]">Metrik</th>
                  <th className="p-2 text-center min-w-[60px]">Ziel</th>
                  {weeks.map(w => <th key={w} className="p-2 text-center min-w-[70px] text-xs">{new Date(w).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</th>)}
                </tr></thead>
                <tbody>{metrics.map(m => (
                  <tr key={m.id} className="border-b">
                    <td className="p-2 sticky left-0 bg-background font-medium">{m.name} <span className="text-xs text-muted-foreground">({m.unit})</span></td>
                    <td className="p-2 text-center text-muted-foreground">{m.goal ?? '-'}</td>
                    {weeks.map(w => {
                      const entry = m.entries?.find((e: any) => e.week === w)
                      const val = entry ? Number(entry.actual) : null
                      const goal = m.goal ? Number(m.goal) : null
                      const isGreen = val !== null && goal !== null && val >= goal
                      return <td key={w} className={cn('p-1 text-center', val !== null && goal !== null && (isGreen ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'))}>
                        <Input className="w-16 h-7 text-center text-xs mx-auto" defaultValue={val?.toString() ?? ''} onBlur={e => { if (e.target.value !== (val?.toString() ?? '')) saveEntry(m.id, w, e.target.value) }} />
                      </td>
                    })}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Issues ─────────────────────────────────────── */}
        <TabsContent value="issues" className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={issueFilter} onValueChange={setIssueFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Alle</SelectItem><SelectItem value="open">Offen</SelectItem><SelectItem value="solved">Geloest</SelectItem></SelectContent></Select>
            <Button onClick={() => setShowIssueDlg(true)}><Plus className="h-4 w-4 mr-2" />Neues Issue</Button>
          </div>
          {filteredIssues.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">Keine Issues</CardContent></Card> : (
            <div className="space-y-2">{filteredIssues.map(i => (
              <Card key={i.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setEditIssue(i); setSolutionText(i.solution || '') }}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div><p className="font-medium">{i.title}</p>{i.description && <p className="text-sm text-muted-foreground line-clamp-1">{i.description}</p>}</div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn('text-white', PRIORITY_COLORS[i.priority])}>{i.priority}</Badge>
                    <Badge variant={i.status === 'open' ? 'destructive' : 'secondary'}>{i.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}</div>
          )}
        </TabsContent>

        {/* ── Meetings ─────────────────────────────────────── */}
        <TabsContent value="meetings" className="space-y-4">
          <Button onClick={() => setShowMeetDlg(true)}><Plus className="h-4 w-4 mr-2" />Neues Meeting</Button>
          {meetings.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">Keine Meetings</CardContent></Card> : (
            <div className="space-y-2">{meetings.map(m => (
              <Card key={m.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setEditMeet(m); setMeetNotes(m.notes || '') }}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div><p className="font-medium">{m.title}</p><p className="text-sm text-muted-foreground">{new Date(m.meetingDate).toLocaleDateString('de-DE')}</p></div>
                  <Badge variant={m.status === 'closed' ? 'secondary' : 'default'}>{m.status === 'closed' ? 'Geschlossen' : 'Offen'}</Badge>
                </CardContent>
              </Card>
            ))}</div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ──────────────────────────────────────── */}
      {/* Rock Dialog */}
      <Dialog open={showRockDlg} onOpenChange={v => { if (!v) { setShowRockDlg(false); setEditRock(null) } }}>
        <DialogContent><DialogHeader><DialogTitle>{editRock ? 'Rock bearbeiten' : 'Neuer Rock'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium block mb-1">Titel *</label><Input value={rockForm.title} onChange={e => setRockForm({ ...rockForm, title: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Beschreibung</label><Textarea value={rockForm.description} onChange={e => setRockForm({ ...rockForm, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium block mb-1">Quartal</label><Input value={rockForm.quarter} onChange={e => setRockForm({ ...rockForm, quarter: e.target.value })} /></div>
              <div><label className="text-sm font-medium block mb-1">Status</label>
                <Select value={rockForm.status} onValueChange={v => setRockForm({ ...rockForm, status: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="on-track">On-Track</SelectItem><SelectItem value="off-track">Off-Track</SelectItem><SelectItem value="done">Done</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setShowRockDlg(false); setEditRock(null) }}>Abbrechen</Button><Button onClick={saveRock}>Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Metric Dialog */}
      <Dialog open={showMetricDlg} onOpenChange={setShowMetricDlg}>
        <DialogContent><DialogHeader><DialogTitle>Neue Metrik</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium block mb-1">Name *</label><Input value={metricForm.name} onChange={e => setMetricForm({ ...metricForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium block mb-1">Zielwert</label><Input value={metricForm.goal} onChange={e => setMetricForm({ ...metricForm, goal: e.target.value })} /></div>
              <div><label className="text-sm font-medium block mb-1">Einheit</label><Input value={metricForm.unit} onChange={e => setMetricForm({ ...metricForm, unit: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowMetricDlg(false)}>Abbrechen</Button><Button onClick={addMetric}>Erstellen</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Create Dialog */}
      <Dialog open={showIssueDlg} onOpenChange={setShowIssueDlg}>
        <DialogContent><DialogHeader><DialogTitle>Neues Issue</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium block mb-1">Titel *</label><Input value={issueForm.title} onChange={e => setIssueForm({ ...issueForm, title: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Beschreibung</label><Textarea value={issueForm.description} onChange={e => setIssueForm({ ...issueForm, description: e.target.value })} rows={2} /></div>
            <div><label className="text-sm font-medium block mb-1">Prioritaet</label>
              <Select value={issueForm.priority} onValueChange={v => setIssueForm({ ...issueForm, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="high">Hoch</SelectItem><SelectItem value="medium">Mittel</SelectItem><SelectItem value="low">Niedrig</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowIssueDlg(false)}>Abbrechen</Button><Button onClick={saveIssue}>Erstellen</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Edit/Solve Dialog */}
      <Dialog open={!!editIssue} onOpenChange={v => { if (!v) setEditIssue(null) }}>
        <DialogContent><DialogHeader><DialogTitle>Issue: {editIssue?.title}</DialogTitle></DialogHeader>
          {editIssue && <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{editIssue.description || 'Keine Beschreibung'}</p>
            <div className="flex gap-2"><Badge className={cn('text-white', PRIORITY_COLORS[editIssue.priority])}>{editIssue.priority}</Badge><Badge variant={editIssue.status === 'open' ? 'destructive' : 'secondary'}>{editIssue.status}</Badge></div>
            {editIssue.status === 'open' && <>
              <div><label className="text-sm font-medium block mb-1">Loesung</label><Textarea value={solutionText} onChange={e => setSolutionText(e.target.value)} rows={3} placeholder="Wie wurde das Issue geloest?" /></div>
            </>}
            {editIssue.solution && <div><p className="text-sm font-medium">Loesung:</p><p className="text-sm text-muted-foreground">{editIssue.solution}</p></div>}
          </div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditIssue(null)}>Schliessen</Button>
            {editIssue?.status === 'open' && <Button onClick={solveIssue}><Check className="h-4 w-4 mr-2" />Als geloest markieren</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting Create Dialog */}
      <Dialog open={showMeetDlg} onOpenChange={setShowMeetDlg}>
        <DialogContent><DialogHeader><DialogTitle>Neues L10 Meeting</DialogTitle></DialogHeader>
          <div><label className="text-sm font-medium block mb-1">Titel</label><Input value={meetTitle} onChange={e => setMeetTitle(e.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setShowMeetDlg(false)}>Abbrechen</Button><Button onClick={createMeet}>Erstellen</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting Edit Dialog */}
      <Dialog open={!!editMeet} onOpenChange={v => { if (!v) setEditMeet(null) }}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editMeet?.title}</DialogTitle></DialogHeader>
          {editMeet && <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{new Date(editMeet.meetingDate).toLocaleDateString('de-DE')}</p>
            <Badge variant={editMeet.status === 'closed' ? 'secondary' : 'default'}>{editMeet.status === 'closed' ? 'Geschlossen' : 'Offen'}</Badge>
            <div><label className="text-sm font-medium block mb-1">Notizen</label><Textarea value={meetNotes} onChange={e => setMeetNotes(e.target.value)} rows={6} /></div>
          </div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMeet(null)}>Schliessen</Button>
            <Button variant="outline" onClick={saveMeetNotes}><Save className="h-4 w-4 mr-2" />Notizen speichern</Button>
            {editMeet?.status !== 'closed' && <Button variant="destructive" onClick={closeMeet}><X className="h-4 w-4 mr-2" />Meeting schliessen</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
