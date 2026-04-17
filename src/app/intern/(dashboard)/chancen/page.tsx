'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Telescope, Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useChatContext } from '@/components/chat/chat-provider'
import { ChancenDialog } from './_components/chancen-dialog'
import { ChancenTable } from './_components/chancen-table'

interface Opportunity {
  id: string
  name: string
  industry: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  country: string | null
  phone: string | null
  email: string | null
  website: string | null
  rating: number | null
  reviewCount: number | null
  status: string
  source: string | null
  searchQuery: string | null
  searchLocation: string | null
  notes: string | null
  placeId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

const statusTabs = [
  { value: 'all', label: 'Alle' },
  { value: 'new', label: 'Neu' },
  { value: 'contacted', label: 'Kontaktiert' },
  { value: 'qualified', label: 'Qualifiziert' },
  { value: 'rejected', label: 'Abgelehnt' },
  { value: 'converted', label: 'Konvertiert' },
]

export default function ChancenPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Search dialog state
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [searchQueries, setSearchQueries] = useState('')
  const [searchLocations, setSearchLocations] = useState('')
  const [searchRadius, setSearchRadius] = useState('25')
  const [searchMaxPerLocation, setSearchMaxPerLocation] = useState('20')
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<{ saved: number; enriched: number; duplicates: number; errors: string[] } | null>(null)

