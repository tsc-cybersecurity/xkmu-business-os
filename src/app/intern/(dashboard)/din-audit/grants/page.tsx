'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { ExternalLink, Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { logger } from '@/lib/utils/logger'

interface Grant {
  id: string
  name: string
  provider: string
  purpose: string | null
  url: string | null
  region: string
  minEmployees: number | null
  maxEmployees: number | null
}

interface GrantFormData {
  name: string
  provider: string
  purpose: string
  url: string
  region: string
  minEmployees: string
  maxEmployees: string
}

const emptyForm: GrantFormData = {
  name: '',
  provider: '',
  purpose: '',
  url: '',
  region: '',
  minEmployees: '',
  maxEmployees: '',
}

export default function GrantsPage() {
  const [grants, setGrants] = useState<Grant[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [selectedRegion, setSelectedRegion] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [showDialog, setShowDialog] = useState(false)
  const [editingGrant, setEditingGrant] = useState<Grant | null>(null)
  const [formData, setFormData] = useState<GrantFormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchGrants = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedRegion && selectedRegion !== 'all') {
        params.set('region', selectedRegion)
      }
      const response = await fetch(`/api/v1/din/grants?${params}`)
      const data = await response.json()
      if (data.success) {
        setGrants(data.data.grants)
        if (regions.length === 0) {
          setRegions(data.data.regions)
        }
      }
    } catch (error) {
      logger.error('Failed to fetch grants', error, { module: 'DinAuditGrantsPage' })
    } finally {
      setLoading(false)
    }
  }, [selectedRegion, regions.length])

  useEffect(() => {
    fetchGrants()
  }, [fetchGrants])

  const formatEmployeeRange = (min: number | null, max: number | null) => {
    if (min && max) return `${min} - ${max} Mitarbeiter`
    if (max) return `bis ${max} Mitarbeiter`
    if (min) return `ab ${min} Mitarbeiter`
    return 'Keine Einschraenkung'
  }

  const openCreateDialog = () => {
    setEditingGrant(null)
    setFormData(emptyForm)
    setShowDialog(true)
  }

  const openEditDialog = (grant: Grant) => {
    setEditingGrant(grant)
    setFormData({
      name: grant.name,
      provider: grant.provider,
      purpose: grant.purpose || '',
      url: grant.url || '',
      region: grant.region,
      minEmployees: grant.minEmployees?.toString() || '',
      maxEmployees: grant.maxEmployees?.toString() || '',
    })
    setShowDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.provider.trim() || !formData.region.trim()) {
      toast.error('Name, Anbieter und Region sind Pflichtfelder')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formData.name.trim(),
        provider: formData.provider.trim(),
        purpose: formData.purpose.trim() || null,
        url: formData.url.trim() || null,
        region: formData.region.trim(),
        minEmployees: formData.minEmployees ? parseInt(formData.minEmployees) : null,
        maxEmployees: formData.maxEmployees ? parseInt(formData.maxEmployees) : null,
      }

      const url = editingGrant
        ? `/api/v1/din/grants/${editingGrant.id}`
        : '/api/v1/din/grants'

      const response = await fetch(url, {
        method: editingGrant ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error?.message || 'Fehler beim Speichern')
      }

      toast.success(editingGrant ? 'Foerdermittel aktualisiert' : 'Foerdermittel erstellt')
      setShowDialog(false)
      setEditingGrant(null)
      await fetchGrants()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/v1/din/grants/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error('Fehler beim Loeschen')
      }
      toast.success('Foerdermittel geloescht')
      setDeletingId(null)
      await fetchGrants()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Loeschen')
    } finally {
      setDeleting(false)
    }
  }

  const updateField = (field: keyof GrantFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Foerdermittel</h1>
          <p className="text-muted-foreground">
            Bundes- und Landesfoerderprogramme fuer IT-Sicherheit und Digitalisierung
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Neues Foerdermittel
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Region:</label>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Alle Regionen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Regionen</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">
              {grants.length} Programme gefunden
            </span>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : grants.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">Keine Foerderprogramme gefunden.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {grants.map((grant) => (
            <Card key={grant.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{grant.name}</CardTitle>
                    <CardDescription>{grant.provider}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline">{grant.region}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(grant)}
                      title="Bearbeiten"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingId(grant.id)}
                      title="Loeschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {grant.url && (
                      <a href={grant.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {grant.purpose && (
                  <p className="text-sm mb-2">{grant.purpose}</p>
                )}
                <div className="text-xs text-muted-foreground">
                  {formatEmployeeRange(grant.minEmployees, grant.maxEmployees)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingGrant ? 'Foerdermittel bearbeiten' : 'Neues Foerdermittel'}
            </DialogTitle>
            <DialogDescription>
              {editingGrant
                ? 'Bearbeiten Sie die Details des Foerderprogramms'
                : 'Erfassen Sie ein neues Foerderprogramm'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="grant-name">Name *</Label>
              <Input
                id="grant-name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="z.B. go-digital"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grant-provider">Anbieter *</Label>
              <Input
                id="grant-provider"
                value={formData.provider}
                onChange={(e) => updateField('provider', e.target.value)}
                placeholder="z.B. Bundesministerium fuer Wirtschaft"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grant-region">Region *</Label>
              <Input
                id="grant-region"
                value={formData.region}
                onChange={(e) => updateField('region', e.target.value)}
                placeholder="z.B. Bundesweit, Bayern, NRW"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grant-purpose">Zweck / Beschreibung</Label>
              <Textarea
                id="grant-purpose"
                value={formData.purpose}
                onChange={(e) => updateField('purpose', e.target.value)}
                placeholder="Beschreibung des Foerderprogramms..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grant-url">URL</Label>
              <Input
                id="grant-url"
                type="url"
                value={formData.url}
                onChange={(e) => updateField('url', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grant-min">Min. Mitarbeiter</Label>
                <Input
                  id="grant-min"
                  type="number"
                  min="0"
                  value={formData.minEmployees}
                  onChange={(e) => updateField('minEmployees', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grant-max">Max. Mitarbeiter</Label>
                <Input
                  id="grant-max"
                  type="number"
                  min="0"
                  value={formData.maxEmployees}
                  onChange={(e) => updateField('maxEmployees', e.target.value)}
                  placeholder="250"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={saving || !formData.name.trim() || !formData.provider.trim() || !formData.region.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingGrant ? 'Speichern' : 'Erstellen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Foerdermittel loeschen</DialogTitle>
            <DialogDescription>
              Moechten Sie dieses Foerderprogramm wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)} disabled={deleting}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Loeschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
