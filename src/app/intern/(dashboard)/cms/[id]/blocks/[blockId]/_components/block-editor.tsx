'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { BlockFieldRenderer } from './block-field-renderer'

interface BlockEditorProps {
  pageId: string
  blockType: string
  content: Record<string, unknown>
  settings: Record<string, unknown>
  saving: boolean
  onSave: () => void
  onUpdateContent: (key: string, value: unknown) => void
  onUpdateSettings: (key: string, value: unknown) => void
}

export function BlockEditor({
  pageId,
  blockType,
  content,
  settings,
  saving,
  onSave,
  onUpdateContent,
  onUpdateSettings,
}: BlockEditorProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/intern/cms/${pageId}`}>
            <Button variant="ghost" size="icon" aria-label="Zurück">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Block bearbeiten: {blockType}</h1>
        </div>
        <Button onClick={onSave} disabled={saving}>
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
              <BlockFieldRenderer
                blockType={blockType}
                content={content}
                updateContent={onUpdateContent}
              />
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
                onChange={(e) => onUpdateSettings('paddingTop', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label>Padding unten (px)</Label>
              <Input
                type="number"
                value={(settings.paddingBottom as number) || ''}
                onChange={(e) => onUpdateSettings('paddingBottom', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label>Max. Breite (px)</Label>
              <Input
                type="number"
                value={(settings.maxWidth as number) || ''}
                onChange={(e) => onUpdateSettings('maxWidth', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label>Hintergrundfarbe</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={(settings.backgroundColor as string) || '#ffffff'}
                  onChange={(e) => onUpdateSettings('backgroundColor', e.target.value)}
                  className="h-9 w-9 rounded border cursor-pointer p-0.5"
                />
                <Input
                  value={(settings.backgroundColor as string) || ''}
                  onChange={(e) => onUpdateSettings('backgroundColor', e.target.value || undefined)}
                  placeholder="transparent"
                  className="flex-1"
                />
                {!!settings.backgroundColor && (
                  <Button variant="ghost" size="sm" className="h-9 px-2 text-xs" onClick={() => onUpdateSettings('backgroundColor', undefined)}>
                    Entfernen
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
                    style={{ backgroundColor: c === 'transparent' ? 'white' : c, backgroundImage: c === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)' : undefined, backgroundSize: c === 'transparent' ? '8px 8px' : undefined, backgroundPosition: c === 'transparent' ? '0 0, 4px 4px' : undefined }}
                    onClick={() => onUpdateSettings('backgroundColor', c === 'transparent' ? undefined : c)}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hintergrundbild</Label>
              <Input
                value={(settings.backgroundImage as string) || ''}
                onChange={(e) => onUpdateSettings('backgroundImage', e.target.value || undefined)}
                placeholder="URL oder leer"
              />
            </div>
            <hr className="my-2" />
            <div className="space-y-2">
              <Label>Schriftfarbe</Label>
              <div className="flex gap-1.5 items-center">
                <input type="color" value={(settings.textColor as string) || '#000000'} onChange={(e) => onUpdateSettings('textColor', e.target.value)} className="h-9 w-9 rounded border cursor-pointer p-0.5" />
                <Input value={(settings.textColor as string) || ''} onChange={(e) => onUpdateSettings('textColor', e.target.value || undefined)} placeholder="Standard" className="flex-1" />
                {!!settings.textColor && (
                  <Button variant="ghost" size="sm" className="h-9 px-2 text-xs" onClick={() => onUpdateSettings('textColor', undefined)}>X</Button>
                )}
              </div>
              <div className="flex gap-1 flex-wrap">
                {['#000000', '#1e293b', '#475569', '#64748b', '#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'].map((c) => (
                  <button key={c} type="button" title={c}
                    className={`h-5 w-5 rounded border transition-all ${(settings.textColor || '') === c ? 'ring-2 ring-primary ring-offset-1' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => onUpdateSettings('textColor', c)}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Schriftgroesse</Label>
              <Select value={(settings.fontSize as string) || 'base'} onValueChange={(v) => onUpdateSettings('fontSize', v === 'base' ? undefined : v)}>
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
    </>
  )
}
