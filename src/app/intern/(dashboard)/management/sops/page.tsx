'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Loader2, Plus, Search, FileText, Clock, Bot, User, Shuffle,
  PanelLeftClose, PanelLeft, Package, ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Link from 'next/link'

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_LABELS: Record<string, string> = { draft: 'Entwurf', review: 'Review', approved: 'Freigegeben', archived: 'Archiviert' }
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700', archived: 'bg-red-100 text-red-700',
}
const AUTOMATION_LABELS: Record<string, string> = { manual: 'Manuell', semi: 'Semi-Auto', full: 'Vollautomatisch' }
const AUTOMATION_COLORS: Record<string, string> = {
  manual: 'bg-gray-100 text-gray-700', semi: 'bg-blue-100 text-blue-700', full: 'bg-purple-100 text-purple-700',
}
const MATURITY_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-700', 2: 'bg-orange-100 text-orange-700', 3: 'bg-yellow-100 text-yellow-700',
  4: 'bg-blue-100 text-blue-700', 5: 'bg-green-100 text-green-700',
}
const MATURITY_LABELS: Record<number, string> = {
  1: 'Dokumentiert', 2: 'Strukturiert', 3: 'KI-unterstuetzt', 4: 'KI-gesteuert', 5: 'Selbstoptimierend',
}
const EXECUTOR_ICONS: Record<string, typeof Bot> = { agent: Bot, human: User, flex: Shuffle }

const DEFAULT_CATEGORIES = [
  'Vertrieb', 'Marketing', 'Projektmanagement', 'IT & Cybersicherheit',
  'Finanzen & Buchhaltung', 'HR & Onboarding', 'Kundenservice', 'Compliance & DSGVO',
]

