'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Shield, Plus, Search, Loader2, Server, Building2, Globe, Monitor,
  Users, FolderOpen, Trash2, ArrowLeft, Edit,
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Company {
  id: string
  name: string
}

interface Asset {
  id: string
  name: string
  categoryType: string
  categoryName: string
  vertraulichkeit: string | null
  integritaet: string | null
  verfuegbarkeit: string | null
  status: string
  controlCount?: number
  description?: string | null
}

interface CategoryFlat {
  uuid: string
  name: string
  type: string
  category: string
  parentUuid: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_TYPES = [
  'IT-Systeme', 'Anwendungen', 'Netze', 'Standorte', 'Nutzende', 'Einkaeufe', 'Informationen',
] as const

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'IT-Systeme': Server,
  'Anwendungen': Monitor,
  'Netze': Globe,
  'Standorte': Building2,
  'Nutzende': Users,
  'Einkaeufe': FolderOpen,
  'Informationen': FolderOpen,
}

const SCHUTZBEDARF_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'hoch', label: 'Hoch' },
  { value: 'sehr_hoch', label: 'Sehr hoch' },
] as const

const SCHUTZBEDARF_COLORS: Record<string, string> = {
  normal: 'bg-green-100 text-green-700',
  hoch: 'bg-orange-100 text-orange-700',
  sehr_hoch: 'bg-red-100 text-red-700',
}

