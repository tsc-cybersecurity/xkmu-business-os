'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import type { CourseLessonBlock } from '@/lib/db/schema'

interface Props {
  block: CourseLessonBlock
  onEdit: () => void
  onDelete: () => void
}

export function LessonBlockRow({ block, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id })

  const preview = block.kind === 'markdown'
    ? (block.markdownBody ?? '').slice(0, 80) + ((block.markdownBody?.length ?? 0) > 80 ? '…' : '')
    : `[${block.blockType}]`

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 rounded-md border p-2 bg-background"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground" aria-label="Verschieben">
        <GripVertical className="h-4 w-4" />
      </button>
      <Badge variant="outline" className="font-mono text-xs">
        {block.kind === 'markdown' ? 'MD' : (block.blockType ?? '')}
      </Badge>
      <span className="flex-1 text-sm text-muted-foreground truncate">{preview}</span>
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Bearbeiten">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Löschen">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  )
}
