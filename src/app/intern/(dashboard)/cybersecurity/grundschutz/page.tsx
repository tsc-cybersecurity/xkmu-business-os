'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, Download, RefreshCw, Search, ChevronRight, Loader2, Info, Plus, Trash2, Play, CheckCircle2, Link2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface CatalogMeta {
  title: string; version: string; lastModified: string; oscalVersion: string
  totalGroups: number; totalControls: number; importedAt: string
}

interface Group {
  id: string; title: string; controlCount: number
  subgroups: Array<{ id: string; title: string; controlCount: number }>
}

interface Control {
  id: string; groupId: string; title: string; statement: string | null
  secLevel: string | null; effortLevel: string | null; tags: string[]
}

interface ControlLink { controlId: string; title: string; rel: string }

interface ControlDetail extends Control {
  guidance: string | null; modalVerb: string | null; actionWord: string | null
  result: string | null; links: ControlLink[]
}

interface AuditSession {
  id: string; title: string; status: string; companyName: string | null
  totalControls: number; erfuellt: number; offen: number; createdAt: string
}

const SEC_COLORS: Record<string, string> = {
  'normal-SdT': 'bg-green-100 text-green-700', 'hoch': 'bg-orange-100 text-orange-700',
}
const SEC_LABELS: Record<string, string> = { 'normal-SdT': 'Normal', 'hoch': 'Hoch' }
const STATUS_LABELS: Record<string, string> = { draft: 'Entwurf', in_progress: 'In Bearbeitung', completed: 'Abgeschlossen' }
const STATUS_COLORS: Record<string, string> = { draft: 'bg-gray-100 text-gray-700', in_progress: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700' }

export default function GrundschutzPage() {
  const router = useRouter()
  const [meta, setMeta] = useState<CatalogMeta | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [controls, setControls] = useState<Control[]>([])
  const [selectedControl, setSelectedControl] = useState<ControlDetail | null>(null)
  const [audits, setAudits] = useState<AuditSession[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [loadingControls, setLoadingControls] = useState(false)
  const [search, setSearch] = useState('')
  const [secFilter, setSecFilter] = useState('')
  const [loadingDetail, setLoadingDetail] = useState(false)

  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/grundschutz/catalog')
      const data = await res.json()
      if (data.success) { setMeta(data.data.meta); setUpdateAvailable(data.data.updateAvailable) }
    } catch { /* */ }
  }, [])

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/grundschutz/groups')
      const data = await res.json()
      if (data.success) setGroups(data.data)
    } catch { /* */ }
    finally { setLoading(false) }
  }, [])

  const fetchAudits = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/grundschutz/audits')
      const data = await res.json()
      if (data.success) setAudits(data.data)
    } catch { /* */ }
  }, [])

  useEffect(() => { fetchMeta(); fetchGroups(); fetchAudits() }, [fetchMeta, fetchGroups, fetchAudits])

  const handleImport = async () => {
    setImporting(true)
    try {
      const res = await fetch('/api/v1/grundschutz/catalog', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(`${data.data.controls} Controls, ${data.data.links || 0} Links importiert`)
        fetchMeta(); fetchGroups(); setUpdateAvailable(false)
      } else toast.error('Import fehlgeschlagen')
    } catch { toast.error('Fehler') }
    finally { setImporting(false) }
  }

  const loadControls = async (groupId: string) => {
    setSelectedGroup(groupId); setSelectedControl(null); setLoadingControls(true)
    try {
      const p = new URLSearchParams({ groupId })
      if (secFilter) p.set('secLevel', secFilter)
      if (search) p.set('search', search)
      const res = await fetch(`/api/v1/grundschutz/controls?${p}`)
      const data = await res.json()
      if (data.success) setControls(data.data)
    } catch { /* */ }
    finally { setLoadingControls(false) }
  }

  useEffect(() => { if (selectedGroup) loadControls(selectedGroup) }, [secFilter]) // eslint-disable-line

  const selectControl = async (c: Control) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/v1/grundschutz/controls/${encodeURIComponent(c.id)}`)
      const data = await res.json()
      if (data.success) setSelectedControl(data.data)
      else setSelectedControl({ ...c, guidance: null, modalVerb: null, actionWord: null, result: null, links: [] })
    } catch {
      setSelectedControl({ ...c, guidance: null, modalVerb: null, actionWord: null, result: null, links: [] })
    }
    finally { setLoadingDetail(false) }
  }

  const createAudit = async () => {
    try {
      const res = await fetch('/api/v1/grundschutz/audits', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Audit ${new Date().toLocaleDateString('de-DE')}` }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Audit erstellt')
        router.push(`/intern/cybersecurity/grundschutz/audit/${data.data.id}`)
      }
    } catch { toast.error('Fehler') }
  }

  const deleteAudit = async (id: string) => {
    if (!confirm('Audit wirklich loeschen?')) return
    await fetch(`/api/v1/grundschutz/audits/${id}`, { method: 'DELETE' })
    fetchAudits()
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  if (!meta) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3"><Shield className="h-8 w-8 text-primary" /><div><h1 className="text-3xl font-bold">Grundschutz++</h1><p className="text-muted-foreground">BSI OSCAL-Katalog</p></div></div>
        <Card><CardContent className="flex flex-col items-center py-12">
          <Download className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Katalog importieren</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-md text-center">643 Controls direkt von GitHub laden.</p>
          <Button onClick={handleImport} disabled={importing} size="lg">{importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}Importieren</Button>
        </CardContent></Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div><h1 className="text-2xl font-bold">Grundschutz++</h1><p className="text-sm text-muted-foreground">{meta.totalControls} Controls · {audits.length} Audits</p></div>
        </div>
        <div className="flex items-center gap-2">
          {updateAvailable && <Badge variant="outline" className="border-orange-400 text-orange-600">Update</Badge>}
          <Button variant="outline" size="sm" onClick={handleImport} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}Import
          </Button>
          <Button size="sm" onClick={createAudit}><Plus className="h-4 w-4 mr-1" />Neues Audit</Button>
        </div>
      </div>

      <Tabs defaultValue="catalog" className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-6">
          <TabsList className="h-10 bg-transparent p-0 gap-4">
            <TabsTrigger value="catalog" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Katalog</TabsTrigger>
            <TabsTrigger value="audits" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Audits ({audits.length})</TabsTrigger>
          </TabsList>
        </div>

        {/* KATALOG TAB */}
        <TabsContent value="catalog" className="flex-1 flex overflow-hidden m-0">
          {/* Gruppen */}
          <div className="w-72 border-r flex flex-col shrink-0">
            <div className="p-2 border-b text-[10px] text-muted-foreground px-3">OSCAL v{meta.oscalVersion}</div>
            <div className="flex-1 overflow-y-auto">
              {groups.map(g => (
                <button key={g.id} onClick={() => loadControls(g.id)} className={cn('w-full text-left px-3 py-2.5 border-b hover:bg-muted/50 transition-colors', selectedGroup === g.id && 'bg-muted')}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">{g.id}</Badge><span className="text-xs font-medium truncate">{g.title}</span></div>
                      <span className="text-[10px] text-muted-foreground">{g.controlCount} Controls</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="w-80 xl:w-96 border-r flex flex-col shrink-0">
            {selectedGroup ? (
              <>
                <div className="p-2 border-b flex gap-1.5">
                  <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadControls(selectedGroup)} className="pl-8 h-7 text-xs" /></div>
                  <Select value={secFilter || 'all'} onValueChange={v => setSecFilter(v === 'all' ? '' : v)}><SelectTrigger className="w-24 h-7 text-[10px]"><SelectValue placeholder="Level" /></SelectTrigger><SelectContent><SelectItem value="all">Alle</SelectItem><SelectItem value="normal-SdT">Normal</SelectItem><SelectItem value="hoch">Hoch</SelectItem></SelectContent></Select>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loadingControls ? <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin" /></div> : controls.map(c => (
                    <button key={c.id} onClick={() => selectControl(c)} className={cn('w-full text-left px-3 py-2 border-b hover:bg-muted/50', selectedControl?.id === c.id && 'bg-muted')}>
                      <div className="flex items-center gap-1.5 mb-0.5"><code className="text-[9px] font-mono bg-muted px-1 rounded">{c.id}</code>{c.secLevel && <Badge variant="outline" className={cn('text-[8px] px-1 py-0', SEC_COLORS[c.secLevel])}>{SEC_LABELS[c.secLevel]}</Badge>}</div>
                      <p className="text-xs truncate">{c.title}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><Info className="h-6 w-6 mb-1" /><p className="text-xs">Gruppe waehlen</p></div>}
          </div>

          {/* Detail */}
          <div className="flex-1 overflow-y-auto p-6">
            {loadingDetail ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : selectedControl ? (
              <div className="max-w-2xl space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{selectedControl.id}</code>
                  {selectedControl.secLevel && <Badge variant="outline" className={SEC_COLORS[selectedControl.secLevel]}>{SEC_LABELS[selectedControl.secLevel]}</Badge>}
                  {selectedControl.effortLevel && <Badge variant="secondary" className="text-xs">Aufwand: {selectedControl.effortLevel}</Badge>}
                  {selectedControl.modalVerb && <Badge className={cn('text-xs', selectedControl.modalVerb === 'MUSS' ? 'bg-red-100 text-red-700' : selectedControl.modalVerb === 'SOLLTE' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700')}>{selectedControl.modalVerb}</Badge>}
                </div>
                <h2 className="text-xl font-bold">{selectedControl.title}</h2>
                {selectedControl.statement && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Anforderung</CardTitle></CardHeader><CardContent><p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedControl.statement}</p></CardContent></Card>}
                {selectedControl.guidance && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Umsetzungshinweise</CardTitle></CardHeader><CardContent><p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{selectedControl.guidance}</p></CardContent></Card>}
                {selectedControl.links?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Link2 className="h-4 w-4" />Verknuepfte Controls ({selectedControl.links.length})</CardTitle></CardHeader>
                    <CardContent className="space-y-1.5">
                      {selectedControl.links.filter(l => l.rel === 'required').length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-red-600 mb-1">Voraussetzungen (required)</p>
                          {selectedControl.links.filter(l => l.rel === 'required').map(l => (
                            <button key={l.controlId} onClick={() => selectControl({ id: l.controlId, groupId: '', title: l.title, statement: null, secLevel: null, effortLevel: null, tags: [] })} className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-muted/50 group">
                              <ArrowRight className="h-3 w-3 text-red-400 shrink-0" />
                              <code className="text-[10px] font-mono bg-red-50 text-red-700 px-1 rounded">{l.controlId}</code>
                              <span className="text-xs truncate">{l.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedControl.links.filter(l => l.rel === 'related').length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-blue-600 mb-1">Verwandt (related)</p>
                          {selectedControl.links.filter(l => l.rel === 'related').map(l => (
                            <button key={l.controlId} onClick={() => selectControl({ id: l.controlId, groupId: '', title: l.title, statement: null, secLevel: null, effortLevel: null, tags: [] })} className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-muted/50 group">
                              <Link2 className="h-3 w-3 text-blue-400 shrink-0" />
                              <code className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1 rounded">{l.controlId}</code>
                              <span className="text-xs truncate">{l.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                {selectedControl.tags?.length > 0 && <div className="flex flex-wrap gap-1">{selectedControl.tags.map((t, i) => <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>)}</div>}
              </div>
            ) : <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><Shield className="h-10 w-10 mb-3" /><p className="text-sm">Control auswaehlen</p></div>}
          </div>
        </TabsContent>

        {/* AUDITS TAB */}
        <TabsContent value="audits" className="flex-1 overflow-auto p-6 m-0">
          {audits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Noch keine Audits</h3>
              <p className="text-muted-foreground text-sm mb-6">Starten Sie ein neues Grundschutz++ Audit.</p>
              <Button onClick={createAudit}><Plus className="h-4 w-4 mr-2" />Neues Audit</Button>
            </div>
          ) : (
            <div className="max-w-4xl space-y-3">
              {audits.map(a => {
                const progress = a.totalControls > 0 ? Math.round(((a.totalControls - a.offen) / a.totalControls) * 100) : 0
                return (
                  <Card key={a.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link href={`/intern/cybersecurity/grundschutz/audit/${a.id}`} className="font-semibold hover:underline">{a.title}</Link>
                          <Badge className={STATUS_COLORS[a.status]}>{STATUS_LABELS[a.status] || a.status}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {a.companyName && <span>Firma: {a.companyName}</span>}
                          <span>{a.totalControls} Controls</span>
                          <span>{a.erfuellt} erfuellt</span>
                          <span>{a.offen} offen</span>
                          <span>{new Date(a.createdAt).toLocaleDateString('de-DE')}</span>
                        </div>
                        <div className="w-48 h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Link href={`/intern/cybersecurity/grundschutz/audit/${a.id}`}>
                          <Button variant="outline" size="sm"><Play className="h-4 w-4 mr-1" />{a.status === 'draft' ? 'Starten' : 'Fortsetzen'}</Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteAudit(a.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
