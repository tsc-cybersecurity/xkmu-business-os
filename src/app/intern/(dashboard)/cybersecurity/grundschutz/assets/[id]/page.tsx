'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Shield, Loader2, ArrowLeft,
  Server, Monitor, Globe, Building2, Users, FolderOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { AssetStammdatenTab } from './_components/asset-stammdaten-tab'
import { AssetBeziehungenTab } from './_components/asset-beziehungen-tab'
import { AssetControlsTab } from './_components/asset-controls-tab'
import { AssetControlDialog } from './_components/asset-control-dialog'
import { SchutzBadge, SCHUTZBEDARF_COLORS, SCHUTZBEDARF_LABELS } from './_components/asset-schutzbadge'

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

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'IT-Systeme': Server,
  'Anwendungen': Monitor,
  'Netze': Globe,
  'Standorte': Building2,
  'Nutzende': Users,
  'Einkaeufe': FolderOpen,
  'Informationen': FolderOpen,
}

export default function GrundschutzAssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [asset, setAsset] = useState<AssetDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formStatus, setFormStatus] = useState('active')
  const [formLocation, setFormLocation] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formVertraulichkeit, setFormVertraulichkeit] = useState('normal')
  const [formIntegritaet, setFormIntegritaet] = useState('normal')
  const [formVerfuegbarkeit, setFormVerfuegbarkeit] = useState('normal')
  const [formBegruendung, setFormBegruendung] = useState('')

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
      if (data.success) setCtrlGroups(data.data ?? [])
    } catch { /* ignore */ }
  }, [])

  const fetchGroupControls = useCallback(async (groupId: string) => {
    if (!groupId) { setCtrlGroupControls([]); return }
    setCtrlLoadingControls(true)
    try {
      const res = await fetch(`/api/v1/grundschutz/controls?groupId=${groupId}`)
      const data = await res.json()
      if (data.success) setCtrlGroupControls(data.data ?? [])
    } catch { /* ignore */ }
    finally { setCtrlLoadingControls(false) }
  }, [])

  useEffect(() => { fetchAsset() }, [fetchAsset])

  const handleSave = async () => {
    if (!formName.trim()) { toast.error('Name darf nicht leer sein'); return }
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
    if (!ctrlSelectedControl) { toast.error('Bitte ein Control auswaehlen'); return }
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

        <TabsContent value="stammdaten" className="space-y-6 mt-4">
          <AssetStammdatenTab
            asset={asset}
            formName={formName}
            setFormName={setFormName}
            formDescription={formDescription}
            setFormDescription={setFormDescription}
            formStatus={formStatus}
            setFormStatus={setFormStatus}
            formLocation={formLocation}
            setFormLocation={setFormLocation}
            formNotes={formNotes}
            setFormNotes={setFormNotes}
            formVertraulichkeit={formVertraulichkeit}
            setFormVertraulichkeit={setFormVertraulichkeit}
            formIntegritaet={formIntegritaet}
            setFormIntegritaet={setFormIntegritaet}
            formVerfuegbarkeit={formVerfuegbarkeit}
            setFormVerfuegbarkeit={setFormVerfuegbarkeit}
            formBegruendung={formBegruendung}
            setFormBegruendung={setFormBegruendung}
            saving={saving}
            onSave={handleSave}
            CategoryIcon={CategoryIcon}
          />
        </TabsContent>

        <TabsContent value="beziehungen" className="space-y-4 mt-4">
          <AssetBeziehungenTab relations={asset.relations} />
        </TabsContent>

        <TabsContent value="controls" className="space-y-4 mt-4">
          <AssetControlsTab
            controlMappings={asset.controlMappings}
            onOpenControlDialog={openControlDialog}
          />
        </TabsContent>
      </Tabs>

      <AssetControlDialog
        open={controlDialogOpen}
        onOpenChange={setControlDialogOpen}
        editingControl={editingControl}
        ctrlGroups={ctrlGroups}
        ctrlGroupControls={ctrlGroupControls}
        ctrlSelectedGroup={ctrlSelectedGroup}
        setCtrlSelectedGroup={setCtrlSelectedGroup}
        ctrlSelectedControl={ctrlSelectedControl}
        setCtrlSelectedControl={setCtrlSelectedControl}
        ctrlApplicability={ctrlApplicability}
        setCtrlApplicability={setCtrlApplicability}
        ctrlImplStatus={ctrlImplStatus}
        setCtrlImplStatus={setCtrlImplStatus}
        ctrlJustification={ctrlJustification}
        setCtrlJustification={setCtrlJustification}
        ctrlImplNotes={ctrlImplNotes}
        setCtrlImplNotes={setCtrlImplNotes}
        ctrlSaving={ctrlSaving}
        ctrlLoadingControls={ctrlLoadingControls}
        onFetchGroupControls={fetchGroupControls}
        onSave={handleSaveControl}
      />
    </div>
  )
}