  // Detail/Edit dialog state
  const [detailOpen, setDetailOpen] = useState(false)
  const [editOpp, setEditOpp] = useState<Opportunity | null>(null)
  const [editForm, setEditForm] = useState({ name: '', industry: '', address: '', city: '', postalCode: '', country: '', phone: '', email: '', website: '', notes: '', status: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const { openChat } = useChatContext()

  const openDetail = (opp: Opportunity) => {
    setEditOpp(opp)
    setEditForm({
      name: opp.name || '',
      industry: opp.industry || '',
      address: opp.address || '',
      city: opp.city || '',
      postalCode: opp.postalCode || '',
      country: opp.country || 'DE',
      phone: opp.phone || '',
      email: opp.email || '',
      website: opp.website || '',
      notes: opp.notes || '',
      status: opp.status || 'new',
    })
    setDetailOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editOpp) return
    setSavingEdit(true)
    try {
      const response = await fetch(`/api/v1/opportunities/${editOpp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Chance aktualisiert')
        setDetailOpen(false)
        fetchOpportunities()
      } else {
        toast.error(data.error?.message || 'Speichern fehlgeschlagen')
      }
    } catch {
      toast.error('Fehler beim Speichern')
    } finally {
      setSavingEdit(false)
    }
  }

  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      if (search) params.set('search', search)
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      const response = await fetch(`/api/v1/opportunities?${params}`)
      if (!response.ok) {
        setOpportunities([]); setTotal(0); setTotalPages(1); return
      }
      const data = await response.json()
      if (data.success) {
        setOpportunities(data.data || [])
        if (data.meta) { setTotalPages(data.meta.totalPages || 1); setTotal(data.meta.total || 0) }
      }
    } catch (error) {
      logger.error('Failed to fetch opportunities', error, { module: 'ChancenPage' })
      setOpportunities([])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => { fetchOpportunities() }, [fetchOpportunities])
  useEffect(() => { setPage(1) }, [search, statusFilter])

  const handleSearch = async () => {
    toast.info('Suche wird gestartet...')
    if (!searchQueries.trim() || !searchLocations.trim()) { toast.error('Bitte Branchen und Orte angeben'); return }
    setSearching(true)
    setSearchResult(null)
    try {
      const response = await fetch('/api/v1/opportunities/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: searchQueries,
          locations: searchLocations,
          radius: parseInt(searchRadius, 10),
          maxPerLocation: parseInt(searchMaxPerLocation, 10),
        }),
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        toast.error(errData?.error?.message || `Suche fehlgeschlagen (${response.status})`)
        return
      }
      const data = await response.json()
      if (data.success) {
        setSearchResult(data.data)
        const parts = [`${data.data.saved} neu`]
        if (data.data.enriched > 0) parts.push(`${data.data.enriched} angereichert`)
        if (data.data.duplicates > 0) parts.push(`${data.data.duplicates} unverändert`)
        toast.success(parts.join(', '))
        fetchOpportunities()
      } else {
        toast.error(data.error?.message || 'Suche fehlgeschlagen')
      }
    } catch (error) {
      logger.error('Search failed', error, { module: 'ChancenPage' })
      toast.error('Suche fehlgeschlagen: ' + (error instanceof Error ? error.message : 'Netzwerkfehler'))
    } finally {
      setSearching(false)
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/v1/opportunities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(`Status gesetzt`)
        fetchOpportunities()
      } else {
        toast.error(data.error?.message || 'Status-Update fehlgeschlagen')
      }
    } catch (error) {
      logger.error('Status update failed', error, { module: 'ChancenPage' })
      toast.error('Status-Update fehlgeschlagen')
    }
  }

  const handleConvert = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/v1/opportunities/${id}/convert`, { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        toast.success(`"${name}" wurde zu Firma + Lead konvertiert`)
        fetchOpportunities()
      } else {
        toast.error(data.error?.message || 'Konvertierung fehlgeschlagen')
      }
    } catch (error) {
      logger.error('Convert failed', error, { module: 'ChancenPage' })
      toast.error('Konvertierung fehlgeschlagen')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" wirklich löschen?`)) return
    try {
      const response = await fetch(`/api/v1/opportunities/${id}`, { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        toast.success(`"${name}" gelöscht`)
        fetchOpportunities()
      } else {
        toast.error(data.error?.message || 'Löschen fehlgeschlagen')
      }
    } catch (error) {
      logger.error('Delete failed', error, { module: 'ChancenPage' })
      toast.error('Löschen fehlgeschlagen')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chancen</h1>
          <p className="text-muted-foreground">
            Finden und verwalten Sie potenzielle Kunden via Google Maps
          </p>
        </div>
        <Dialog open={searchDialogOpen} onOpenChange={(open) => { setSearchDialogOpen(open); if (!open) setSearchResult(null) }}>
          <DialogTrigger asChild>
            <Button className="self-start sm:self-auto">
              <Telescope className="mr-2 h-4 w-4" />
              Neue Suche
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-w-[calc(100vw-2rem)]">
            <DialogHeader>
              <DialogTitle>Neue Chancen suchen</DialogTitle>
              <DialogDescription>
                Suchen Sie nach Unternehmen in Google Maps und speichern Sie die Ergebnisse als Chancen.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="search-queries">Branchen</Label>
                <Input id="search-queries" placeholder="z.B. Steuerberater, Rechtsanwalt" value={searchQueries} onChange={(e) => setSearchQueries(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="search-locations">Orte</Label>
                <Input id="search-locations" placeholder="z.B. Muenchen, Hamburg, Berlin" value={searchLocations} onChange={(e) => setSearchLocations(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Radius</Label>
                  <Select value={searchRadius} onValueChange={setSearchRadius}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 km</SelectItem>
                      <SelectItem value="10">10 km</SelectItem>
                      <SelectItem value="25">25 km</SelectItem>
                      <SelectItem value="50">50 km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Max. pro Ort</Label>
                  <Select value={searchMaxPerLocation} onValueChange={setSearchMaxPerLocation}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="40">40</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {searchResult && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <p className="font-medium">
                    {searchResult.saved} neu, {searchResult.enriched || 0} angereichert, {searchResult.duplicates} unveraendert
                  </p>
                  {searchResult.errors.length > 0 && (
                    <ul className="mt-2 text-destructive">
                      {searchResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={handleSearch}
                disabled={searching || !searchQueries.trim() || !searchLocations.trim()}
              >
                {searching ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Suche laeuft...</>
                ) : (
                  <><Search className="mr-2 h-4 w-4" />Suchen</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="flex-wrap h-auto">
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Table */}
      <ChancenTable
        opportunities={opportunities}
        loading={loading}
        search={search}
        setSearch={setSearch}
        total={total}
        page={page}
        totalPages={totalPages}
        setPage={setPage}
        onOpenDetail={openDetail}
        onStatusChange={handleStatusChange}
        onConvert={handleConvert}
        onDelete={handleDelete}
        onOpenCreate={() => setSearchDialogOpen(true)}
      />

      {/* Detail/Edit Dialog */}
      <ChancenDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        editOpp={editOpp}
        editForm={editForm}
        setEditForm={setEditForm}
        savingEdit={savingEdit}
        onSave={handleSaveEdit}
        onOpenChat={(opp) => {
          openChat({
            type: 'opportunity',
            title: opp.name,
            data: {
              name: opp.name,
              industry: opp.industry,
              city: opp.city,
              address: opp.address,
              phone: opp.phone,
              email: opp.email,
              website: opp.website,
              rating: opp.rating,
              status: opp.status,
              notes: opp.notes,
            },
          })
        }}
      />
    </div>
  )
}
