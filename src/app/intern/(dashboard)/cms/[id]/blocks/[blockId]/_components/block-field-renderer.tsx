'use client'

import { Button } from '@/components/ui/button'
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
import { Plus, Trash2, Check, Wand2 } from 'lucide-react'
import { ImageGeneratorDialog } from '@/components/shared'

interface BlockFieldRendererProps {
  blockType: string
  content: Record<string, unknown>
  updateContent: (key: string, value: unknown) => void
}

export function BlockFieldRenderer({ blockType, content, updateContent }: BlockFieldRendererProps) {
  switch (blockType) {
    case 'hero':
      return (
        <>
          <div className="space-y-2">
            <Label>Hintergrundbild URL</Label>
            <div className="flex gap-2">
              <Input value={(content.backgroundImage as string) || ''} onChange={(e) => updateContent('backgroundImage', e.target.value)} className="flex-1" />
              <ImageGeneratorDialog
                defaultCategory="website"
                onImageGenerated={(url) => updateContent('backgroundImage', url)}
                trigger={
                  <Button variant="outline" size="icon" title="Bild generieren">
                    <Wand2 className="h-4 w-4" />
                  </Button>
                }
              />
            </div>
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
            <div className="flex gap-2">
              <Input value={(content.src as string) || ''} onChange={(e) => updateContent('src', e.target.value)} className="flex-1" />
              <ImageGeneratorDialog
                defaultCategory="website"
                onImageGenerated={(url) => updateContent('src', url)}
                trigger={
                  <Button variant="outline" size="icon" title="Bild generieren">
                    <Wand2 className="h-4 w-4" />
                  </Button>
                }
              />
            </div>
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
    case 'testimonials':
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
            <Select value={String(content.columns || 2)} onValueChange={(v) => updateContent('columns', parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Spalten</SelectItem>
                <SelectItem value="3">3 Spalten</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ArrayField label="Referenzen" items={(content.items as any[]) || []} onChange={(items) => updateContent('items', items)} fields={['name', 'role', 'company', 'avatar', 'quote', 'rating']} />
        </>
      )
    case 'pricing':
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
          <PricingPlansField plans={(content.plans as any[]) || []} onChange={(plans) => updateContent('plans', plans)} />
        </>
      )
    case 'faq':
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
          <ArrayField label="Fragen" items={(content.items as any[]) || []} onChange={(items) => updateContent('items', items)} fields={['question', 'answer']} />
        </>
      )
    case 'stats':
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
            <Select value={String(content.columns || 4)} onValueChange={(v) => updateContent('columns', parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Spalten</SelectItem>
                <SelectItem value="3">3 Spalten</SelectItem>
                <SelectItem value="4">4 Spalten</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Variante</Label>
            <Select value={(content.variant as string) || 'default'} onValueChange={(v) => updateContent('variant', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Standard</SelectItem>
                <SelectItem value="cards">Karten</SelectItem>
                <SelectItem value="brand">Markenfarbe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ArrayField label="Kennzahlen" items={(content.items as any[]) || []} onChange={(items) => updateContent('items', items)} fields={['value', 'label', 'description']} />
        </>
      )
    case 'team':
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
          <ArrayField label="Teammitglieder" items={(content.items as any[]) || []} onChange={(items) => updateContent('items', items)} fields={['name', 'role', 'image', 'bio']} />
        </>
      )
    case 'timeline':
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
          <ArrayField label="Schritte" items={(content.items as any[]) || []} onChange={(items) => updateContent('items', items)} fields={['icon', 'title', 'description']} />
        </>
      )
    case 'logocloud':
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
          <ArrayField label="Logos" items={(content.items as any[]) || []} onChange={(items) => updateContent('items', items)} fields={['name', 'image', 'href']} />
        </>
      )
    case 'video':
      return (
        <>
          <div className="space-y-2">
            <Label>Video URL (YouTube, Vimeo oder direkt)</Label>
            <Input value={(content.src as string) || ''} onChange={(e) => updateContent('src', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
          </div>
          <div className="space-y-2">
            <Label>Titel</Label>
            <Input value={(content.title as string) || ''} onChange={(e) => updateContent('title', e.target.value)} />
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
          <div className="space-y-2">
            <Label>Seitenverhaeltnis</Label>
            <Select value={(content.aspectRatio as string) || '16:9'} onValueChange={(v) => updateContent('aspectRatio', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">16:9</SelectItem>
                <SelectItem value="4:3">4:3</SelectItem>
                <SelectItem value="1:1">1:1</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )
    case 'gallery':
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
          <ArrayField label="Bilder" items={(content.items as any[]) || []} onChange={(items) => updateContent('items', items)} fields={['src', 'alt', 'caption']} />
        </>
      )
    case 'banner':
      return (
        <>
          <div className="space-y-2">
            <Label>Text</Label>
            <Input value={(content.text as string) || ''} onChange={(e) => updateContent('text', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Variante</Label>
            <Select value={(content.variant as string) || 'info'} onValueChange={(v) => updateContent('variant', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info (Blau)</SelectItem>
                <SelectItem value="success">Erfolg (Gruen)</SelectItem>
                <SelectItem value="warning">Warnung (Gelb)</SelectItem>
                <SelectItem value="brand">Markenfarbe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Icon (z.B. Megaphone, Info, AlertTriangle)</Label>
            <Input value={(content.icon as string) || ''} onChange={(e) => updateContent('icon', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input value={(content.buttonLabel as string) || ''} onChange={(e) => updateContent('buttonLabel', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Button Link</Label>
            <Input value={(content.buttonHref as string) || ''} onChange={(e) => updateContent('buttonHref', e.target.value)} />
          </div>
        </>
      )
    case 'divider':
      return (
        <>
          <div className="space-y-2">
            <Label>Stil</Label>
            <Select value={(content.style as string) || 'line'} onValueChange={(v) => updateContent('style', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Linie</SelectItem>
                <SelectItem value="dashed">Gestrichelt</SelectItem>
                <SelectItem value="dots">Punkte</SelectItem>
                <SelectItem value="gradient">Farbverlauf</SelectItem>
                <SelectItem value="space">Leerraum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Beschriftung (optional)</Label>
            <Input value={(content.label as string) || ''} onChange={(e) => updateContent('label', e.target.value)} />
          </div>
        </>
      )
    case 'comparison':
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
          <ComparisonField
            columns={(content.columns as any[]) || []}
            rows={(content.rows as any[]) || []}
            onChangeColumns={(cols) => updateContent('columns', cols)}
            onChangeRows={(rows) => updateContent('rows', rows)}
          />
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
    case 'service-cards':
      return (
        <>
          <div className="space-y-2">
            <Label>Abschnittstitel</Label>
            <Input value={(content.sectionTitle as string) || ''} onChange={(e) => updateContent('sectionTitle', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Untertitel</Label>
            <Input value={(content.sectionSubtitle as string) || ''} onChange={(e) => updateContent('sectionSubtitle', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Spalten</Label>
            <Select value={String(content.columns || 2)} onValueChange={(v) => updateContent('columns', parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Spalte</SelectItem>
                <SelectItem value="2">2 Spalten</SelectItem>
                <SelectItem value="3">3 Spalten</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ServiceCardsField
            items={(content.items as Array<Record<string, any>>) || []}
            onChange={(items) => updateContent('items', items)}
          />
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
          <Button variant="ghost" size="icon" aria-label="Löschen" className="h-8 w-8 shrink-0" onClick={() => removeItem(i)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  )
}

function PricingPlansField({
  plans,
  onChange,
}: {
  plans: Array<Record<string, any>>
  onChange: (plans: Array<Record<string, any>>) => void
}) {
  const addPlan = () => {
    onChange([...plans, { name: '', price: '', period: 'Monat', description: '', features: [], buttonLabel: '', buttonHref: '', highlighted: false }])
  }

  const removePlan = (index: number) => {
    onChange(plans.filter((_, i) => i !== index))
  }

  const updatePlan = (index: number, field: string, value: any) => {
    const updated = [...plans]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Pakete</Label>
        <Button variant="outline" size="sm" onClick={addPlan}>
          <Plus className="h-3 w-3 mr-1" /> Paket hinzufuegen
        </Button>
      </div>
      {plans.map((plan, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Paket {i + 1}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updatePlan(i, 'highlighted', !plan.highlighted)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border ${plan.highlighted ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300' : 'border-border'}`}
              >
                {plan.highlighted && <Check className="h-3 w-3" />}
                Hervorgehoben
              </button>
              <Button variant="ghost" size="icon" aria-label="Löschen" className="h-7 w-7" onClick={() => removePlan(i)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Name" value={plan.name || ''} onChange={(e) => updatePlan(i, 'name', e.target.value)} className="text-sm" />
            <Input placeholder="Preis (z.B. 29€)" value={plan.price || ''} onChange={(e) => updatePlan(i, 'price', e.target.value)} className="text-sm" />
            <Input placeholder="Zeitraum (z.B. Monat)" value={plan.period || ''} onChange={(e) => updatePlan(i, 'period', e.target.value)} className="text-sm" />
            <Input placeholder="Beschreibung" value={plan.description || ''} onChange={(e) => updatePlan(i, 'description', e.target.value)} className="text-sm" />
            <Input placeholder="Button Text" value={plan.buttonLabel || ''} onChange={(e) => updatePlan(i, 'buttonLabel', e.target.value)} className="text-sm" />
            <Input placeholder="Button Link" value={plan.buttonHref || ''} onChange={(e) => updatePlan(i, 'buttonHref', e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Features (eins pro Zeile)</Label>
            <Textarea
              value={(plan.features || []).join('\n')}
              onChange={(e) => updatePlan(i, 'features', e.target.value.split('\n').filter((l: string) => l.trim()))}
              rows={4}
              className="text-sm"
              placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function ServiceCardsField({
  items,
  onChange,
}: {
  items: Array<Record<string, any>>
  onChange: (items: Array<Record<string, any>>) => void
}) {
  const addItem = () => {
    onChange([...items, { badge: '', title: '', description: '', checklistItems: [], deliverables: [] }])
  }
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index))
  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Service-Karten</Label>
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-3 w-3 mr-1" /> Karte hinzufuegen
        </Button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Karte {i + 1}</span>
            <Button variant="ghost" size="icon" aria-label="Loeschen" className="h-7 w-7" onClick={() => removeItem(i)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Input placeholder="Badge (z.B. B1)" value={item.badge || ''} onChange={(e) => updateItem(i, 'badge', e.target.value)} className="text-sm" />
            <Input placeholder="Titel" value={item.title || ''} onChange={(e) => updateItem(i, 'title', e.target.value)} className="text-sm col-span-3" />
          </div>
          <Input placeholder="Beschreibung" value={item.description || ''} onChange={(e) => updateItem(i, 'description', e.target.value)} className="text-sm" />
          <div className="space-y-1">
            <Label className="text-xs">Checkliste (eins pro Zeile)</Label>
            <Textarea
              value={(item.checklistItems || []).join('\n')}
              onChange={(e) => updateItem(i, 'checklistItems', e.target.value.split('\n').filter((l: string) => l.trim()))}
              rows={4}
              className="text-sm"
              placeholder="Leistungspunkt 1&#10;Leistungspunkt 2"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Deliverables (kommagetrennt)</Label>
            <Input
              value={(item.deliverables || []).join(', ')}
              onChange={(e) => updateItem(i, 'deliverables', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
              className="text-sm"
              placeholder="Ergebnis 1, Ergebnis 2, Ergebnis 3"
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function ComparisonField({
  columns,
  rows,
  onChangeColumns,
  onChangeRows,
}: {
  columns: Array<{ name: string; highlighted?: boolean }>
  rows: Array<{ feature: string; values: string[] }>
  onChangeColumns: (cols: Array<{ name: string; highlighted?: boolean }>) => void
  onChangeRows: (rows: Array<{ feature: string; values: string[] }>) => void
}) {
  const addColumn = () => {
    onChangeColumns([...columns, { name: '', highlighted: false }])
    onChangeRows(rows.map((r) => ({ ...r, values: [...(r.values || []), ''] })))
  }
  const removeColumn = (index: number) => {
    onChangeColumns(columns.filter((_, i) => i !== index))
    onChangeRows(rows.map((r) => ({ ...r, values: (r.values || []).filter((_, i) => i !== index) })))
  }
  const updateColumn = (index: number, field: string, value: any) => {
    const updated = [...columns]
    updated[index] = { ...updated[index], [field]: value }
    onChangeColumns(updated)
  }
  const addRow = () => {
    onChangeRows([...rows, { feature: '', values: columns.map(() => '') }])
  }
  const removeRow = (index: number) => {
    onChangeRows(rows.filter((_, i) => i !== index))
  }
  const updateRow = (rowIndex: number, field: string, value: any) => {
    const updated = [...rows]
    if (field === 'feature') {
      updated[rowIndex] = { ...updated[rowIndex], feature: value }
    }
    onChangeRows(updated)
  }
  const updateRowValue = (rowIndex: number, colIndex: number, value: string) => {
    const updated = [...rows]
    const values = [...(updated[rowIndex].values || [])]
    values[colIndex] = value
    updated[rowIndex] = { ...updated[rowIndex], values }
    onChangeRows(updated)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Spalten</Label>
          <Button variant="outline" size="sm" onClick={addColumn}>
            <Plus className="h-3 w-3 mr-1" /> Spalte
          </Button>
        </div>
        {columns.map((col, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input placeholder="Spaltenname" value={col.name} onChange={(e) => updateColumn(i, 'name', e.target.value)} className="text-sm" />
            <button
              type="button"
              onClick={() => updateColumn(i, 'highlighted', !col.highlighted)}
              className={`shrink-0 text-xs px-2 py-1 rounded-md border ${col.highlighted ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300' : 'border-border'}`}
            >
              {col.highlighted ? 'Hervorgehoben' : 'Normal'}
            </button>
            <Button variant="ghost" size="icon" aria-label="Löschen" className="h-8 w-8 shrink-0" onClick={() => removeColumn(i)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Zeilen</Label>
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-3 w-3 mr-1" /> Zeile
          </Button>
        </div>
        {rows.map((row, ri) => (
          <div key={ri} className="rounded-lg border p-3 space-y-2">
            <div className="flex gap-2 items-center">
              <Input placeholder="Feature-Name" value={row.feature} onChange={(e) => updateRow(ri, 'feature', e.target.value)} className="text-sm font-medium" />
              <Button variant="ghost" size="icon" aria-label="Löschen" className="h-8 w-8 shrink-0" onClick={() => removeRow(ri)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {columns.map((col, ci) => (
                <Input
                  key={ci}
                  placeholder={`${col.name || `Spalte ${ci + 1}`} (ja/nein/Text)`}
                  value={(row.values || [])[ci] || ''}
                  onChange={(e) => updateRowValue(ri, ci, e.target.value)}
                  className="text-sm"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
