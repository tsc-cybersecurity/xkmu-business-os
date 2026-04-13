'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Loader2, Plus, ArrowLeft, Search, FileText, Clock, Zap, Bot, User, Shuffle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_LABELS: Record<string, string> = { draft: 'Entwurf', review: 'Review', approved: 'Freigegeben', archived: 'Archiviert' }
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  archived: 'bg-red-100 text-red-700',
}
const AUTOMATION_LABELS: Record<string, string> = { manual: 'Manuell', semi: 'Semi-Auto', full: 'Vollautomatisch' }
const AUTOMATION_COLORS: Record<string, string> = {
  manual: 'bg-gray-100 text-gray-700',
  semi: 'bg-blue-100 text-blue-700',
  full: 'bg-purple-100 text-purple-700',
}
const MATURITY_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-yellow-100 text-yellow-700',
  4: 'bg-blue-100 text-blue-700',
  5: 'bg-green-100 text-green-700',
}
const EXECUTOR_ICONS: Record<string, typeof Bot> = { agent: Bot, human: User, flex: Shuffle }

const DEFAULT_CATEGORIES = [
  'Vertrieb', 'Marketing', 'Projektmanagement', 'IT & Cybersicherheit',
  'Finanzen & Buchhaltung', 'HR & Onboarding', 'Kundenservice', 'Compliance & DSGVO',
]

export default function SopsPage() {
  const [sops, setSops] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [automationFilter, setAutomationFilter] = useState('all')
  const [maturityFilter, setMaturityFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', category: 'Vertrieb', purpose: '', scope: '' })

  // Dynamische Kategorien aus den Daten ableiten
  const categories = [...new Set(sops.map(s => s.category))].filter(Boolean).sort()

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (catFilter !== 'all') params.set('category', catFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (search.trim()) params.set('q', search.trim())
    if (automationFilter !== 'all') params.set('automation_level', automationFilter)
    if (maturityFilter !== 'all') params.set('maturity_level', maturityFilter)
    params.set('limit', '500')
    const res = await fetch(`/api/v1/sops?${params}`)
    const d = await res.json()
    if (d.success) setSops(d.data)
    setLoading(false)
  }, [catFilter, statusFilter, search, automationFilter, maturityFilter])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  // SOPs nach Kategorie gruppieren
  const grouped = sops.reduce<Record<string, any[]>>((acc, s) => {
    const cat = s.category || 'Ohne Kategorie'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  const createSop = async () => {
    if (!form.title.trim()) return
    setCreating(true)
    const res = await fetch('/api/v1/sops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const d = await res.json()
    if (d.success) { toast.success('SOP erstellt'); setShowCreate(false); setForm({ title: '', category: 'Vertrieb', purpose: '', scope: '' }); load() }
    else toast.error('Fehler beim Erstellen')
    setCreating(false)
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/intern/management"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><FileText className="h-8 w-8" />SOPs</h1>
            <p className="text-muted-foreground mt-1">{sops.length} Prozesse in {Object.keys(grouped).length} Kategorien</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Neue SOP</Button>
      </div>

      {/* Filter-Leiste */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Suche nach Titel, SOP-ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Kategorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien ({sops.length})</SelectItem>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c} ({grouped[c]?.length || 0})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="draft">Entwurf</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="approved">Freigegeben</SelectItem>
            <SelectItem value="archived">Archiviert</SelectItem>
          </SelectContent>
        </Select>
        <Select value={automationFilter} onValueChange={setAutomationFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Automatisierung" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Automatisierung</SelectItem>
            <SelectItem value="manual">Manuell</SelectItem>
            <SelectItem value="semi">Semi-Auto</SelectItem>
            <SelectItem value="full">Vollautomatisch</SelectItem>
          </SelectContent>
        </Select>
        <Select value={maturityFilter} onValueChange={setMaturityFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Reifegrad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Reifegrade</SelectItem>
            {[1,2,3,4,5].map(l => <SelectItem key={l} value={String(l)}>Reife {l}/5</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* SOP-Liste nach Kategorie gruppiert — IR-Playbook-Style */}
      {Object.keys(grouped).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Keine SOPs gefunden</CardContent></Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => (
            <div key={category} className="space-y-3">
              {/* Kategorie-Header */}
              <div className="flex items-center gap-2 border-b pb-2">
                <h2 className="text-lg font-semibold">{category}</h2>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>

              {/* SOP-Eintraege als kompakte Zeilen */}
              <div className="space-y-2">
                {items.map((s: any) => {
                  const ExIcon = s.executor ? EXECUTOR_ICONS[s.executor] || Shuffle : null
                  return (
                    <Link key={s.id} href={`/intern/management/sops/${s.id}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* SOP-Nummer */}
                            <div className="flex flex-col items-center shrink-0 w-20">
                              <span className="text-xs font-mono font-bold text-muted-foreground">
                                {s.source_task_id || s.sourceTaskId || '—'}
                              </span>
                              {s.maturity_level && (
                                <Badge className={cn('text-[10px] mt-1', MATURITY_COLORS[s.maturity_level as number])}>
                                  Reife {s.maturity_level}/5
                                </Badge>
                              )}
                            </div>

                            {/* Hauptinhalt */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{s.title}</span>
                                {s.subprocess && (
                                  <span className="text-xs text-muted-foreground">· {s.subprocess}</span>
                                )}
                              </div>
                              {s.purpose && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{s.purpose}</p>
                              )}
                            </div>

                            {/* Badges rechts */}
                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                              {s.automation_level && (
                                <Badge className={cn('text-[10px]', AUTOMATION_COLORS[s.automation_level])}>
                                  {ExIcon && <ExIcon className="h-3 w-3 mr-0.5" />}
                                  {AUTOMATION_LABELS[s.automation_level]}
                                </Badge>
                              )}
                              {s.estimated_duration_minutes && (
                                <Badge variant="outline" className="text-[10px]">
                                  <Clock className="h-3 w-3 mr-0.5" />
                                  {s.estimated_duration_minutes} Min
                                </Badge>
                              )}
                              <Badge className={cn('text-[10px]', STATUS_COLORS[s.status])}>
                                {STATUS_LABELS[s.status] || s.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neue SOP erstellen</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium block mb-1">Titel *</label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="z.B. Kunden-Onboarding" /></div>
            <div><label className="text-sm font-medium block mb-1">Kategorie</label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(categories.length > 0 ? categories : DEFAULT_CATEGORIES).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium block mb-1">Zweck</label><Textarea value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} rows={2} /></div>
            <div><label className="text-sm font-medium block mb-1">Geltungsbereich</label><Textarea value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Abbrechen</Button>
            <Button onClick={createSop} disabled={creating || !form.title.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
