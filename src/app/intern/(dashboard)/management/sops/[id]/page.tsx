'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, ArrowLeft, Save, Upload, Plus, Trash2, AlertTriangle, CheckSquare } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

/* eslint-disable @typescript-eslint/no-explicit-any */

const CATEGORIES = [
  'Vertrieb', 'Marketing', 'Projektmanagement', 'IT & Cybersicherheit',
  'Finanzen & Buchhaltung', 'HR & Onboarding', 'Kundenservice', 'Compliance & DSGVO',
]
const STATUS_LABELS: Record<string, string> = { draft: 'Entwurf', review: 'Review', approved: 'Freigegeben', archived: 'Archiviert' }

export default function SopDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [sop, setSop] = useState<any>(null)
  const [steps, setSteps] = useState<any[]>([])
  const [versions, setVersions] = useState<any[]>([])
  const [tab, setTab] = useState('editor')

  // Editable metadata
  const [meta, setMeta] = useState({ title: '', category: '', purpose: '', scope: '', tools: '', tags: '', reviewDate: '' })

  const api = async (url: string, opts?: RequestInit) => {
    const res = await fetch(url, opts)
    return res.json()
  }

  const load = useCallback(async () => {
    const d = await api(`/api/v1/sops/${id}`)
    if (d.success) {
      const s = d.data
      setSop(s)
      setSteps(s.steps || [])
      setVersions(s.versions || [])
      setMeta({
        title: s.title || '', category: s.category || '', purpose: s.purpose || '',
        scope: s.scope || '', tools: (s.tools || []).join(', '), tags: (s.tags || []).join(', '),
        reviewDate: s.reviewDate ? new Date(s.reviewDate).toISOString().slice(0, 10) : '',
      })
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const saveSop = async () => {
    setSaving(true)
    try {
      // Save metadata
      await api(`/api/v1/sops/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: meta.title, category: meta.category, purpose: meta.purpose, scope: meta.scope,
          tools: meta.tools.split(',').map(s => s.trim()).filter(Boolean),
          tags: meta.tags.split(',').map(s => s.trim()).filter(Boolean),
          reviewDate: meta.reviewDate || null,
        }),
      })
      // Save steps
      await api(`/api/v1/sops/${id}/steps`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: steps.map((s, i) => ({ ...s, sequence: s.sequence ?? i + 1 })) }),
      })
      toast.success('SOP gespeichert')
      load()
    } catch { toast.error('Fehler beim Speichern') }
    setSaving(false)
  }

  const publishSop = async () => {
    setPublishing(true)
    const d = await api(`/api/v1/sops/${id}/publish`, { method: 'POST' })
    if (d.success) { toast.success('SOP freigegeben'); load() }
    else toast.error('Fehler bei Freigabe')
    setPublishing(false)
  }

  const addStep = () => {
    setSteps([...steps, { title: '', description: '', responsible: '', estimatedMinutes: null, warnings: [], checklistItems: [], sequence: steps.length + 1 }])
  }
  const removeStep = (idx: number) => setSteps(steps.filter((_, i) => i !== idx))
  const updateStep = (idx: number, field: string, value: any) => {
    const next = [...steps]; next[idx] = { ...next[idx], [field]: value }; setSteps(next)
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  if (!sop) return <div className="py-16 text-center text-muted-foreground">SOP nicht gefunden</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/intern/management/sops"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{sop.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">v{sop.version}</Badge>
              <Badge variant={sop.status === 'approved' ? 'default' : 'secondary'}>{STATUS_LABELS[sop.status] || sop.status}</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={saveSop} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" />Speichern</>}
          </Button>
          <Button onClick={publishSop} disabled={publishing}>
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-2" />Freigeben</>}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="editor">Editor</TabsTrigger><TabsTrigger value="preview">Preview</TabsTrigger><TabsTrigger value="versions">Versionen</TabsTrigger></TabsList>

        {/* ── Editor ──────────────────────────────────────── */}
        <TabsContent value="editor" className="space-y-4">
          {/* Metadata */}
          <Card><CardContent className="pt-6 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-sm font-medium block mb-1">Titel</label><Input value={meta.title} onChange={e => setMeta({ ...meta, title: e.target.value })} /></div>
              <div><label className="text-sm font-medium block mb-1">Kategorie</label>
                <Select value={meta.category} onValueChange={v => setMeta({ ...meta, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></div>
            </div>
            <div><label className="text-sm font-medium block mb-1">Zweck</label><Textarea value={meta.purpose} onChange={e => setMeta({ ...meta, purpose: e.target.value })} rows={2} /></div>
            <div><label className="text-sm font-medium block mb-1">Geltungsbereich</label><Textarea value={meta.scope} onChange={e => setMeta({ ...meta, scope: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><label className="text-sm font-medium block mb-1">Tools (kommagetrennt)</label><Input value={meta.tools} onChange={e => setMeta({ ...meta, tools: e.target.value })} /></div>
              <div><label className="text-sm font-medium block mb-1">Tags (kommagetrennt)</label><Input value={meta.tags} onChange={e => setMeta({ ...meta, tags: e.target.value })} /></div>
              <div><label className="text-sm font-medium block mb-1">Review-Datum</label><Input type="date" value={meta.reviewDate} onChange={e => setMeta({ ...meta, reviewDate: e.target.value })} /></div>
            </div>
          </CardContent></Card>

          {/* Steps */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Schritte</h2>
            <Button variant="outline" size="sm" onClick={addStep}><Plus className="h-4 w-4 mr-1" />Schritt</Button>
          </div>
          {steps.length === 0 ? <Card><CardContent className="py-6 text-center text-muted-foreground">Noch keine Schritte</CardContent></Card> : (
            <div className="space-y-3">{steps.map((s, i) => (
              <Card key={i}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Input className="w-16" type="number" min={1} value={s.sequence ?? i + 1} onChange={e => updateStep(i, 'sequence', Number(e.target.value))} />
                      <span className="text-sm font-medium text-muted-foreground">Schritt</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeStep(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><label className="text-sm font-medium block mb-1">Titel</label><Input value={s.title || ''} onChange={e => updateStep(i, 'title', e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-sm font-medium block mb-1">Verantwortlich</label><Input value={s.responsible || ''} onChange={e => updateStep(i, 'responsible', e.target.value)} /></div>
                      <div><label className="text-sm font-medium block mb-1">Min.</label><Input type="number" value={s.estimatedMinutes ?? ''} onChange={e => updateStep(i, 'estimatedMinutes', e.target.value ? Number(e.target.value) : null)} /></div>
                    </div>
                  </div>
                  <div><label className="text-sm font-medium block mb-1">Beschreibung</label><Textarea value={s.description || ''} onChange={e => updateStep(i, 'description', e.target.value)} rows={2} /></div>
                  <div><label className="text-sm font-medium block mb-1">Warnungen (kommagetrennt)</label><Input value={(s.warnings || []).join(', ')} onChange={e => updateStep(i, 'warnings', e.target.value.split(',').map((x: string) => x.trim()).filter(Boolean))} /></div>
                  <div><label className="text-sm font-medium block mb-1">Checkliste (kommagetrennt)</label><Input value={(s.checklistItems || []).join(', ')} onChange={e => updateStep(i, 'checklistItems', e.target.value.split(',').map((x: string) => x.trim()).filter(Boolean))} /></div>
                </CardContent>
              </Card>
            ))}</div>
          )}
        </TabsContent>

        {/* ── Preview ─────────────────────────────────────── */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{meta.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{meta.category}</Badge>
                <Badge variant="outline">v{sop.version}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {meta.purpose && <div><h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Zweck</h3><p className="mt-1">{meta.purpose}</p></div>}
              {meta.scope && <div><h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Geltungsbereich</h3><p className="mt-1">{meta.scope}</p></div>}
              {meta.tools && <div><h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Tools</h3><p className="mt-1">{meta.tools}</p></div>}
            </CardContent>
          </Card>

          {steps.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)).map((s, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">{s.sequence ?? i + 1}</div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg">{s.title || 'Unbenannt'}</h3>
                    {s.responsible && <p className="text-sm text-muted-foreground">Verantwortlich: {s.responsible}{s.estimatedMinutes ? ` — ca. ${s.estimatedMinutes} Min.` : ''}</p>}
                    {s.description && <p className="text-sm whitespace-pre-wrap">{s.description}</p>}
                    {s.warnings?.length > 0 && (
                      <div className="space-y-1">{s.warnings.map((w: string, j: number) => (
                        <div key={j} className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 dark:bg-orange-950/30 p-2 rounded">
                          <AlertTriangle className="h-4 w-4 shrink-0" />{w}
                        </div>
                      ))}</div>
                    )}
                    {s.checklistItems?.length > 0 && (
                      <div className="space-y-1 mt-2">{s.checklistItems.map((c: string, j: number) => (
                        <div key={j} className="flex items-center gap-2 text-sm"><CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" />{c}</div>
                      ))}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {steps.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">Keine Schritte definiert</CardContent></Card>}
        </TabsContent>

        {/* ── Versions ────────────────────────────────────── */}
        <TabsContent value="versions" className="space-y-2">
          {versions.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Noch keine Versionen</CardContent></Card>
          ) : versions.map(v => (
            <Card key={v.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">Version {v.version}</p>
                  <p className="text-sm text-muted-foreground">{v.changeNote}</p>
                </div>
                <span className="text-sm text-muted-foreground">{new Date(v.createdAt).toLocaleDateString('de-DE')}</span>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
