'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Telescope,
  Search,
  ExternalLink,
  Phone,
  Trash2,
  ArrowRightLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

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

const statusLabels: Record<string, string> = {
  new: 'Neu',
  contacted: 'Kontaktiert',
  qualified: 'Qualifiziert',
  rejected: 'Abgelehnt',
  converted: 'Konvertiert',
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-yellow-500',
  qualified: 'bg-green-500',
  rejected: 'bg-red-500',
  converted: 'bg-purple-500',
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
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const response = await fetch(`/api/v1/opportunities?${params}`)
      if (!response.ok) {
        // Table may not exist yet after deploy
        setOpportunities([])
        setTotal(0)
        setTotalPages(1)
        return
      }
      const data = await response.json()

      if (data.success) {
        setOpportunities(data.data || [])
        if (data.meta) {
          setTotalPages(data.meta.totalPages || 1)
          setTotal(data.meta.total || 0)
        }
      }
    } catch (error) {
      logger.error('Failed to fetch opportunities', error, { module: 'ChancenPage' })
      setOpportunities([])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  const handleSearch = async () => {
    toast.info('Suche wird gestartet...')

    if (!searchQueries.trim() || !searchLocations.trim()) {
      toast.error('Bitte Branchen und Orte angeben')
      return
    }

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
        toast.success(`Status auf "${statusLabels[newStatus]}" gesetzt`)
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
      const response = await fetch(`/api/v1/opportunities/${id}/convert`, {
        method: 'POST',
      })

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
    if (!confirm(`"${name}" wirklich loeschen?`)) return

    try {
      const response = await fetch(`/api/v1/opportunities/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`"${name}" geloescht`)
        fetchOpportunities()
      } else {
        toast.error(data.error?.message || 'Loeschen fehlgeschlagen')
      }
    } catch (error) {
      logger.error('Delete failed', error, { module: 'ChancenPage' })
      toast.error('Loeschen fehlgeschlagen')
    }
  }

  const renderRating = (rating: number | null, reviewCount: number | null) => {
    if (rating === null) return <span className="text-muted-foreground">-</span>
    return (
      <span className="whitespace-nowrap">
        {rating.toFixed(1)}{' '}
        <span className="text-yellow-500">&#9733;</span>
        {reviewCount !== null && (
          <span className="text-muted-foreground text-xs ml-1">({reviewCount})</span>
        )}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chancen</h1>
          <p className="text-muted-foreground">
            Finden und verwalten Sie potenzielle Kunden via Google Maps
          </p>
        </div>
        <Dialog open={searchDialogOpen} onOpenChange={(open) => { setSearchDialogOpen(open); if (!open) setSearchResult(null) }}>
          <DialogTrigger asChild>
            <Button>
              <Telescope className="mr-2 h-4 w-4" />
              Neue Suche
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Neue Chancen suchen</DialogTitle>
              <DialogDescription>
                Suchen Sie nach Unternehmen in Google Maps und speichern Sie die Ergebnisse als Chancen.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="search-queries">Branchen</Label>
                <Input
                  id="search-queries"
                  placeholder="z.B. Steuerberater, Rechtsanwalt"
                  value={searchQueries}
                  onChange={(e) => setSearchQueries(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="search-locations">Orte</Label>
                <Input
                  id="search-locations"
                  placeholder="z.B. Muenchen, Hamburg, Berlin"
                  value={searchLocations}
                  onChange={(e) => setSearchLocations(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Radius</Label>
                  <Select value={searchRadius} onValueChange={setSearchRadius}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                      {searchResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
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
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Suche laeuft...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Suchen
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search + Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Nach Name oder Stadt suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {total} Ergebnis{total !== 1 ? 'se' : ''}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="h-10 flex-[2] rounded bg-muted" />
                  <div className="h-10 flex-1 rounded bg-muted" />
                  <div className="h-10 flex-1 rounded bg-muted" />
                  <div className="h-10 w-20 rounded bg-muted" />
                  <div className="h-10 flex-1 rounded bg-muted" />
                  <div className="h-10 flex-1 rounded bg-muted" />
                  <div className="h-10 w-24 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Telescope className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Keine Chancen</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Starten Sie eine Suche, um potenzielle Kunden zu finden.
              </p>
              <Button className="mt-4" onClick={() => setSearchDialogOpen(true)}>
                <Telescope className="mr-2 h-4 w-4" />
                Neue Suche
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Branche</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Bewertung</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((opp) => (
                    <TableRow key={opp.id}>
                      <TableCell className="font-medium max-w-[200px] truncate cursor-pointer hover:text-primary" onClick={() => openDetail(opp)}>
                        {opp.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">
                        {opp.industry || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-[200px]">
                        <div>{opp.address || ''}</div>
                        <div>{[opp.postalCode, opp.city].filter(Boolean).join(' ') || '-'}</div>
                      </TableCell>
                      <TableCell>
                        {renderRating(opp.rating, opp.reviewCount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {opp.phone && (
                            <a href={`tel:${opp.phone}`} className="inline-flex items-center gap-1 text-xs hover:underline" title={opp.phone}>
                              <Phone className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[120px]">{opp.phone}</span>
                            </a>
                          )}
                          {opp.website && (
                            <a href={opp.website.startsWith('http') ? opp.website : `https://${opp.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[120px]">{opp.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                            </a>
                          )}
                          {!opp.phone && !opp.website && <span className="text-muted-foreground text-xs">-</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[opp.status]}>
                          {statusLabels[opp.status] || opp.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {opp.status !== 'converted' && (
                            <Select
                              value=""
                              onValueChange={(val) => handleStatusChange(opp.id, val)}
                            >
                              <SelectTrigger className="h-8 w-[130px] text-xs">
                                <SelectValue placeholder="Status..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="contacted">Kontaktiert</SelectItem>
                                <SelectItem value="qualified">Qualifiziert</SelectItem>
                                <SelectItem value="rejected">Abgelehnt</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {opp.status !== 'converted' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Zu Firma + Lead konvertieren"
                              onClick={() => handleConvert(opp.id, opp.name)}
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="Loeschen"
                            onClick={() => handleDelete(opp.id, opp.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Seite {page} von {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail/Edit Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chance bearbeiten</DialogTitle>
            <DialogDescription>
              Daten bearbeiten und speichern
            </DialogDescription>
          </DialogHeader>
          {editOpp && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-industry">Branche</Label>
                  <Input id="edit-industry" value={editForm.industry} onChange={(e) => setEditForm(f => ({ ...f, industry: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editForm.status} onValueChange={(val) => setEditForm(f => ({ ...f, status: val }))}>
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Neu</SelectItem>
                      <SelectItem value="contacted">Kontaktiert</SelectItem>
                      <SelectItem value="qualified">Qualifiziert</SelectItem>
                      <SelectItem value="rejected">Abgelehnt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3">Adresse</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="edit-address">Strasse</Label>
                    <Input id="edit-address" value={editForm.address} onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-postalCode">PLZ</Label>
                    <Input id="edit-postalCode" value={editForm.postalCode} onChange={(e) => setEditForm(f => ({ ...f, postalCode: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-city">Ort</Label>
                    <Input id="edit-city" value={editForm.city} onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-country">Land</Label>
                    <Input id="edit-country" value={editForm.country} onChange={(e) => setEditForm(f => ({ ...f, country: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3">Kontakt</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Telefon</Label>
                    <Input id="edit-phone" value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">E-Mail</Label>
                    <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="edit-website">Website</Label>
                    <Input id="edit-website" value={editForm.website} onChange={(e) => setEditForm(f => ({ ...f, website: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label htmlFor="edit-notes">Notizen</Label>
                <textarea id="edit-notes" value={editForm.notes} onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm resize-y" placeholder="Notizen..." />
              </div>

              {/* Metadata info */}
              {editOpp.rating !== null && (
                <div className="border-t pt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Bewertung: {editOpp.rating?.toFixed(1)} <span className="text-yellow-500">&#9733;</span> ({editOpp.reviewCount || 0})</span>
                  <span>Quelle: {editOpp.source || 'Google Maps'}</span>
                  <span>Erstellt: {new Date(editOpp.createdAt).toLocaleDateString('de-DE')}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
