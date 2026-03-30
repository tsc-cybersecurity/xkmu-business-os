'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Shield, Loader2, ArrowLeft, Save, ArrowRight, ArrowLeftIcon,
  Plus, Pencil, Server, Monitor, Globe, Building2, Users, FolderOpen, Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssetRelation {
  id: string
  direction: 'outgoing' | 'incoming'
  relationType: string
  otherAssetId: string
  otherAssetName: string | null
  otherAssetCategory: string | null
  otherAssetCategoryName: string | null
  notes: string | null
}

interface ControlMapping {
  id: string
  controlId: string
  applicability: string
  justification: string | null
  implementationStatus: string
  implementationNotes: string | null
}

interface AssetDetail {
  id: string
  name: string
  description: string | null
  categoryType: string
  categoryName: string
  categoryUuid: string | null
  companyId: string
  companyName: string | null
  ownerName: string | null
  vertraulichkeit: string
  integritaet: string
  verfuegbarkeit: string
  schutzbedarfBegruendung: string | null
  status: string
  location: string | null
  notes: string | null
  tags: string[]
  relations: AssetRelation[]
  controlMappings: ControlMapping[]
}

interface CatalogGroup {
  id: string
  title: string
  controlCount?: number
}

interface CatalogControl {
  id: string
  controlId: string
  title: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

const STATUS_OPTIONS = [
  { value: 'active', label: 'Aktiv' },
  { value: 'planned', label: 'Geplant' },
  { value: 'decommissioned', label: 'Stillgelegt' },
] as const

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

const RELATION_TYPE_LABELS: Record<string, string> = {
  supports: 'Unterstuetzt',
  runs_on: 'Laeuft auf',
  connected_to: 'Verbunden mit',
  housed_in: 'Untergebracht in',
  uses: 'Nutzt',
  managed_by: 'Verwaltet von',
}

const APPLICABILITY_OPTIONS = [
  { value: 'applicable', label: 'Anwendbar' },
  { value: 'not_applicable', label: 'Nicht anwendbar' },
] as const

const APPLICABILITY_COLORS: Record<string, string> = {
  applicable: 'bg-green-100 text-green-700',
  not_applicable: 'bg-gray-100 text-gray-500',
}

const IMPL_STATUS_OPTIONS = [
  { value: 'offen', label: 'Offen' },
  { value: 'geplant', label: 'Geplant' },
  { value: 'teilweise', label: 'Teilweise' },
  { value: 'umgesetzt', label: 'Umgesetzt' },
  { value: 'nicht_umgesetzt', label: 'Nicht umgesetzt' },
] as const

const IMPL_STATUS_COLORS: Record<string, string> = {
  offen: 'bg-gray-100 text-gray-600',
  geplant: 'bg-blue-100 text-blue-700',
  teilweise: 'bg-orange-100 text-orange-700',
  umgesetzt: 'bg-green-100 text-green-700',
  nicht_umgesetzt: 'bg-red-100 text-red-700',
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'IT-Systeme': Server,
  'Anwendungen': Monitor,
  'Netze': Globe,
  'Standorte': Building2,
  'Nutzende': Users,
  'Einkaeufe': FolderOpen,
  'Informationen': FolderOpen,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GrundschutzAssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  // Asset data
  const [asset, setAsset] = useState<AssetDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editable fields
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formStatus, setFormStatus] = useState('active')
  const [formLocation, setFormLocation] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formVertraulichkeit, setFormVertraulichkeit] = useState('normal')
  const [formIntegritaet, setFormIntegritaet] = useState('normal')
  const [formVerfuegbarkeit, setFormVerfuegbarkeit] = useState('normal')
  const [formBegruendung, setFormBegruendung] = useState('')

  // Control dialog
  const [controlDialogOpen, setControlDialogOpen] = useState(false)
  const [editingControl, setEditingControl] = useState<ControlMapping | null>(null)
  const [ctrlGroups, setCtrlGroups] = useState<CatalogGroup[]>([])
  const [ctrlGroupControls, setCtrlGroupControls] = useState<CatalogControl[]>([])
  const [ctrlSelectedGroup, setCtrlSelectedGroup] = useState('')
  const [ctrlSelectedControl, setCtrlSelectedControl] = useState('')
  const [ctrlApplicability, setCtrlApplicability] = useState('applicable')
  const [ctrlImplStatus, setCtrlImplStatus] = useState('offen')
  const [ctrlJustification, setCtrlJustification] = useState('')
  const [ctrlImplNotes, setCtrlImplNotes] = useState('')
  const [ctrlSaving, setCtrlSaving] = useState(false)
  const [ctrlLoadingControls, setCtrlLoadingControls] = useState(false)

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchAsset = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/grundschutz/assets/${id}`)
      const data = await res.json()
      if (data.success && data.data) {
        const a = data.data as AssetDetail
        setAsset(a)
        setFormName(a.name)
        setFormDescription(a.description || '')
        setFormStatus(a.status)
        setFormLocation(a.location || '')
        setFormNotes(a.notes || '')
        setFormVertraulichkeit(a.vertraulichkeit || 'normal')
        setFormIntegritaet(a.integritaet || 'normal')
        setFormVerfuegbarkeit(a.verfuegbarkeit || 'normal')
        setFormBegruendung(a.schutzbedarfBegruendung || '')
      } else {
        toast.error('Asset nicht gefunden')
        router.push('/intern/cybersecurity/grundschutz/assets')
      }
    } catch {
      toast.error('Fehler beim Laden des Assets')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/grundschutz/groups')
      const data = await res.json()
      if (data.success) {
        setCtrlGroups(data.data ?? [])
      }
    } catch { /* ignore */ }
  }, [])

  const fetchGroupControls = useCallback(async (groupId: string) => {
    if (!groupId) { setCtrlGroupControls([]); return }
    setCtrlLoadingControls(true)
    try {
      const res = await fetch(`/api/v1/grundschutz/controls?groupId=${groupId}`)
      const data = await res.json()
      if (data.success) {
        setCtrlGroupControls(data.data ?? [])
      }
    } catch { /* ignore */ }
    finally { setCtrlLoadingControls(false) }
  }, [])

  useEffect(() => { fetchAsset() }, [fetchAsset])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Name darf nicht leer sein')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/grundschutz/assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          status: formStatus,
          location: formLocation.trim() || null,
          notes: formNotes.trim() || null,
          vertraulichkeit: formVertraulichkeit,
          integritaet: formIntegritaet,
          verfuegbarkeit: formVerfuegbarkeit,
          schutzbedarfBegruendung: formBegruendung.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Asset gespeichert')
        // Refresh to get updated data
        fetchAsset()
      } else {
        toast.error(data.message || 'Fehler beim Speichern')
      }
    } catch {
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const openControlDialog = (mapping?: ControlMapping) => {
    if (mapping) {
      setEditingControl(mapping)
      setCtrlSelectedControl(mapping.controlId)
      setCtrlApplicability(mapping.applicability)
      setCtrlImplStatus(mapping.implementationStatus)
      setCtrlJustification(mapping.justification || '')
      setCtrlImplNotes(mapping.implementationNotes || '')
      // We don't know the group for an existing mapping, so leave it empty
      setCtrlSelectedGroup('')
      setCtrlGroupControls([])
    } else {
      setEditingControl(null)
      setCtrlSelectedGroup('')
      setCtrlSelectedControl('')
      setCtrlApplicability('applicable')
      setCtrlImplStatus('offen')
      setCtrlJustification('')
      setCtrlImplNotes('')
      setCtrlGroupControls([])
    }
    if (ctrlGroups.length === 0) fetchGroups()
    setControlDialogOpen(true)
  }

  const handleSaveControl = async () => {
    if (!ctrlSelectedControl) {
      toast.error('Bitte ein Control auswaehlen')
      return
    }
    setCtrlSaving(true)
    try {
      const res = await fetch(`/api/v1/grundschutz/assets/${id}/controls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          controlId: ctrlSelectedControl,
          applicability: ctrlApplicability,
          implementationStatus: ctrlImplStatus,
          justification: ctrlJustification.trim() || undefined,
          implementationNotes: ctrlImplNotes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(editingControl ? 'Control aktualisiert' : 'Control zugeordnet')
        setControlDialogOpen(false)
        fetchAsset()
      } else {
        toast.error(data.message || 'Fehler beim Speichern')
      }
    } catch {
      toast.error('Fehler beim Speichern des Controls')
    } finally {
      setCtrlSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const SchutzBadge = ({ label, value }: { label: string; value: string | null }) => {
    const v = value || 'normal'
    return (
      <Badge variant="outline" className={cn('text-xs', SCHUTZBEDARF_COLORS[v])}>
        {label}: {SCHUTZBEDARF_LABELS[v] ?? v}
      </Badge>
    )
  }

  const highestSchutzbedarf = useMemo(() => {
    const order = ['normal', 'hoch', 'sehr_hoch']
    const vals = [formVertraulichkeit, formIntegritaet, formVerfuegbarkeit]
    let max = 0
    for (const v of vals) {
      const idx = order.indexOf(v)
      if (idx > max) max = idx
    }
    return order[max]
  }, [formVertraulichkeit, formIntegritaet, formVerfuegbarkeit])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!asset) return null

  const CategoryIcon = CATEGORY_ICONS[asset.categoryType] ?? FolderOpen
  const backUrl = `/intern/cybersecurity/grundschutz/assets?companyId=${asset.companyId}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href={backUrl}>
          <Button variant="ghost" size="icon" className="mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 shrink-0" />
            <span className="truncate">{asset.name}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
            <CategoryIcon className="h-4 w-4" />
            <span>{asset.companyName}</span>
            <span className="text-muted-foreground/50">|</span>
            <span>{asset.categoryName} ({asset.categoryType})</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            <SchutzBadge label="V" value={formVertraulichkeit} />
            <SchutzBadge label="I" value={formIntegritaet} />
            <SchutzBadge label="A" value={formVerfuegbarkeit} />
            <Badge variant="outline" className={cn('text-xs ml-2', SCHUTZBEDARF_COLORS[highestSchutzbedarf])}>
              Gesamt: {SCHUTZBEDARF_LABELS[highestSchutzbedarf]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stammdaten">
        <TabsList>
          <TabsTrigger value="stammdaten">Stammdaten & Schutzbedarf</TabsTrigger>
          <TabsTrigger value="beziehungen">
            Beziehungen ({asset.relations?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="controls">
            Controls ({asset.controlMappings?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* Tab 1: Stammdaten & Schutzbedarf                                 */}
        {/* ================================================================ */}
        <TabsContent value="stammdaten" className="space-y-6 mt-4">
          {/* Stammdaten card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stammdaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Name *</label>
                  <Input value={formName} onChange={e => setFormName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Kategorie</label>
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50 text-sm">
                    <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                    {asset.categoryName} ({asset.categoryType})
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Standort</label>
                  <Input
                    placeholder="z.B. Serverraum, Buero Berlin..."
                    value={formLocation}
                    onChange={e => setFormLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Beschreibung</label>
                <Textarea
                  placeholder="Optionale Beschreibung des Assets..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Notizen</label>
                <Textarea
                  placeholder="Interne Notizen..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Schutzbedarf card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schutzbedarf</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Vertraulichkeit</label>
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
                  <Badge variant="outline" className={cn('text-xs mt-1', SCHUTZBEDARF_COLORS[formVertraulichkeit])}>
                    {SCHUTZBEDARF_LABELS[formVertraulichkeit]}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Integritaet</label>
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
                  <Badge variant="outline" className={cn('text-xs mt-1', SCHUTZBEDARF_COLORS[formIntegritaet])}>
                    {SCHUTZBEDARF_LABELS[formIntegritaet]}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Verfuegbarkeit</label>
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
                  <Badge variant="outline" className={cn('text-xs mt-1', SCHUTZBEDARF_COLORS[formVerfuegbarkeit])}>
                    {SCHUTZBEDARF_LABELS[formVerfuegbarkeit]}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Begruendung</label>
                <Textarea
                  placeholder="Begruendung fuer die Schutzbedarfseinstufung..."
                  value={formBegruendung}
                  onChange={e => setFormBegruendung(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Speichern
            </Button>
          </div>
        </TabsContent>

        {/* ================================================================ */}
        {/* Tab 2: Beziehungen                                               */}
        {/* ================================================================ */}
        <TabsContent value="beziehungen" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Beziehungen zu anderen Assets</CardTitle>
            </CardHeader>
            <CardContent>
              {asset.relations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                  <Shield className="h-10 w-10 opacity-30" />
                  <p className="text-sm">Keine Beziehungen vorhanden</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Richtung</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Beziehungstyp</TableHead>
                      <TableHead>Notizen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {asset.relations.map(rel => {
                      const RelIcon = rel.otherAssetCategory
                        ? CATEGORY_ICONS[rel.otherAssetCategory] ?? FolderOpen
                        : FolderOpen
                      return (
                        <TableRow key={rel.id}>
                          <TableCell>
                            {rel.direction === 'outgoing' ? (
                              <ArrowRight className="h-4 w-4 text-blue-500" />
                            ) : (
                              <ArrowLeftIcon className="h-4 w-4 text-orange-500" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link
                              href={`/intern/cybersecurity/grundschutz/assets/${rel.otherAssetId}`}
                              className="hover:underline text-primary"
                            >
                              {rel.otherAssetName || rel.otherAssetId}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              <RelIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{rel.otherAssetCategoryName || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {RELATION_TYPE_LABELS[rel.relationType] ?? rel.relationType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {rel.notes || '-'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}

              <div className="flex items-center gap-2 mt-4 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
                <Info className="h-4 w-4 shrink-0" />
                <span>Beziehungen werden in einer kuenftigen Version bearbeitbar.</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* Tab 3: Controls                                                  */}
        {/* ================================================================ */}
        <TabsContent value="controls" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Zugeordnete Controls</CardTitle>
              <Button size="sm" onClick={() => openControlDialog()}>
                <Plus className="h-4 w-4 mr-1" /> Control zuordnen
              </Button>
            </CardHeader>
            <CardContent>
              {asset.controlMappings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                  <Shield className="h-10 w-10 opacity-30" />
                  <p className="text-sm">Noch keine Controls zugeordnet</p>
                  <Button variant="outline" size="sm" onClick={() => openControlDialog()}>
                    <Plus className="h-4 w-4 mr-1" /> Control zuordnen
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Control-ID</TableHead>
                      <TableHead>Anwendbarkeit</TableHead>
                      <TableHead>Umsetzungsstatus</TableHead>
                      <TableHead>Notizen</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {asset.controlMappings.map(cm => (
                      <TableRow key={cm.id}>
                        <TableCell className="font-mono text-sm font-medium">
                          {cm.controlId}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', APPLICABILITY_COLORS[cm.applicability])}>
                            {cm.applicability === 'applicable' ? 'Anwendbar' : 'Nicht anwendbar'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', IMPL_STATUS_COLORS[cm.implementationStatus])}>
                            {IMPL_STATUS_OPTIONS.find(o => o.value === cm.implementationStatus)?.label ?? cm.implementationStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                          {cm.implementationNotes || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Bearbeiten"
                            onClick={() => openControlDialog(cm)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ================================================================== */}
      {/* Control Dialog                                                      */}
      {/* ================================================================== */}
      <Dialog open={controlDialogOpen} onOpenChange={setControlDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingControl ? 'Control bearbeiten' : 'Control zuordnen'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* If editing, show current control ID as read-only */}
            {editingControl ? (
              <div className="space-y-1">
                <label className="text-sm font-medium">Control-ID</label>
                <div className="h-10 px-3 flex items-center rounded-md border bg-muted/50 text-sm font-mono">
                  {editingControl.controlId}
                </div>
              </div>
            ) : (
              <>
                {/* Group selector */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Gruppe</label>
                  <Select
                    value={ctrlSelectedGroup}
                    onValueChange={v => {
                      setCtrlSelectedGroup(v)
                      setCtrlSelectedControl('')
                      fetchGroupControls(v)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Gruppe waehlen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ctrlGroups.map(g => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.title} {g.controlCount != null ? `(${g.controlCount})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Control selector */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Control *</label>
                  <Select
                    value={ctrlSelectedControl}
                    onValueChange={setCtrlSelectedControl}
                    disabled={!ctrlSelectedGroup || ctrlLoadingControls}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        ctrlLoadingControls ? 'Lade...' :
                        !ctrlSelectedGroup ? 'Erst Gruppe waehlen' :
                        'Control waehlen...'
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {ctrlGroupControls.map(c => (
                        <SelectItem key={c.id} value={c.controlId}>
                          {c.controlId} - {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Applicability */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Anwendbarkeit</label>
              <Select value={ctrlApplicability} onValueChange={setCtrlApplicability}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLICABILITY_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Implementation status */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Umsetzungsstatus</label>
              <Select value={ctrlImplStatus} onValueChange={setCtrlImplStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPL_STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Justification */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Begruendung</label>
              <Textarea
                placeholder="Begruendung fuer Anwendbarkeit..."
                value={ctrlJustification}
                onChange={e => setCtrlJustification(e.target.value)}
                rows={2}
              />
            </div>

            {/* Implementation notes */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Umsetzungsnotizen</label>
              <Textarea
                placeholder="Details zur Umsetzung..."
                value={ctrlImplNotes}
                onChange={e => setCtrlImplNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setControlDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSaveControl} disabled={ctrlSaving}>
                {ctrlSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingControl ? 'Aktualisieren' : 'Zuordnen'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
