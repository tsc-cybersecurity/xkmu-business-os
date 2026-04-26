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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/shared/empty-state'
import { GripVertical, Plus, Trash2, FolderOpen, FileText, ListTree } from 'lucide-react'
import { toast } from 'sonner'
import type { CourseModule, CourseLesson } from './CourseEditView'

interface Props {
  courseId: string
  useModules: boolean
  modules: CourseModule[]
  lessons: CourseLesson[]
  onChange: () => void
}

const NO_MODULE = '__none__'

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 rounded-md border p-2 bg-background"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="Verschieben"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function LessonRow({
  courseId,
  lesson,
  onDelete,
}: {
  courseId: string
  lesson: CourseLesson
  onDelete: (id: string, title: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <Link
        href={`/intern/elearning/${courseId}/lektionen/${lesson.id}`}
        className="flex items-center gap-2 hover:underline"
      >
        <FileText className="h-4 w-4 text-muted-foreground" />
        {lesson.title}
      </Link>
      <div className="flex gap-1">
        <Button asChild size="sm" variant="ghost">
          <Link href={`/intern/elearning/${courseId}/lektionen/${lesson.id}`}>Bearbeiten →</Link>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Löschen"
          title="Löschen"
          onClick={() => onDelete(lesson.id, lesson.title)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
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
    const res = await fetch(`/api/v1/courses/${courseId}/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newModuleTitle }),
    })
    const body = await res.json()
    if (body.success) {
      toast.success('Modul angelegt')
      setNewModuleTitle('')
      onChange()
    } else {
      toast.error(body.error?.message ?? 'Anlegen fehlgeschlagen')
    }
  }

  async function addLesson() {
    if (!newLessonTitle) return
    const res = await fetch(`/api/v1/courses/${courseId}/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newLessonTitle, moduleId: newLessonModuleId }),
    })
    const body = await res.json()
    if (body.success) {
      toast.success('Lektion angelegt')
      setNewLessonTitle('')
      onChange()
    } else {
      toast.error(body.error?.message ?? 'Anlegen fehlgeschlagen')
    }
  }

  async function deleteLesson(id: string, title: string) {
    if (!confirm(`Lektion „${title}" löschen?`)) return
    await fetch(`/api/v1/courses/${courseId}/lessons/${id}`, { method: 'DELETE' })
    toast.success('Lektion gelöscht')
    onChange()
  }

  async function deleteModule(id: string, title: string) {
    if (!confirm(`Modul „${title}" löschen? Enthaltene Lektionen werden modul-los.`)) return
    await fetch(`/api/v1/courses/${courseId}/modules/${id}`, { method: 'DELETE' })
    toast.success('Modul gelöscht')
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
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Lektionen</CardTitle>
          </CardHeader>
          <CardContent>
            {sorted.length === 0 ? (
              <EmptyState
                icon={ListTree}
                title="Noch keine Lektionen"
                description="Lege unten die erste Lektion an. Drag &amp; Drop zum Umsortieren."
              />
            ) : (
              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleLessonDragEnd(e, sorted)}
              >
                <SortableContext items={sorted.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {sorted.map((l) => (
                      <SortableRow key={l.id} id={l.id}>
                        <LessonRow courseId={courseId} lesson={l} onDelete={deleteLesson} />
                      </SortableRow>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lektion hinzufügen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 max-w-2xl">
              <Input
                placeholder="Titel der neuen Lektion…"
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
              />
              <Button onClick={addLesson} disabled={!newLessonTitle}>
                <Plus className="mr-2 h-4 w-4" />
                Hinzufügen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // useModules = true
  const sortedModules = [...modules].sort((a, b) => a.position - b.position)
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Module &amp; Lektionen</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedModules.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="Noch keine Module"
              description="Lege unten ein Modul an, dann kannst du Lektionen darin organisieren."
            />
          ) : (
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
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold flex items-center gap-2">
                              <FolderOpen className="h-4 w-4" />
                              {m.title}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Modul löschen"
                              title="Modul löschen"
                              onClick={() => deleteModule(m.id, m.title)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          {moduleLessons.length === 0 ? (
                            <p className="ml-6 text-xs text-muted-foreground">
                              Noch keine Lektionen in diesem Modul.
                            </p>
                          ) : (
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
                                      <LessonRow
                                        courseId={courseId}
                                        lesson={l}
                                        onDelete={deleteLesson}
                                      />
                                    </SortableRow>
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          )}
                        </div>
                      </SortableRow>
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Modul hinzufügen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Modul-Titel…"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
              />
              <Button onClick={addModule} disabled={!newModuleTitle}>
                <Plus className="mr-2 h-4 w-4" />
                Modul
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lektion hinzufügen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Select
              value={newLessonModuleId ?? NO_MODULE}
              onValueChange={(v) => setNewLessonModuleId(v === NO_MODULE ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="— Modul wählen —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_MODULE}>— Kein Modul —</SelectItem>
                {sortedModules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                placeholder="Titel der neuen Lektion…"
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
              />
              <Button onClick={addLesson} disabled={!newLessonTitle || !newLessonModuleId}>
                <Plus className="mr-2 h-4 w-4" />
                Lektion
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