const SCHUTZBEDARF_LABELS: Record<string, string> = {
  normal: 'Normal',
  hoch: 'Hoch',
  sehr_hoch: 'Sehr hoch',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  planned: 'bg-blue-100 text-blue-700',
  decommissioned: 'bg-gray-100 text-gray-700',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktiv',
  planned: 'Geplant',
  decommissioned: 'Stillgelegt',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GrundschutzAssetsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const companyIdParam = searchParams.get('companyId')

  // State ----------------------------------------------------------------
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companyIdParam || '')
  const [assets, setAssets] = useState<Asset[]>([])
  const [categories, setCategories] = useState<CategoryFlat[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAssets, setLoadingAssets] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategoryType, setFilterCategoryType] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formName, setFormName] = useState('')
  const [formCategoryType, setFormCategoryType] = useState('')
  const [formCategoryName, setFormCategoryName] = useState('')
  const [formCategoryUuid, setFormCategoryUuid] = useState('')
  const [formVertraulichkeit, setFormVertraulichkeit] = useState('normal')
  const [formIntegritaet, setFormIntegritaet] = useState('normal')
  const [formVerfuegbarkeit, setFormVerfuegbarkeit] = useState('normal')
  const [formDescription, setFormDescription] = useState('')
  const [formNotes, setFormNotes] = useState('')

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Data fetching --------------------------------------------------------
  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/companies?limit=100')
      const data = await res.json()
      if (data.success) {
        setCompanies(data.data ?? [])
      }
    } catch (err) {
      logger.error('Error fetching companies', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/grundschutz/assets/categories')
      const data = await res.json()
      if (data.success) {
        setCategories(data.data?.flat ?? [])
      }
    } catch (err) {
      logger.error('Error fetching categories', err)
    }
  }, [])

  const fetchAssets = useCallback(async (companyId: string) => {
    if (!companyId) return
    setLoadingAssets(true)
    try {
      const params = new URLSearchParams({ companyId })
      if (filterCategoryType) params.set('categoryType', filterCategoryType)
      if (filterStatus) params.set('status', filterStatus)
      if (searchTerm) params.set('search', searchTerm)

      const res = await fetch(`/api/v1/grundschutz/assets?${params}`)
      const data = await res.json()
      if (data.success) {
        setAssets(data.data ?? [])
      }
    } catch (err) {
      logger.error('Error fetching assets', err)
    } finally {
      setLoadingAssets(false)
    }
  }, [filterCategoryType, filterStatus, searchTerm])

  // Effects --------------------------------------------------------------
  useEffect(() => {
    fetchCompanies()
    fetchCategories()
  }, [fetchCompanies, fetchCategories])

  useEffect(() => {
    if (selectedCompanyId) {
      fetchAssets(selectedCompanyId)
    } else {
      setAssets([])
    }
  }, [selectedCompanyId, fetchAssets])

  // Handlers -------------------------------------------------------------
  const handleCompanyChange = (value: string) => {
    setSelectedCompanyId(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set('companyId', value)
    router.replace(`?${params.toString()}`)
  }

  const filteredCategoryNames = useMemo(() => {
    if (!formCategoryType) return []
    return categories.filter(c => c.type === formCategoryType)
  }, [formCategoryType, categories])

  const resetForm = () => {
    setFormName('')
    setFormCategoryType('')
    setFormCategoryName('')
    setFormCategoryUuid('')
    setFormVertraulichkeit('normal')
    setFormIntegritaet('normal')
    setFormVerfuegbarkeit('normal')
    setFormDescription('')
    setFormNotes('')
  }

  const handleCreate = async () => {
    if (!formName.trim() || !formCategoryType || !formCategoryName || !selectedCompanyId) {
      toast.error('Bitte alle Pflichtfelder ausfuellen')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/v1/grundschutz/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          name: formName.trim(),
          categoryType: formCategoryType,
          categoryName: formCategoryName,
          categoryUuid: formCategoryUuid || undefined,
          vertraulichkeit: formVertraulichkeit,
          integritaet: formIntegritaet,
          verfuegbarkeit: formVerfuegbarkeit,
          description: formDescription.trim() || undefined,
          notes: formNotes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Asset erfolgreich erstellt')
        setDialogOpen(false)
        resetForm()
        fetchAssets(selectedCompanyId)
      } else {
        toast.error(data.message || 'Fehler beim Erstellen')
      }
    } catch (err) {
      logger.error('Error creating asset', err)
      toast.error('Fehler beim Erstellen des Assets')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/grundschutz/assets/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Asset geloescht')
        setDeleteTarget(null)
        fetchAssets(selectedCompanyId)
      } else {
        toast.error(data.message || 'Fehler beim Loeschen')
      }
    } catch (err) {
      logger.error('Error deleting asset', err)
      toast.error('Fehler beim Loeschen des Assets')
    } finally {
      setDeleting(false)
    }
  }

  const selectedCompany = companies.find(c => c.id === selectedCompanyId)

  // Schutzbedarf badge helper
  const SchutzBadge = ({ label, value }: { label: string; value: string | null }) => {
    const v = value || 'normal'
    return (
      <Badge variant="outline" className={`text-xs ${SCHUTZBEDARF_COLORS[v] ?? ''}`}>
        {label}: {SCHUTZBEDARF_LABELS[v] ?? v}
      </Badge>
    )
  }

  // Render ---------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/intern/cybersecurity/grundschutz">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Assets - Grundschutz++
          </h1>
          {selectedCompany && (
            <p className="text-muted-foreground text-sm mt-1">{selectedCompany.name}</p>
          )}
        </div>
        {selectedCompanyId && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Neues Asset
          </Button>
        )}
      </div>

      {/* Company selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Firma auswaehlen</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Firma waehlen..." />
            </SelectTrigger>
            <SelectContent>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Filter bar */}
      {selectedCompanyId && (
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Assets durchsuchen..."
              className="pl-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterCategoryType} onValueChange={v => setFilterCategoryType(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Kategorie-Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              {CATEGORY_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="planned">Geplant</SelectItem>
              <SelectItem value="decommissioned">Stillgelegt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Asset table */}
      {selectedCompanyId && (
        <Card>
          <CardContent className="p-0">
            {loadingAssets ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <Shield className="h-12 w-12 opacity-30" />
                <p>Noch keine Assets erfasst</p>
                <Button variant="outline" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Asset anlegen
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Schutzbedarf</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Controls</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map(asset => {
                    const Icon = CATEGORY_ICONS[asset.categoryType] ?? FolderOpen
                    return (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <Link
                            href={`/intern/cybersecurity/grundschutz/assets/${asset.id}`}
                            className="font-medium hover:underline text-primary"
                          >
                            {asset.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span>{asset.categoryName}</span>
                            <span className="text-muted-foreground">({asset.categoryType})</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <SchutzBadge label="V" value={asset.vertraulichkeit} />
                            <SchutzBadge label="I" value={asset.integritaet} />
                            <SchutzBadge label="A" value={asset.verfuegbarkeit} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_COLORS[asset.status] ?? ''}>
                            {STATUS_LABELS[asset.status] ?? asset.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {asset.controlCount ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Link href={`/intern/cybersecurity/grundschutz/assets/${asset.id}`}>
                              <Button variant="ghost" size="icon" title="Bearbeiten">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Loeschen"
                              onClick={() => setDeleteTarget(asset)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neues Asset anlegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Name *</label>
              <Input
                placeholder="z.B. Hauptserver, E-Mail-System..."
                value={formName}
                onChange={e => setFormName(e.target.value)}
              />
            </div>

            {/* Category Type */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Kategorie-Typ *</label>
              <Select
                value={formCategoryType}
                onValueChange={v => {
                  setFormCategoryType(v)
                  setFormCategoryName('')
                  setFormCategoryUuid('')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Typ waehlen..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Name */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Kategorie-Name *</label>
              <Select
                value={formCategoryUuid}
                onValueChange={v => {
                  const cat = filteredCategoryNames.find(c => c.uuid === v)
                  if (cat) {
                    setFormCategoryUuid(cat.uuid)
                    setFormCategoryName(cat.name)
                  }
                }}
                disabled={!formCategoryType}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formCategoryType ? 'Kategorie waehlen...' : 'Erst Typ waehlen'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategoryNames.map(c => (
                    <SelectItem key={c.uuid} value={c.uuid}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Schutzbedarf */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Schutzbedarf</label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Vertraulichkeit</label>
                  <Select value={formVertraulichkeit} onValueChange={setFormVertraulichkeit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHUTZBEDARF_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Integritaet</label>
                  <Select value={formIntegritaet} onValueChange={setFormIntegritaet}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHUTZBEDARF_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Verfuegbarkeit</label>
                  <Select value={formVerfuegbarkeit} onValueChange={setFormVerfuegbarkeit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHUTZBEDARF_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Beschreibung</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Optionale Beschreibung..."
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Notizen</label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Optionale Notizen..."
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Erstellen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Asset loeschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Soll das Asset <span className="font-medium text-foreground">{deleteTarget?.name}</span> wirklich
            geloescht werden? Diese Aktion kann nicht rueckgaengig gemacht werden.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Loeschen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
