'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, Download, RefreshCw, Search, ChevronRight, Loader2, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CatalogMeta {
  title: string; version: string; lastModified: string; oscalVersion: string
  totalGroups: number; totalControls: number; importedAt: string
}

interface Group {
  id: string; title: string; parentId: string | null; sortOrder: number
  controlCount: number; subgroups: Array<{ id: string; title: string; controlCount: number }>
}

interface Control {
  id: string; groupId: string; title: string; statement: string | null
  secLevel: string | null; effortLevel: string | null; tags: string[]
}

const SEC_LEVEL_COLORS: Record<string, string> = {
  'normal-SdT': 'bg-green-100 text-green-700 border-green-200',
  'hoch': 'bg-orange-100 text-orange-700 border-orange-200',
  'sehr-hoch': 'bg-red-100 text-red-700 border-red-200',
}

const SEC_LEVEL_LABELS: Record<string, string> = {
  'normal-SdT': 'Normal', 'hoch': 'Hoch', 'sehr-hoch': 'Sehr hoch',
}

export default function GrundschutzPage() {
  const [meta, setMeta] = useState<CatalogMeta | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [controls, setControls] = useState<Control[]>([])
  const [selectedControl, setSelectedControl] = useState<Control | null>(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [loadingControls, setLoadingControls] = useState(false)
  const [search, setSearch] = useState('')
  const [secFilter, setSecFilter] = useState('')

  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/grundschutz/catalog')
      const data = await res.json()
      if (data.success) {
        setMeta(data.data.meta)
        setUpdateAvailable(data.data.updateAvailable)
      }
    } catch { /* ignore */ }
  }, [])

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/grundschutz/groups')
      const data = await res.json()
      if (data.success) setGroups(data.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchMeta(); fetchGroups() }, [fetchMeta, fetchGroups])

  const handleImport = async () => {
    setImporting(true)
    try {
      const res = await fetch('/api/v1/grundschutz/catalog', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(`Katalog importiert: ${data.data.groups} Gruppen, ${data.data.controls} Controls`)
        fetchMeta(); fetchGroups()
        setUpdateAvailable(false)
      } else {
        toast.error('Import fehlgeschlagen')
      }
    } catch { toast.error('Fehler beim Import') }
    finally { setImporting(false) }
  }

  const loadControls = async (groupId: string) => {
    setSelectedGroup(groupId)
    setSelectedControl(null)
    setLoadingControls(true)
    try {
      const params = new URLSearchParams({ groupId })
      if (secFilter) params.set('secLevel', secFilter)
      if (search) params.set('search', search)
      const res = await fetch(`/api/v1/grundschutz/controls?${params}`)
      const data = await res.json()
      if (data.success) setControls(data.data)
    } catch { /* ignore */ }
    finally { setLoadingControls(false) }
  }

  useEffect(() => {
    if (selectedGroup) loadControls(selectedGroup)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secFilter])

  const handleSearch = () => {
    if (selectedGroup) loadControls(selectedGroup)
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  // Kein Katalog importiert
  if (!meta) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div><h1 className="text-3xl font-bold">Grundschutz++</h1><p className="text-muted-foreground">BSI OSCAL-Katalog fuer IT-Sicherheit</p></div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Download className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Katalog noch nicht importiert</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md text-center">
              Der BSI Grundschutz++ Katalog mit 643 Controls wird direkt von GitHub geladen.
            </p>
            <Button onClick={handleImport} disabled={importing} size="lg">
              {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Katalog importieren
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Grundschutz++</h1>
            <p className="text-sm text-muted-foreground">{meta.totalControls} Controls in {meta.totalGroups} Gruppen</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {updateAvailable && (
            <Badge variant="outline" className="border-orange-400 text-orange-600"><AlertTriangle className="h-3 w-3 mr-1" />Update verfuegbar</Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleImport} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            {updateAvailable ? 'Aktualisieren' : 'Neu importieren'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Links: Gruppen */}
        <div className="w-72 xl:w-80 border-r flex flex-col shrink-0">
          <div className="p-3 border-b text-xs text-muted-foreground">
            OSCAL v{meta.oscalVersion} · Importiert {new Date(meta.importedAt).toLocaleDateString('de-DE')}
          </div>
          <div className="flex-1 overflow-y-auto">
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => loadControls(g.id)}
                className={cn('w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors', selectedGroup === g.id && 'bg-muted')}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono shrink-0">{g.id}</Badge>
                      <span className="text-sm font-medium truncate">{g.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{g.controlCount} Controls</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Mitte: Controls-Liste */}
        <div className="w-96 xl:w-[420px] border-r flex flex-col shrink-0">
          {selectedGroup ? (
            <>
              <div className="p-3 border-b space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="pl-9 h-8 text-sm" />
                  </div>
                  <Select value={secFilter || 'all'} onValueChange={v => setSecFilter(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Level</SelectItem>
                      <SelectItem value="normal-SdT">Normal</SelectItem>
                      <SelectItem value="hoch">Hoch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loadingControls ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : controls.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Keine Controls gefunden</div>
                ) : controls.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedControl(c)}
                    className={cn('w-full text-left px-4 py-2.5 border-b hover:bg-muted/50 transition-colors', selectedControl?.id === c.id && 'bg-muted')}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <code className="text-[10px] font-mono bg-muted px-1 rounded">{c.id}</code>
                      {c.secLevel && <Badge variant="outline" className={cn('text-[9px] px-1 py-0', SEC_LEVEL_COLORS[c.secLevel])}>{SEC_LEVEL_LABELS[c.secLevel] || c.secLevel}</Badge>}
                    </div>
                    <p className="text-sm truncate">{c.title}</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Info className="h-8 w-8 mb-2" />
              <p className="text-sm">Gruppe auswaehlen</p>
            </div>
          )}
        </div>

        {/* Rechts: Control-Detail */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedControl ? (
            <div className="max-w-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{selectedControl.id}</code>
                    {selectedControl.secLevel && <Badge variant="outline" className={SEC_LEVEL_COLORS[selectedControl.secLevel]}>{SEC_LEVEL_LABELS[selectedControl.secLevel] || selectedControl.secLevel}</Badge>}
                    {selectedControl.effortLevel && <Badge variant="secondary" className="text-xs">Aufwand: {selectedControl.effortLevel}</Badge>}
                  </div>
                  <h2 className="text-xl font-bold">{selectedControl.title}</h2>
                </div>
              </div>

              {selectedControl.statement && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Anforderung</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedControl.statement}</p>
                  </CardContent>
                </Card>
              )}

              {selectedControl.tags && selectedControl.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedControl.tags.map((t, i) => <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>)}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Gruppe: {selectedControl.groupId} · Klasse: {(selectedControl as any).oscalClass || '-'}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Shield className="h-12 w-12 mb-4" />
              <p>Control auswaehlen um Details zu sehen</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