// ============================================
// SOP Detail Component (inline, no navigation)
// ============================================
function SopDetail({ sop }: { sop: any }) {
  const s = sop
  const steps: any[] = s.steps || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          {s.source_task_id || s.sourceTaskId}
        </div>
        <h1 className="text-2xl font-bold">{s.title}</h1>
        {s.subprocess && <p className="text-sm text-muted-foreground">{s.subprocess}</p>}

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">{s.category}</Badge>
          <Badge className={cn('text-xs', STATUS_COLORS[s.status])}>{STATUS_LABELS[s.status] || s.status}</Badge>
          {s.automation_level && (
            <Badge className={cn('text-xs', AUTOMATION_COLORS[s.automation_level])}>
              {AUTOMATION_LABELS[s.automation_level]}
            </Badge>
          )}
          {s.maturity_level && (
            <Badge className={cn('text-xs', MATURITY_COLORS[s.maturity_level as number])}>
              Reife {s.maturity_level}/5 — {MATURITY_LABELS[s.maturity_level as number]}
            </Badge>
          )}
          {s.estimated_duration_minutes && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />{s.estimated_duration_minutes} Min
            </Badge>
          )}
          {s.ai_capable && (
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
              <Bot className="h-3 w-3 mr-1" />KI-faehig
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Uebersicht</TabsTrigger>
          <TabsTrigger value="steps">Schritte ({steps.length})</TabsTrigger>
          {s.producesDeliverable && <TabsTrigger value="deliverable">Deliverable</TabsTrigger>}
        </TabsList>

        {/* Uebersicht */}
        <TabsContent value="overview" className="space-y-4">
          {s.purpose && (
            <Card>
              <CardHeader><CardTitle className="text-base">Zweck</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{s.purpose}</p></CardContent>
            </Card>
          )}
          {s.scope && (
            <Card>
              <CardHeader><CardTitle className="text-base">Geltungsbereich</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{s.scope}</p></CardContent>
            </Card>
          )}
          {s.tools?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Tools</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {s.tools.map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Version</div>
                <div className="text-sm font-medium">v{s.version}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Zuletzt aktualisiert</div>
                <div className="text-sm font-medium">{new Date(s.updatedAt || s.updated_at).toLocaleDateString('de-DE')}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Schritte */}
        <TabsContent value="steps" className="space-y-2">
          {steps.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Keine Schritte definiert.</p>
          ) : (
            steps.sort((a: any, b: any) => a.sequence - b.sequence).map((step: any) => {
              const ExIcon = step.executor ? EXECUTOR_ICONS[step.executor] || Shuffle : null
              return (
                <Card key={step.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {step.sequence}
                      </span>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{step.title}</p>
                        {step.description && <p className="text-xs text-muted-foreground">{step.description}</p>}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {step.responsible && <Badge variant="outline" className="text-[10px]">{step.responsible}</Badge>}
                          {step.executor && ExIcon && (
                            <Badge variant="outline" className="text-[10px]">
                              <ExIcon className="h-3 w-3 mr-0.5" />{step.executor}
                            </Badge>
                          )}
                          {step.estimated_minutes && (
                            <Badge variant="outline" className="text-[10px]">
                              <Clock className="h-3 w-3 mr-0.5" />{step.estimated_minutes} Min
                            </Badge>
                          )}
                        </div>
                        {step.checklist_items?.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {step.checklist_items.map((item: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <span className="mt-0.5">&#9744;</span>{item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        {/* Deliverable */}
        {s.producesDeliverable && (
          <TabsContent value="deliverable">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{s.producesDeliverable.name}</p>
                    {s.producesDeliverable.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.producesDeliverable.description}</p>
                    )}
                  </div>
                  <Link href={`/intern/management/deliverables/${s.producesDeliverable.id}`}>
                    <Button variant="outline" size="sm"><ExternalLink className="h-3 w-3 mr-1" />Oeffnen</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// ============================================
// Main Page — Split Layout
// ============================================
export default function SopsPage() {
  const [sops, setSops] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [automationFilter, setAutomationFilter] = useState('all')
  const [maturityFilter, setMaturityFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', category: 'Vertrieb', purpose: '', scope: '' })

  // Layout
  const [showSidebar, setShowSidebar] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const categories = [...new Set(sops.map(s => s.category))].filter(Boolean).sort()

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (catFilter !== 'all') params.set('category', catFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
    if (automationFilter !== 'all') params.set('automation_level', automationFilter)
    if (maturityFilter !== 'all') params.set('maturity_level', maturityFilter)
    params.set('limit', '500')
    const res = await fetch(`/api/v1/sops?${params}`)
    const d = await res.json()
    if (d.success) setSops(d.data)
    setLoading(false)
    setHasLoadedOnce(true)
  }, [catFilter, statusFilter, debouncedSearch, automationFilter, maturityFilter])

  useEffect(() => { load() }, [load])

  // Fetch detail
  const fetchDetail = useCallback(async (id: string) => {
    setLoadingDetail(true)
    const res = await fetch(`/api/v1/sops/${id}`)
    const d = await res.json()
    if (d.success) setDetail(d.data)
    setLoadingDetail(false)
  }, [])

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId)
    else setDetail(null)
  }, [selectedId, fetchDetail])

  // Group SOPs by category for sidebar
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

  if (loading && !hasLoadedOnce) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-card border-r flex flex-col shrink-0">
          {/* Sidebar Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />SOPs
              </h2>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowCreate(true)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSidebar(false)}>
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {sops.length} Prozesse in {Object.keys(grouped).length} Kategorien
            </p>
          </div>

          {/* Search & Filters */}
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
            <div className="flex gap-2">
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kategorien</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={automationFilter} onValueChange={setAutomationFilter}>
                <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="manual">Manuell</SelectItem>
                  <SelectItem value="semi">Semi</SelectItem>
                  <SelectItem value="full">Voll</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SOP List grouped by category */}
          <div className="flex-1 overflow-y-auto relative">
            {loading && (
              <div className="absolute right-3 top-2 z-10">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            )}
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-1.5 bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0">
                  {category} ({items.length})
                </div>
                {items.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-4 py-2 text-left text-xs hover:bg-accent transition-colors border-b border-border/40',
                      selectedId === s.id && 'bg-accent font-medium')}
                  >
                    <span className="shrink-0 text-muted-foreground font-mono w-14 text-[10px]">
                      {s.source_task_id || s.sourceTaskId || '—'}
                    </span>
                    <span className="truncate flex-1">{s.title}</span>
                    <span className="shrink-0 flex items-center gap-1">
                      {s.maturity_level && (
                        <span className={cn('w-2 h-2 rounded-full', {
                          'bg-red-500': s.maturity_level === 1,
                          'bg-orange-500': s.maturity_level === 2,
                          'bg-yellow-500': s.maturity_level === 3,
                          'bg-blue-500': s.maturity_level === 4,
                          'bg-green-500': s.maturity_level === 5,
                        })} title={`Reife ${s.maturity_level}/5`} />
                      )}
                      {s.automation_level === 'full' && <Bot className="h-3 w-3 text-purple-500" />}
                    </span>
                  </button>
                ))}
              </div>
            ))}
            {sops.length === 0 && !loading && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">Keine SOPs gefunden</div>
            )}
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
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-semibold">Standard Operating Procedures</span>
              {detail && (
                <span className="text-sm text-muted-foreground hidden md:inline">— {detail.title}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="draft">Entwurf</SelectItem>
                <SelectItem value="approved">Freigegeben</SelectItem>
                <SelectItem value="archived">Archiviert</SelectItem>
              </SelectContent>
            </Select>
            <Select value={maturityFilter} onValueChange={setMaturityFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Reife</SelectItem>
                {[1,2,3,4,5].map(l => <SelectItem key={l} value={String(l)}>Reife {l}/5</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5 mr-1" />Neu</Button>
          </div>
        </div>

        {/* Detail or Placeholder */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <SopDetail sop={detail} />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">SOP aus der Seitenleiste auswaehlen</p>
              <p className="text-xs mt-1">{sops.length} Prozesse verfuegbar</p>
            </div>
          )}
        </div>
      </div>

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
