'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  isActive: boolean
  updatedAt: string | null
}

interface BlockType {
  type: string
  name: string
  defaultContent?: Record<string, unknown>
  defaultSettings?: Record<string, unknown>
}

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,118}[a-z0-9]$|^[a-z0-9]$/

export default function CmsPromosPage() {
  const router = useRouter()
  const [slots, setSlots] = useState<PromoSlot[]>([])
  const [blockTypes, setBlockTypes] = useState<BlockType[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  // Neu-Anlage-Felder — nur das Noetigste, alles Weitere bearbeitet der
  // User auf der Editor-Detailseite.
  const [newSlug, setNewSlug] = useState('')
  const [newName, setNewName] = useState('')
  const [newBlockType, setNewBlockType] = useState('cta')

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
          (data.data as BlockType[]).map((b) => ({
            type: b.type,
            name: b.name,
            defaultContent: b.defaultContent ?? {},
            defaultSettings: b.defaultSettings ?? {},
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

  const handleCreate = async () => {
    if (!SLUG_REGEX.test(newSlug)) {
      toast.error('Slug darf nur a-z, 0-9 und Bindestriche enthalten.')
      return
    }
    if (!newName.trim()) {
      toast.error('Name ist erforderlich.')
      return
    }
    setCreating(true)
    try {
      // Default-Content/-Settings aus der Block-Type-Definition uebernehmen,
      // damit der WYSIWYG-Editor sofort sinnvolle Felder anzeigt.
      const blockType = blockTypes.find((b) => b.type === newBlockType)
      const payload = {
        slug: newSlug,
        name: newName.trim(),
        blockType: newBlockType,
        content: blockType?.defaultContent ?? {},
        settings: blockType?.defaultSettings ?? {},
        isActive: true,
      }
      const res = await fetch('/api/v1/cms/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error?.message ?? 'Anlegen fehlgeschlagen')
        return
      }
      toast.success('Promo-Slot angelegt')
      setShowNewDialog(false)
      setNewSlug('')
      setNewName('')
      setNewBlockType('cta')
      router.push(`/intern/cms/promos/${data.data.id}`)
    } catch (error) {
      logger.error('Failed to create promo', error, { module: 'CmsPromos' })
      toast.error('Anlegen fehlgeschlagen')
    } finally {
      setCreating(false)
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
        <Button onClick={() => setShowNewDialog(true)}>
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
                      <Link href={`/intern/cms/promos/${slot.id}`}>
                        <Button variant="ghost" size="icon" title="Bearbeiten">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
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

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuer Promo-Slot</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-slug">Slug</Label>
              <Input
                id="new-slug"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase())}
                placeholder="kontakt-cta"
              />
              <p className="text-xs text-muted-foreground">
                Wird als <code className="text-[10px]">{`{promo:${newSlug || 'slug'}}`}</code> eingebunden.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-name">Name (intern)</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="z.B. Kontakt-CTA"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-blockType">Block-Typ</Label>
              <Select value={newBlockType} onValueChange={setNewBlockType}>
                <SelectTrigger id="new-blockType"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {blockTypes.length === 0 ? (
                    <SelectItem value="cta">cta</SelectItem>
                  ) : (
                    blockTypes.map((b) => (
                      <SelectItem key={b.type} value={b.type}>
                        {b.name}
                        <span className="text-xs text-muted-foreground ml-2">({b.type})</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Inhalt und Layout im naechsten Schritt im WYSIWYG-Editor pflegen.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)} disabled={creating}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Anlegen &amp; bearbeiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
