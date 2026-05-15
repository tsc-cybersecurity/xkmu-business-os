'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Loader2, Save, Trash2, Eye, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { BlockFieldRenderer } from '../../[id]/blocks/[blockId]/_components/block-field-renderer'
import { BlockPreview } from '../../[id]/blocks/[blockId]/_components/block-preview'
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
}

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,118}[a-z0-9]$|^[a-z0-9]$/

export default function PromoSlotEditorPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [slot, setSlot] = useState<PromoSlot | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  // Editierbare Felder — werden bei Load aus dem Slot initialisiert und
  // beim Save als komplettes Update zurueck-PUTt.
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [settings, setSettings] = useState<Record<string, unknown>>({})

  const fetchSlot = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/cms/promos/${id}`)
      const data = await res.json()
      if (data.success) {
        const s = data.data as PromoSlot
        setSlot(s)
        setSlug(s.slug)
        setName(s.name)
        setDescription(s.description ?? '')
        setIsActive(s.isActive)
        setContent(s.content ?? {})
        setSettings(s.settings ?? {})
      }
    } catch (error) {
      logger.error('Failed to fetch promo slot', error, { module: 'PromoEditor' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchSlot() }, [fetchSlot])

  const updateContent = (key: string, value: unknown) => {
    setContent((prev) => ({ ...prev, [key]: value }))
  }

  const updateSettings = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!SLUG_REGEX.test(slug)) {
      toast.error('Slug darf nur a-z, 0-9 und Bindestriche enthalten.')
      return
    }
    if (!name.trim()) {
      toast.error('Name ist erforderlich.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/cms/promos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: name.trim(),
          description: description.trim() || null,
          content,
          settings,
          isActive,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error?.message ?? 'Speichern fehlgeschlagen')
        return
      }
      toast.success('Promo-Slot gespeichert')
    } catch (error) {
      logger.error('Failed to save promo slot', error, { module: 'PromoEditor' })
      toast.error('Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!slot) return
    if (!confirm(`Promo "${slot.name}" wirklich loeschen?`)) return
    try {
      await fetch(`/api/v1/cms/promos/${id}`, { method: 'DELETE' })
      router.push('/intern/cms/promos')
    } catch (error) {
      logger.error('Failed to delete promo slot', error, { module: 'PromoEditor' })
    }
  }

  const copyPlaceholder = async () => {
    try {
      await navigator.clipboard.writeText(`{promo:${slug}}`)
      setCopied(true)
      toast.success(`Platzhalter kopiert: {promo:${slug}}`)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!slot) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Promo-Slot nicht gefunden</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/intern/cms/promos">
            <Button variant="ghost" size="icon" aria-label="Zurueck">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{name || 'Promo-Slot'}</h1>
            <button
              type="button"
              onClick={copyPlaceholder}
              className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
              title="Platzhalter kopieren"
            >
              <code>{`{promo:${slug || 'slug'}}`}</code>
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 opacity-60" />}
            </button>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full border ml-2">{slot.blockType}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Loeschen
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Speichern
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linke Spalte: Meta + Inhalt-Felder */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stammdaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Wo wird der Slot eingesetzt?"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="isActive" className="cursor-pointer">Aktiv — im Blog rendern</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inhalt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <BlockFieldRenderer
                blockType={slot.blockType}
                content={content}
                updateContent={updateContent}
              />
            </CardContent>
          </Card>
        </div>

        {/* Rechte Spalte: Settings (Padding, Hintergrund, Schrift) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Einstellungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Padding oben (px)</Label>
              <Input
                type="number"
                value={(settings.paddingTop as number) || ''}
                onChange={(e) => updateSettings('paddingTop', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label>Padding unten (px)</Label>
              <Input
                type="number"
                value={(settings.paddingBottom as number) || ''}
                onChange={(e) => updateSettings('paddingBottom', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label>Max. Breite (px)</Label>
              <Input
                type="number"
                value={(settings.maxWidth as number) || ''}
                onChange={(e) => updateSettings('maxWidth', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label>Hintergrundfarbe</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={(settings.backgroundColor as string) || '#ffffff'}
                  onChange={(e) => updateSettings('backgroundColor', e.target.value)}
                  className="h-9 w-9 rounded border cursor-pointer p-0.5"
                />
                <Input
                  value={(settings.backgroundColor as string) || ''}
                  onChange={(e) => updateSettings('backgroundColor', e.target.value || undefined)}
                  placeholder="transparent"
                  className="flex-1"
                />
                {!!settings.backgroundColor && (
                  <Button variant="ghost" size="sm" className="h-9 px-2 text-xs" onClick={() => updateSettings('backgroundColor', undefined)}>
                    X
                  </Button>
                )}
              </div>
              <div className="flex gap-1 flex-wrap">
                {['transparent', '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#0f172a', '#1e293b', '#eff6ff', '#ecfdf5', '#fef2f2', '#fffbeb', '#faf5ff'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    className={`h-6 w-6 rounded border transition-all ${(settings.backgroundColor || '') === c ? 'ring-2 ring-primary ring-offset-1' : 'hover:scale-110'}`}
                    style={{
                      backgroundColor: c === 'transparent' ? 'white' : c,
                      backgroundImage: c === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)' : undefined,
                      backgroundSize: c === 'transparent' ? '8px 8px' : undefined,
                      backgroundPosition: c === 'transparent' ? '0 0, 4px 4px' : undefined,
                    }}
                    onClick={() => updateSettings('backgroundColor', c === 'transparent' ? undefined : c)}
                  />
                ))}
              </div>
            </div>
            <hr className="my-2" />
            <div className="space-y-2">
              <Label>Schriftfarbe</Label>
              <div className="flex gap-1.5 items-center">
                <input
                  type="color"
                  value={(settings.textColor as string) || '#000000'}
                  onChange={(e) => updateSettings('textColor', e.target.value)}
                  className="h-9 w-9 rounded border cursor-pointer p-0.5"
                />
                <Input
                  value={(settings.textColor as string) || ''}
                  onChange={(e) => updateSettings('textColor', e.target.value || undefined)}
                  placeholder="Standard"
                  className="flex-1"
                />
                {!!settings.textColor && (
                  <Button variant="ghost" size="sm" className="h-9 px-2 text-xs" onClick={() => updateSettings('textColor', undefined)}>X</Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Schriftgroesse</Label>
              <Select
                value={(settings.fontSize as string) || 'base'}
                onValueChange={(v) => updateSettings('fontSize', v === 'base' ? undefined : v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="xs">XS (12px)</SelectItem>
                  <SelectItem value="sm">Klein (14px)</SelectItem>
                  <SelectItem value="base">Normal (16px)</SelectItem>
                  <SelectItem value="lg">Gross (18px)</SelectItem>
                  <SelectItem value="xl">XL (20px)</SelectItem>
                  <SelectItem value="2xl">2XL (24px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live-Vorschau (volle Breite) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Eye className="h-4 w-4" />
          Live-Vorschau
        </div>
        <BlockPreview blockType={slot.blockType} content={content} settings={settings} />
      </div>
    </div>
  )
}
