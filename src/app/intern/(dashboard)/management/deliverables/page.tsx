'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Search, Package, PanelLeftClose, PanelLeft,
  FileText, ExternalLink, Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ExecutionLogPanel } from '@/components/management/execution-log-panel'

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_LABELS: Record<string, string> = { draft: 'Entwurf', review: 'Review', approved: 'Freigegeben', archived: 'Archiviert' }
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700', archived: 'bg-red-100 text-red-700',
}
const AUTOMATION_LABELS: Record<string, string> = { manual: 'Manuell', semi: 'Semi-Auto', full: 'Vollautomatisch' }
const MATURITY_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-700', 2: 'bg-orange-100 text-orange-700', 3: 'bg-yellow-100 text-yellow-700',
  4: 'bg-blue-100 text-blue-700', 5: 'bg-green-100 text-green-700',
}

// ============================================
// Deliverable Detail (inline, editierbar)
// ============================================
function DeliverableDetail({ deliverable, onSaved }: { deliverable: any; onSaved: () => void }) {
  const d = deliverable
  const sops: any[] = d.producingSops || d.sops || []

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})

  function startEdit() {
    setForm({
      name: d.name ?? '',
      description: d.description ?? '',
      format: d.format ?? '',
      umfang: d.umfang ?? '',
      trigger: d.trigger ?? '',
      status: d.status ?? 'draft',
      category: d.category ?? '',
    })
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/v1/deliverables/${d.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description || null,
        format: form.format || null,
        umfang: form.umfang || null,
        trigger: form.trigger || null,
        status: form.status,
        category: form.category || null,
      }),
    })
    const j = await res.json()
    setSaving(false)
    if (j.success) {
      toast.success('Deliverable gespeichert')
      setEditing(false)
      onSaved()
    } else {
      toast.error('Speichern fehlgeschlagen')
    }
  }

  return (
    <div className="space-y-6">
      {/* Edit-Toolbar */}
      <div className="flex items-center justify-end gap-2">
        {!editing ? (
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1" />Bearbeiten
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>Abbrechen</Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}Speichern
            </Button>
          </>
        )}
      </div>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {d.module?.code && (
            <Badge variant="outline" className="font-mono text-sm font-bold">{d.module.code}</Badge>
          )}
          {!editing ? (
            <Badge className={cn('text-xs', STATUS_COLORS[d.status])}>{STATUS_LABELS[d.status] || d.status}</Badge>
          ) : (
            <Select value={form.status ?? 'draft'} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Entwurf</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="approved">Freigegeben</SelectItem>
                <SelectItem value="archived">Archiviert</SelectItem>
              </SelectContent>
            </Select>
          )}
          <span className="text-xs text-muted-foreground">v{d.version}</span>
        </div>
        {editing ? (
          <Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="text-2xl font-bold h-auto py-1" />
        ) : (
          <h1 className="text-2xl font-bold">{d.name}</h1>
        )}
        {d.module?.name && (
          <p className="text-sm text-muted-foreground">Modul: {d.module.name}</p>
        )}
      </div>

      {/* Beschreibung */}
      {(editing || d.description) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Beschreibung</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <Textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{d.description}</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Format</div>
            {editing ? (
              <Input value={form.format ?? ''} onChange={(e) => setForm({ ...form, format: e.target.value })} className="h-8 text-sm" />
            ) : (
              <div className="text-sm font-medium">{d.format || <span className="text-muted-foreground italic">—</span>}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Umfang</div>
            {editing ? (
              <Input value={form.umfang ?? ''} onChange={(e) => setForm({ ...form, umfang: e.target.value })} className="h-8 text-sm" />
            ) : (
              <div className="text-sm font-medium">{d.umfang || <span className="text-muted-foreground italic">—</span>}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Trigger</div>
            {editing ? (
              <Input value={form.trigger ?? ''} onChange={(e) => setForm({ ...form, trigger: e.target.value })} className="h-8 text-sm" />
            ) : (
              <div className="text-sm font-medium">{d.trigger || <span className="text-muted-foreground italic">—</span>}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {d.module?.ziel && (
        <Card>
          <CardHeader><CardTitle className="text-base">Modulziel</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{d.module.ziel}</p></CardContent>
        </Card>
      )}

      {/* Verknuepfte SOPs */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5" />Produzierende SOPs
          <Badge variant="outline">{sops.length}</Badge>
        </h2>
        {sops.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Keine SOPs verknuepft</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {sops.map((sop: any) => (
              <Link key={sop.id} href={`/intern/management/sops`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {(sop.sourceTaskId || sop.source_task_id) && (
                        <Badge variant="outline" className="font-mono text-xs shrink-0">{sop.sourceTaskId || sop.source_task_id}</Badge>
                      )}
                      <span className="text-sm font-medium truncate">{sop.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {sop.automationLevel && <Badge variant="outline" className="text-[10px]">{AUTOMATION_LABELS[sop.automationLevel] || sop.automationLevel}</Badge>}
                      {sop.maturityLevel && (
                        <Badge className={cn('text-[10px]', MATURITY_COLORS[sop.maturityLevel as number])}>Reife {sop.maturityLevel}/5</Badge>
                      )}
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Execution Log */}
      <ExecutionLogPanel entityType="deliverable" entityId={d.id} />
    </div>
  )
}

// ============================================
// Main Page — Split Layout
// ============================================
export default function DeliverablesPage() {
  const [deliverables, setDeliverables] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

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

  // Load modules
  useEffect(() => {
    fetch('/api/v1/deliverables/modules')
      .then(r => r.json())
      .then(d => { if (d.success) setModules(d.data) })
  }, [])

  // Derive category options from modules
  const categoryOptions = [...new Set(modules.map(m => m.category))].filter(Boolean).sort()

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (moduleFilter !== 'all') params.set('module', moduleFilter)
    if (categoryFilter !== 'all') params.set('category', categoryFilter)
    params.set('limit', '500')
    const res = await fetch(`/api/v1/deliverables?${params}`)
    const d = await res.json()
    if (d.success) setDeliverables(d.data)
    setLoading(false)
    setHasLoadedOnce(true)
  }, [moduleFilter, categoryFilter])

  useEffect(() => { load() }, [load])

  // Fetch detail
  const fetchDetail = useCallback(async (id: string) => {
    setLoadingDetail(true)
    const res = await fetch(`/api/v1/deliverables/${id}`)
    const d = await res.json()
    if (d.success) setDetail(d.data)
    setLoadingDetail(false)
  }, [])

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId)
    else setDetail(null)
  }, [selectedId, fetchDetail])

  // Group deliverables by module code
  const grouped = deliverables.reduce<Record<string, any[]>>((acc, d) => {
    const key = d.module?.code ? `${d.module.code} — ${d.module.name}` : 'Ohne Modul'
    if (!acc[key]) acc[key] = []
    acc[key].push(d)
    return acc
  }, {})

  // Filter by search (client-side since API doesn't support text search for deliverables)
  const filteredGrouped = Object.fromEntries(
    Object.entries(grouped).map(([key, items]) => [
      key,
      debouncedSearch
        ? items.filter((d: any) => d.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || d.description?.toLowerCase().includes(debouncedSearch.toLowerCase()))
        : items,
    ]).filter(([, items]) => (items as any[]).length > 0)
  )

  if (loading && !hasLoadedOnce) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-card border-r flex flex-col shrink-0">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" />Deliverables
              </h2>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSidebar(false)}>
                <PanelLeftClose className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {deliverables.length} Deliverables in {modules.length} Modulen
            </p>
          </div>

          {/* Search & Filters */}
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
            <div className="flex gap-2">
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Module</SelectItem>
                  {modules.map(m => (
                    <SelectItem key={m.code} value={m.code}>{m.code} ({m.deliverableCount})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  {categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deliverable List grouped by module */}
          <div className="flex-1 overflow-y-auto relative">
            {loading && (
              <div className="absolute right-3 top-2 z-10">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            )}
            {Object.entries(filteredGrouped).sort(([a], [b]) => a.localeCompare(b)).map(([moduleLabel, items]) => (
              <div key={moduleLabel}>
                <div className="px-4 py-1.5 bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0">
                  {moduleLabel} ({(items as any[]).length})
                </div>
                {(items as any[]).map((d: any) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedId(d.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-4 py-2 text-left text-xs hover:bg-accent transition-colors border-b border-border/40',
                      selectedId === d.id && 'bg-accent font-medium')}
                  >
                    <span className="truncate flex-1">{d.name}</span>
                    <span className="shrink-0 flex items-center gap-1">
                      {d.format && <span className="text-[10px] text-muted-foreground truncate max-w-16">{d.format.split(' ')[0]}</span>}
                    </span>
                  </button>
                ))}
              </div>
            ))}
            {deliverables.length === 0 && !loading && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">Keine Deliverables gefunden</div>
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
              <Package className="h-4 w-4 text-primary" />
              <span className="font-semibold">Deliverables</span>
              {detail && (
                <span className="text-sm text-muted-foreground hidden md:inline">— {detail.name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Detail or Placeholder */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <DeliverableDetail
              deliverable={detail}
              onSaved={() => { if (selectedId) fetchDetail(selectedId); load() }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">Deliverable aus der Seitenleiste auswaehlen</p>
              <p className="text-xs mt-1">{deliverables.length} Deliverables verfuegbar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
