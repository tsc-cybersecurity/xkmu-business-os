'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2, Save, Plus, Trash2, Sparkles } from 'lucide-react'

interface CmsBlock {
  id: string
  pageId: string
  blockType: string
  sortOrder: number | null
  content: Record<string, unknown>
  settings: Record<string, unknown>
  isVisible: boolean | null
}

export default function BlockEditorPage() {
  const params = useParams()
  const router = useRouter()
  const pageId = params.id as string
  const blockId = params.blockId as string

  const [block, setBlock] = useState<CmsBlock | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [settings, setSettings] = useState<Record<string, unknown>>({})

  const fetchBlock = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/cms/pages/${pageId}`)
      const data = await response.json()
      if (data.success) {
        const found = data.data.blocks.find((b: CmsBlock) => b.id === blockId)
        if (found) {
          setBlock(found)
          setContent((found.content as Record<string, unknown>) || {})
          setSettings((found.settings as Record<string, unknown>) || {})
        }
      }
    } catch (error) {
      console.error('Failed to fetch block:', error)
    } finally {
      setLoading(false)
    }
  }, [pageId, blockId])

  useEffect(() => {
    fetchBlock()
  }, [fetchBlock])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`/api/v1/cms/blocks/${blockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, settings }),
      })
      router.push(`/intern/cms/${pageId}`)
    } catch (error) {
      console.error('Failed to save block:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateContent = (key: string, value: unknown) => {
    setContent((prev) => ({ ...prev, [key]: value }))
  }

  const updateSettings = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!block) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Block nicht gefunden</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/intern/cms/${pageId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Block bearbeiten: {block.blockType}</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Speichern
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Inhalt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderContentForm(block.blockType, content, updateContent)}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Einstellungen</CardTitle>
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
              <Input
                value={(settings.backgroundColor as string) || ''}
                onChange={(e) => updateSettings('backgroundColor', e.target.value || undefined)}
                placeholder="transparent"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function renderContentForm(
  blockType: string,
  content: Record<string, unknown>,
  updateContent: (key: string, value: unknown) => void
) {
  switch (blockType) {
    case 'hero':
      return (
        <>
          <div className="space-y-2">
            <Label>Hintergrundbild URL</Label>
            <Input value={(content.backgroundImage as string) || ''} onChange={(e) => updateContent('backgroundImage', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Badge Icon (z.B. Building2)</Label>
            <Input value={((content.badge as any)?.icon as string) || ''} onChange={(e) => updateContent('badge', { ...(content.badge as any || {}), icon: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Badge Text</Label>
            <Input value={((content.badge as any)?.text as string) || ''} onChange={(e) => updateContent('badge', { ...(content.badge as any || {}), text: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Ueberschrift</Label>
            <Input value={(content.headline as string) || ''} onChange={(e) => updateContent('headline', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Highlight-Text</Label>
            <Input value={(content.headlineHighlight as string) || ''} onChange={(e) => updateContent('headlineHighlight', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Untertitel</Label>
            <Textarea value={(content.subheadline as string) || ''} onChange={(e) => updateContent('subheadline', e.target.value)} rows={3} />
          </div>
          <ArrayField label="Buttons" items={(content.buttons as any[]) || []} onChange={(items) => updateContent('buttons', items)} fields={['label', 'href', 'variant']} />
          <ArrayField label="Statistiken" items={(content.stats as any[]) || []} onChange={(items) => updateContent('stats', items)} fields={['value', 'label']} />
        </>
      )
    case 'features':
      return (
        <>
          <div className="space-y-2">
            <Label>Abschnittstitel</Label>
            <Input value={(content.sectionTitle as string) || ''} onChange={(e) => updateContent('sectionTitle', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Abschnitts-Untertitel</Label>
            <Input value={(content.sectionSubtitle as string) || ''} onChange={(e) => updateContent('sectionSubtitle', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Spalten</Label>
            <Select value={String(content.columns || 3)} onValueChange={(v) => updateContent('columns', parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Spalten</SelectItem>
                <SelectItem value="3">3 Spalten</SelectItem>
                <SelectItem value="4">4 Spalten</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ArrayField label="Features" items={(content.items as any[]) || []} onChange={(items) => updateContent('items', items)} fields={['icon', 'title', 'description']} />
        </>
      )
    case 'cta':
      return (
        <>
          <div className="space-y-2">
            <Label>Ueberschrift</Label>
            <Input value={(content.headline as string) || ''} onChange={(e) => updateContent('headline', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Textarea value={(content.description as string) || ''} onChange={(e) => updateContent('description', e.target.value)} rows={3} />
          </div>
          <ArrayField label="Buttons" items={(content.buttons as any[]) || []} onChange={(items) => updateContent('buttons', items)} fields={['label', 'href', 'variant']} />
          <ArrayField label="Highlights" items={(content.highlights as any[]) || []} onChange={(items) => updateContent('highlights', items)} fields={['icon', 'title', 'subtitle']} />
        </>
      )
    case 'text':
      return (
        <>
          <div className="space-y-2">
            <Label>Inhalt (Markdown)</Label>
            <Textarea value={(content.content as string) || ''} onChange={(e) => updateContent('content', e.target.value)} rows={15} className="font-mono text-sm" />
          </div>
          <div className="space-y-2">
            <Label>Ausrichtung</Label>
            <Select value={(content.alignment as string) || 'left'} onValueChange={(v) => updateContent('alignment', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Links</SelectItem>
                <SelectItem value="center">Zentriert</SelectItem>
                <SelectItem value="right">Rechts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )
    case 'heading':
      return (
        <>
          <div className="space-y-2">
            <Label>Text</Label>
            <Input value={(content.text as string) || ''} onChange={(e) => updateContent('text', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Ebene</Label>
            <Select value={String(content.level || 1)} onValueChange={(v) => updateContent('level', parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">H1</SelectItem>
                <SelectItem value="2">H2</SelectItem>
                <SelectItem value="3">H3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Untertitel</Label>
            <Input value={(content.subtitle as string) || ''} onChange={(e) => updateContent('subtitle', e.target.value)} />
          </div>
        </>
      )
    case 'image':
      return (
        <>
          <div className="space-y-2">
            <Label>Bild URL</Label>
            <Input value={(content.src as string) || ''} onChange={(e) => updateContent('src', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Alt-Text</Label>
            <Input value={(content.alt as string) || ''} onChange={(e) => updateContent('alt', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Bildunterschrift</Label>
            <Input value={(content.caption as string) || ''} onChange={(e) => updateContent('caption', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Breite</Label>
            <Select value={(content.width as string) || 'container'} onValueChange={(v) => updateContent('width', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Volle Breite</SelectItem>
                <SelectItem value="container">Container</SelectItem>
                <SelectItem value="narrow">Schmal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )
    case 'cards':
      return (
        <>
          <div className="space-y-2">
            <Label>Spalten</Label>
            <Select value={String(content.columns || 3)} onValueChange={(v) => updateContent('columns', parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Spalten</SelectItem>
                <SelectItem value="3">3 Spalten</SelectItem>
                <SelectItem value="4">4 Spalten</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ArrayField label="Karten" items={(content.items as any[]) || []} onChange={(items) => updateContent('items', items)} fields={['icon', 'title', 'description', 'link']} />
        </>
      )
    case 'placeholder':
      return (
        <>
          <div className="space-y-2">
            <Label>Icon (z.B. Shield, Bot, Monitor)</Label>
            <Input value={(content.icon as string) || ''} onChange={(e) => updateContent('icon', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Titel</Label>
            <Input value={(content.title as string) || ''} onChange={(e) => updateContent('title', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Textarea value={(content.description as string) || ''} onChange={(e) => updateContent('description', e.target.value)} rows={3} />
          </div>
        </>
      )
    default:
      return (
        <div className="space-y-2">
          <Label>Rohdaten (JSON)</Label>
          <Textarea
            value={JSON.stringify(content, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                Object.keys(parsed).forEach((k) => updateContent(k, parsed[k]))
              } catch {
                // Invalid JSON, ignore
              }
            }}
            rows={10}
            className="font-mono text-sm"
          />
        </div>
      )
  }
}

function ArrayField({
  label,
  items,
  onChange,
  fields,
}: {
  label: string
  items: Record<string, string>[]
  onChange: (items: Record<string, string>[]) => void
  fields: string[]
}) {
  const addItem = () => {
    const newItem: Record<string, string> = {}
    fields.forEach((f) => (newItem[f] = ''))
    onChange([...items, newItem])
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-3 w-3 mr-1" /> Hinzufuegen
        </Button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start rounded-lg border p-3">
          <div className="flex-1 grid grid-cols-1 gap-2">
            {fields.map((field) => (
              <Input
                key={field}
                placeholder={field}
                value={item[field] || ''}
                onChange={(e) => updateItem(i, field, e.target.value)}
                className="text-sm"
              />
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeItem(i)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  )
}
