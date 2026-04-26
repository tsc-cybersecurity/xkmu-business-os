'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GripVertical, Plus, Trash2, FolderOpen } from 'lucide-react'
import type { CourseModule, CourseLesson } from './CourseEditView'

interface Props {
  courseId: string
  useModules: boolean
  modules: CourseModule[]
  lessons: CourseLesson[]
  onChange: () => void
}

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 border rounded p-2 bg-background"
    >
      <button {...attributes} {...listeners} className="cursor-grab" aria-label="Verschieben">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export function CourseContentTree({
  courseId,
  useModules,
  modules,
  lessons,
  onChange,
}: Props) {
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [newLessonTitle, setNewLessonTitle] = useState('')
  const [newLessonModuleId, setNewLessonModuleId] = useState<string | null>(null)

  async function addModule() {
    if (!newModuleTitle) return
    await fetch(`/api/v1/courses/${courseId}/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newModuleTitle }),
    })
    setNewModuleTitle('')
    onChange()
  }

  async function addLesson() {
    if (!newLessonTitle) return
    await fetch(`/api/v1/courses/${courseId}/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newLessonTitle, moduleId: newLessonModuleId }),
    })
    setNewLessonTitle('')
    onChange()
  }

  async function deleteLesson(id: string) {
    if (!confirm('Lektion löschen?')) return
    await fetch(`/api/v1/courses/${courseId}/lessons/${id}`, { method: 'DELETE' })
    onChange()
  }

  async function deleteModule(id: string) {
    if (!confirm('Modul löschen?')) return
    await fetch(`/api/v1/courses/${courseId}/modules/${id}`, { method: 'DELETE' })
    onChange()
  }

  async function reorderLessons(reordered: CourseLesson[]) {
    await fetch(`/api/v1/courses/${courseId}/lessons/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        reordered.map((l, i) => ({ id: l.id, position: i + 1, moduleId: l.moduleId })),
      ),
    })
    onChange()
  }

  async function reorderModules(reordered: CourseModule[]) {
    await fetch(`/api/v1/courses/${courseId}/modules/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reordered.map((m, i) => ({ id: m.id, position: i + 1 }))),
    })
    onChange()
  }

  function handleLessonDragEnd(event: DragEndEvent, scopeLessons: CourseLesson[]) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = scopeLessons.findIndex((l) => l.id === active.id)
    const newIdx = scopeLessons.findIndex((l) => l.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    void reorderLessons(arrayMove(scopeLessons, oldIdx, newIdx))
  }

  function handleModuleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = modules.findIndex((m) => m.id === active.id)
    const newIdx = modules.findIndex((m) => m.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    void reorderModules(arrayMove(modules, oldIdx, newIdx))
  }

  if (!useModules) {
    const sorted = [...lessons].sort((a, b) => a.position - b.position)
    return (
      <div className="space-y-4">
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={(e) => handleLessonDragEnd(e, sorted)}
        >
          <SortableContext items={sorted.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {sorted.map((l) => (
                <SortableRow key={l.id} id={l.id}>
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/intern/elearning/${courseId}/lektionen/${l.id}`}
                      className="hover:underline"
                    >
                      📄 {l.title}
                    </Link>
                    <div className="flex gap-1">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/intern/elearning/${courseId}/lektionen/${l.id}`}>
                          Bearbeiten →
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteLesson(l.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </SortableRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex gap-2 mt-4">
          <Input
            placeholder="Neue Lektion …"
            value={newLessonTitle}
            onChange={(e) => setNewLessonTitle(e.target.value)}
          />
          <Button onClick={addLesson}>
            <Plus className="h-4 w-4 mr-1" />
            Hinzufügen
          </Button>
        </div>
      </div>
    )
  }

  // useModules = true
  const sortedModules = [...modules].sort((a, b) => a.position - b.position)
  return (
    <div className="space-y-6">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
        <SortableContext
          items={sortedModules.map((m) => m.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {sortedModules.map((m) => {
              const moduleLessons = lessons
                .filter((l) => l.moduleId === m.id)
                .sort((a, b) => a.position - b.position)
              return (
                <SortableRow key={m.id} id={m.id}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        {m.title}
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => deleteModule(m.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <DndContext
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleLessonDragEnd(e, moduleLessons)}
                    >
                      <SortableContext
                        items={moduleLessons.map((l) => l.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="ml-6 space-y-1">
                          {moduleLessons.map((l) => (
                            <SortableRow key={l.id} id={l.id}>
                              <div className="flex items-center justify-between text-sm">
                                <Link
                                  href={`/intern/elearning/${courseId}/lektionen/${l.id}`}
                                  className="hover:underline"
                                >
                                  📄 {l.title}
                                </Link>
                                <Button asChild size="sm" variant="ghost">
                                  <Link
                                    href={`/intern/elearning/${courseId}/lektionen/${l.id}`}
                                  >
                                    Bearbeiten →
                                  </Link>
                                </Button>
                              </div>
                            </SortableRow>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                </SortableRow>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2">
        <Input
          placeholder="Neues Modul …"
          value={newModuleTitle}
          onChange={(e) => setNewModuleTitle(e.target.value)}
        />
        <Button onClick={addModule}>
          <Plus className="h-4 w-4 mr-1" />
          Modul
        </Button>
      </div>

      <div className="flex gap-2">
        <select
          value={newLessonModuleId ?? ''}
          onChange={(e) => setNewLessonModuleId(e.target.value || null)}
          className="border rounded px-2 py-1 text-sm bg-background"
        >
          <option value="">— Modul wählen —</option>
          {sortedModules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
        <Input
          placeholder="Neue Lektion …"
          value={newLessonTitle}
          onChange={(e) => setNewLessonTitle(e.target.value)}
        />
        <Button onClick={addLesson} disabled={!newLessonModuleId}>
          <Plus className="h-4 w-4 mr-1" />
          Lektion
        </Button>
      </div>
    </div>
  )
}
