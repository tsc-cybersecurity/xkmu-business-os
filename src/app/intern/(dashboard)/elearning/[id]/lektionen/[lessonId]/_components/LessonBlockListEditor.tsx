'use client'

import { useEffect, useState, useCallback } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-states'
import { EmptyState } from '@/components/shared/empty-state'
import { FileText } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import type { CourseLessonBlock } from '@/lib/db/schema'
import { LessonBlockRow } from './LessonBlockRow'
import { LessonBlockTypePicker } from './LessonBlockTypePicker'
import { LessonBlockEditDialog } from './LessonBlockEditDialog'

interface BlockTypeDef {
  slug: string
  fields: Array<{ name: string; label: string; type: string; options?: string[]; schema?: unknown }>
}

interface Props {
  courseId: string
  lessonId: string
}

export function LessonBlockListEditor({ courseId, lessonId }: Props) {
  const [blocks, setBlocks] = useState<CourseLessonBlock[]>([])
  const [typeDefs, setTypeDefs] = useState<Record<string, BlockTypeDef>>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<CourseLessonBlock | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [blocksRes, typesRes] = await Promise.all([
        fetch(`/api/v1/courses/${courseId}/lessons/${lessonId}/blocks`).then((r) => r.json()),
        fetch('/api/v1/cms/block-types?available_in_lessons=true').then((r) => r.json()),
      ])
      if (blocksRes.success) setBlocks(blocksRes.data)
      if (typesRes.success) {
        const map: Record<string, BlockTypeDef> = {}
        for (const t of typesRes.data) map[t.slug] = t
        setTypeDefs(map)
      }
    } catch (e) {
      logger.error('Block list load failed', e, { module: 'LessonBlockListEditor' })
    } finally {
      setLoading(false)
    }
  }, [courseId, lessonId])

  useEffect(() => { void load() }, [load])

  async function addBlock(input:
    | { kind: 'markdown' }
    | { kind: 'cms_block'; blockType: string; content?: Record<string, unknown>; settings?: Record<string, unknown> }
  ) {
    const body = input.kind === 'markdown'
      ? { kind: 'markdown', markdownBody: '' }
      : input
    const res = await fetch(`/api/v1/courses/${courseId}/lessons/${lessonId}/blocks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const json = await res.json()
    if (json.success) {
      toast.success('Block hinzugefügt')
      await load()
      setEditing(json.data)
    } else {
      toast.error(json.error?.message ?? 'Hinzufügen fehlgeschlagen')
    }
  }

  async function saveBlock(patch: { markdownBody?: string; content?: Record<string, unknown> }) {
    if (!editing) return
    const res = await fetch(`/api/v1/courses/${courseId}/lessons/${lessonId}/blocks/${editing.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
    const json = await res.json()
    if (json.success) {
      toast.success('Block gespeichert')
      await load()
    } else {
      toast.error(json.error?.message ?? 'Speichern fehlgeschlagen')
    }
  }

  async function deleteBlock(id: string) {
    if (!confirm('Block löschen?')) return
    await fetch(`/api/v1/courses/${courseId}/lessons/${lessonId}/blocks/${id}`, { method: 'DELETE' })
    toast.success('Block gelöscht')
    await load()
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = blocks.findIndex((b) => b.id === active.id)
    const newIdx = blocks.findIndex((b) => b.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const reordered = arrayMove(blocks, oldIdx, newIdx)
    setBlocks(reordered)
    await fetch(`/api/v1/courses/${courseId}/lessons/${lessonId}/blocks/reorder`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reordered.map((b, i) => ({ id: b.id, position: i + 1 }))),
    })
  }

  if (loading) return <LoadingSpinner />

  const editingFields = editing?.kind === 'cms_block'
    ? (typeDefs[editing.blockType ?? '']?.fields ?? [])
    : []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Inhalt</CardTitle>
        </CardHeader>
        <CardContent>
          {blocks.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Noch keine Blocks"
              description="Füge unten den ersten Block hinzu — Markdown für Fließtext, oder einen strukturierten Block."
            />
          ) : (
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {blocks.map((b) => (
                    <LessonBlockRow
                      key={b.id}
                      block={b}
                      onEdit={() => setEditing(b)}
                      onDelete={() => void deleteBlock(b.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <LessonBlockTypePicker onSelect={(input) => void addBlock(input)} />

      <LessonBlockEditDialog
        block={editing}
        fields={editingFields as never}
        onClose={() => setEditing(null)}
        onSave={saveBlock}
      />
    </div>
  )
}
