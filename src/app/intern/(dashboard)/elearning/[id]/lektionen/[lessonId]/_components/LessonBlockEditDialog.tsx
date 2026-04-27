'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'
import type { CourseLessonBlock } from '@/lib/db/schema'

interface FieldDef {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'boolean' | 'list-text' | 'list-object'
  options?: string[]
  default?: unknown
  schema?: FieldDef[]
}

interface Props {
  block: CourseLessonBlock | null
  fields: FieldDef[]
  onClose: () => void
  onSave: (patch: { markdownBody?: string; content?: Record<string, unknown> }) => Promise<void>
}

export function LessonBlockEditDialog({ block, fields, onClose, onSave }: Props) {
  const [markdownBody, setMarkdownBody] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!block) return
    setMarkdownBody(block.markdownBody ?? '')
    setContent((block.content as Record<string, unknown>) ?? {})
  }, [block])

  async function save() {
    setBusy(true)
    try {
      if (block?.kind === 'markdown') {
        await onSave({ markdownBody })
      } else {
        await onSave({ content })
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  if (!block) return null

  return (
    <Dialog open={!!block} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {block.kind === 'markdown' ? 'Markdown' : block.blockType} bearbeiten
          </DialogTitle>
        </DialogHeader>

        {block.kind === 'markdown' ? (
          <Textarea
            value={markdownBody}
            onChange={(e) => setMarkdownBody(e.target.value)}
            rows={15}
            className="font-mono text-sm"
          />
        ) : (
          <div className="space-y-4">
            {fields.map((f) => (
              <FieldEditor
                key={f.name}
                field={f}
                value={content[f.name]}
                onChange={(v) => setContent({ ...content, [f.name]: v })}
              />
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button onClick={save} disabled={busy}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FieldEditor({ field, value, onChange }: {
  field: FieldDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  if (field.type === 'text') {
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        <Input value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
      </div>
    )
  }
  if (field.type === 'textarea') {
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        <Textarea value={(value as string) ?? ''} rows={5} onChange={(e) => onChange(e.target.value)} />
      </div>
    )
  }
  if (field.type === 'select') {
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        <Select value={(value as string) ?? ''} onValueChange={onChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    )
  }
  if (field.type === 'boolean') {
    return (
      <div className="flex items-center justify-between">
        <Label>{field.label}</Label>
        <Checkbox
          checked={!!value}
          onCheckedChange={(c) => onChange(c === true)}
        />
      </div>
    )
  }
  if (field.type === 'list-text') {
    const items = (value as string[]) ?? []
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <Input value={item} onChange={(e) => {
              const next = [...items]; next[i] = e.target.value; onChange(next)
            }} />
            <Button variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange([...items, ''])}>
          <Plus className="mr-1 h-4 w-4" />Eintrag
        </Button>
      </div>
    )
  }
  if (field.type === 'list-object') {
    const items = (value as Record<string, unknown>[]) ?? []
    return (
      <div className="space-y-3">
        <Label>{field.label}</Label>
        {items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2">
            {(field.schema ?? []).map((sub) => (
              <FieldEditor
                key={sub.name}
                field={sub}
                value={item[sub.name]}
                onChange={(v) => {
                  const next = [...items]; next[i] = { ...item, [sub.name]: v }; onChange(next)
                }}
              />
            ))}
            <Button variant="ghost" size="sm" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Trash2 className="mr-1 h-4 w-4" />Eintrag entfernen
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange([...items, {}])}>
          <Plus className="mr-1 h-4 w-4" />Eintrag
        </Button>
      </div>
    )
  }
  return null
}
