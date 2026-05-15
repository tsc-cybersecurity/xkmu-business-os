'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2, Pencil, Trash2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface PromoSlot {
  id: string
  slug: string
  name: string
  description: string | null
  blockType: string
  content: Record<string, unknown>
  settings: Record<string, unknown>
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}

interface BlockType {
  type: string
  name: string
}

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,118}[a-z0-9]$|^[a-z0-9]$/

const EMPTY_FORM = {
  id: null as string | null,
  slug: '',
  name: '',
  description: '',
  blockType: 'cta',
  contentText: '{}',
  settingsText: '{}',
  isActive: true,
}

type FormState = typeof EMPTY_FORM

export default function CmsPromosPage() {
  const [slots, setSlots] = useState<PromoSlot[]>([])
  const [blockTypes, setBlockTypes] = useState<BlockType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/cms/promos')
      const data = await res.json()
      if (data.success) setSlots(data.data)
    } catch (error) {
      logger.error('Failed to fetch promo slots', error, { module: 'CmsPromos' })
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBlockTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/cms/block-types')
      const data = await res.json()
      if (data.success) {
        setBlockTypes(
          (data.data as Array<{ type: string; name: string }>).map((b) => ({
            type: b.type,
            name: b.name,
          }))
        )
      }
    } catch (error) {
      logger.error('Failed to fetch block types', error, { module: 'CmsPromos' })
    }
  }, [])

  useEffect(() => {
    fetchSlots()
    fetchBlockTypes()
  }, [fetchSlots, fetchBlockTypes])

  const openNew = () => {
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (slot: PromoSlot) => {
    setForm({
      id: slot.id,
      slug: slot.slug,
      name: slot.name,
      description: slot.description ?? '',
      blockType: slot.blockType,
      contentText: JSON.stringify(slot.content ?? {}, null, 2),
      settingsText: JSON.stringify(slot.settings ?? {}, null, 2),
      isActive: slot.isActive,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!SLUG_REGEX.test(form.slug)) {
      toast.error('Slug darf nur a-z, 0-9 und Bindestriche enthalten.')
      return
    }
    if (!form.name.trim()) {
      toast.error('Name ist erforderlich.')
      return
    }

    let content: unknown
    let settings: unknown
    try {
      content = JSON.parse(form.contentText)
      settings = JSON.parse(form.settingsText)
    } catch {
      toast.error('Inhalt oder Settings ist kein gueltiges JSON.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        slug: form.slug,
        name: form.name.trim(),
        description: form.description.trim() || null,
        blockType: form.blockType,
        content,
        settings,
        isActive: form.isActive,
      }
      const url = form.id ? `/api/v1/cms/promos/${form.id}` : '/api/v1/cms/promos'
      const method = form.id ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error?.message ?? 'Speichern fehlgeschlagen')
        return
      }
      toast.success(form.id ? 'Promo aktualisiert' : 'Promo angelegt')
      setDialogOpen(false)
      fetchSlots()
    } catch (error) {
      logger.error('Failed to save promo', error, { module: 'CmsPromos' })
      toast.error('Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (slot: PromoSlot) => {
    if (!confirm(`Promo "${slot.name}" wirklich loeschen?`)) return
    try {
      await fetch(`/api/v1/cms/promos/${slot.id}`, { method: 'DELETE' })
      fetchSlots()
    } catch (error) {
      logger.error('Failed to delete promo', error, { module: 'CmsPromos' })
    }
  }

  const copyPlaceholder = async (slug: string) => {
    const placeholder = `{promo:${slug}}`
    try {
      await navigator.clipboard.writeText(placeholder)
      setCopiedSlug(slug)
      toast.success(`Platzhalter kopiert: ${placeholder}`)
      setTimeout(() => setCopiedSlug((s) => (s === slug ? null : s)), 1500)
    } catch {
      toast.error('Konnte nicht in Zwischenablage kopieren.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Promo-Slots</h1>
          <p className="text-sm text-muted-foreground">
            Wiederverwendbare CMS-Bloecke, im Blog-Markdown als{' '}
            <code className="px-1 py-0.5 bg-muted rounded text-xs">{'{promo:slug}'}</code>{' '}
            einbettbar.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Neuer Promo-Slot
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slug / Platzhalter</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Block-Typ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[140px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : slots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Noch keine Promo-Slots angelegt.
                </TableCell>
              </TableRow>
            ) : (
              slots.map((slot) => (
                <TableRow key={slot.id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => copyPlaceholder(slot.slug)}
                      className="flex items-center gap-1.5 font-mono text-xs hover:text-primary"
                      title="Platzhalter in Zwischenablage kopieren"
                    >
                      <code>{`{promo:${slot.slug}}`}</code>
                      {copiedSlug === slot.slug ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 opacity-50" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{slot.name}</div>
                    {slot.description && (
                      <div className="text-xs text-muted-foreground truncate max-w-md">
                        {slot.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{slot.blockType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={slot.isActive ? 'default' : 'secondary'}>
                      {slot.isActive ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(slot)} title="Bearbeiten">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(slot)}
                        title="Loeschen"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Promo-Slot bearbeiten' : 'Neuer Promo-Slot'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                  placeholder="kontakt-cta"
                />
                <p className="text-xs text-muted-foreground">
                  Wird als <code className="text-[10px]">{`{promo:${form.slug || 'slug'}}`}</code> eingebunden.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Name (intern)</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Kontakt-CTA"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Beschreibung (optional)</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Wo wird der Slot eingesetzt?"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="blockType">Block-Typ</Label>
              <Select
                value={form.blockType}
                onValueChange={(v) => setForm({ ...form, blockType: v })}
              >
                <SelectTrigger id="blockType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {blockTypes.length === 0 ? (
                    <SelectItem value="cta">cta</SelectItem>
                  ) : (
                    blockTypes.map((b) => (
                      <SelectItem key={b.type} value={b.type}>
                        {b.name} <span className="text-xs text-muted-foreground ml-2">({b.type})</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="content">Inhalt (JSON)</Label>
                <Textarea
                  id="content"
                  rows={10}
                  value={form.contentText}
                  onChange={(e) => setForm({ ...form, contentText: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings">Settings (JSON)</Label>
                <Textarea
                  id="settings"
                  rows={10}
                  value={form.settingsText}
                  onChange={(e) => setForm({ ...form, settingsText: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Aktiv — im Blog rendern
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
