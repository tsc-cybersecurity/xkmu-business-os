'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
            <Button variant="ghost" size="icon" aria-label="Zurueck">
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
              <Input
                value={(settings.backgroundColor as string) || ''}
                onChange={(e) => onUpdateSettings('backgroundColor', e.target.value || undefined)}
                placeholder="transparent"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
