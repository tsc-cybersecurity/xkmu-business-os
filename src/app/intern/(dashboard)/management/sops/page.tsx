'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Loader2, Plus, ArrowLeft, Search, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

/* eslint-disable @typescript-eslint/no-explicit-any */

const CATEGORIES = [
  'Vertrieb', 'Marketing', 'Projektmanagement', 'IT & Cybersicherheit',
  'Finanzen & Buchhaltung', 'HR & Onboarding', 'Kundenservice', 'Compliance & DSGVO',
]
const STATUS_LABELS: Record<string, string> = { draft: 'Entwurf', review: 'Review', approved: 'Freigegeben', archived: 'Archiviert' }
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { draft: 'secondary', review: 'outline', approved: 'default', archived: 'destructive' }

export default function SopsPage() {
  const [sops, setSops] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', category: 'Vertrieb', purpose: '', scope: '' })
  const [automationFilter, setAutomationFilter] = useState('all')
  const [maturityFilter, setMaturityFilter] = useState('all')

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (catFilter !== 'all') params.set('category', catFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (search.trim()) params.set('q', search.trim())
    if (automationFilter !== 'all') params.set('automation_level', automationFilter)
    if (maturityFilter !== 'all') params.set('maturity_level', maturityFilter)
    const res = await fetch(`/api/v1/sops?${params}`)
    const d = await res.json()
    if (d.success) setSops(d.data)
    setLoading(false)
  }, [catFilter, statusFilter, search, automationFilter, maturityFilter])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/intern/management"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div><h1 className="text-3xl font-bold flex items-center gap-2"><FileText className="h-8 w-8" />SOPs</h1>
            <p className="text-muted-foreground mt-1">Standard Operating Procedures</p></div>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Neue SOP</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Suche..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Kategorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
            <SelectItem value="1">Reife 1/5</SelectItem>
            <SelectItem value="2">Reife 2/5</SelectItem>
            <SelectItem value="3">Reife 3/5</SelectItem>
            <SelectItem value="4">Reife 4/5</SelectItem>
            <SelectItem value="5">Reife 5/5</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* SOP Grid */}
      {sops.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Keine SOPs gefunden</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sops.map(s => (
            <Link key={s.id} href={`/intern/management/sops/${s.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{s.category}</Badge>
                    <Badge variant={STATUS_VARIANT[s.status] || 'secondary'} className="text-xs">{STATUS_LABELS[s.status] || s.status}</Badge>
                  </div>
                  <CardTitle className="text-base mt-2">{s.title}</CardTitle>
                  {s.purpose && <CardDescription className="line-clamp-2">{s.purpose}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>v{s.version}</span>
                    <span>{new Date(s.updatedAt).toLocaleDateString('de-DE')}</span>
                  </div>
                  {s.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.tags.slice(0, 4).map((t: string) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                    </div>
                  )}
                  {/* Neue Framework-Badges */}
                  {(s.automation_level || s.maturity_level) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.automation_level && (
                        <Badge variant={s.automation_level === 'full' ? 'default' : 'secondary'} className="text-xs">
                          {s.automation_level === 'manual' ? 'Manuell' : s.automation_level === 'semi' ? 'Semi-Auto' : 'Vollautomatisch'}
                        </Badge>
                      )}
                      {s.maturity_level && (
                        <Badge variant="outline" className="text-xs">Reife {s.maturity_level}/5</Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
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
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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
