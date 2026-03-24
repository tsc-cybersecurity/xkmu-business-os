'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeft, Loader2, Plus, Calendar, User, GripVertical, Save } from 'lucide-react'
import { toast } from 'sonner'

interface Column { id: string; name: string; color: string }
interface CheckItem { text: string; checked: boolean }
interface TaskItem {
  id: string; title: string; description: string | null; columnId: string; position: number
  assigneeName?: string; dueDate: string | null; labels: string[]; checklist: CheckItem[]
}
interface ProjectData { id: string; name: string; description: string | null; columns: Column[]; tasks: TaskItem[] }

// ============================================
// Droppable Column
// ============================================
function DroppableColumn({ column, tasks, onAddTask, onClickTask }: {
  column: Column; tasks: TaskItem[]; onAddTask: (colId: string) => void; onClickTask: (task: TaskItem) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className="w-72 flex flex-col bg-muted/30 rounded-lg shrink-0">
      <div className="px-3 py-2 flex items-center gap-2 border-b">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: column.color }} />
        <span className="font-semibold text-sm">{column.name}</span>
        <Badge variant="secondary" className="text-xs ml-auto">{tasks.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px] transition-colors ${isOver ? 'bg-primary/5' : ''}`}
      >
        {tasks.map(task => <DraggableCard key={task.id} task={task} onClick={() => onClickTask(task)} />)}
        <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground h-7" onClick={() => onAddTask(column.id)}>
          <Plus className="h-3 w-3 mr-1" />Aufgabe
        </Button>
      </div>
    </div>
  )
}

// ============================================
// Draggable Task Card
// ============================================
function DraggableCard({ task, onClick, overlay }: { task: TaskItem; onClick?: () => void; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = overlay ? {} : { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }
  const checkDone = (task.checklist || []).filter(c => c.checked).length
  const checkTotal = (task.checklist || []).length

  return (
    <div ref={overlay ? undefined : setNodeRef} style={style} {...(overlay ? {} : attributes)}>
      <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={overlay ? undefined : onClick}>
        <div className="flex items-start gap-2">
          <div {...(overlay ? {} : listeners)} className="mt-1 text-muted-foreground cursor-grab" onClick={e => e.stopPropagation()}>
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-sm font-medium leading-tight">{task.title}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {(task.labels || []).map((l, i) => <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{l}</Badge>)}
              {task.dueDate && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Calendar className="h-2.5 w-2.5" />{new Date(task.dueDate).toLocaleDateString('de-DE')}
                </span>
              )}
              {task.assigneeName && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <User className="h-2.5 w-2.5" />{task.assigneeName}
                </span>
              )}
              {checkTotal > 0 && <span className="text-[10px] text-muted-foreground">{checkDone}/{checkTotal}</span>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ============================================
// Main Page
// ============================================
export default function ProjectBoardPage() {
  const params = useParams()
  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null)

  // New task
  const [newTaskColumn, setNewTaskColumn] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  // Task detail dialog
  const [detailTask, setDetailTask] = useState<TaskItem | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editLabels, setEditLabels] = useState('')
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/projects/${params.id}`)
      const data = await response.json()
      if (data.success) setProject(data.data)
    } catch { toast.error('Projekt konnte nicht geladen werden') }
    finally { setLoading(false) }
  }, [params.id])

  useEffect(() => { fetchProject() }, [fetchProject])

  const handleDragStart = (event: DragStartEvent) => {
    const task = project?.tasks.find(t => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over || !project) return

    const taskId = active.id as string
    const task = project.tasks.find(t => t.id === taskId)
    if (!task) return

    // over.id is always a column id (from useDroppable)
    const targetColumn = (project.columns as Column[]).find(c => c.id === over.id)?.id
    if (!targetColumn || targetColumn === task.columnId) return

    // Optimistic update
    setProject(prev => prev ? {
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, columnId: targetColumn } : t),
    } : null)

    await fetch(`/api/v1/projects/${project.id}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columnId: targetColumn }),
    })
  }

  const addTask = async () => {
    if (!newTaskTitle.trim() || !project || !newTaskColumn) return
    const response = await fetch(`/api/v1/projects/${project.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTaskTitle, columnId: newTaskColumn }),
    })
    const data = await response.json()
    if (data.success) {
      setNewTaskColumn(null)
      setNewTaskTitle('')
      fetchProject()
    }
  }

  const openDetail = (task: TaskItem) => {
    setDetailTask(task)
    setEditTitle(task.title)
    setEditDesc(task.description || '')
    setEditDueDate(task.dueDate ? task.dueDate.split('T')[0] : '')
    setEditLabels((task.labels || []).join(', '))
  }

  const saveDetail = async () => {
    if (!detailTask || !project) return
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/projects/${project.id}/tasks/${detailTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDesc || undefined,
          dueDate: editDueDate || null,
          labels: editLabels ? editLabels.split(',').map(l => l.trim()).filter(Boolean) : [],
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDetailTask(null)
        fetchProject()
        toast.success('Aufgabe gespeichert')
      }
    } catch { toast.error('Fehler') }
    finally { setSaving(false) }
  }

  const deleteTask = async () => {
    if (!detailTask || !project) return
    if (!confirm('Aufgabe loeschen?')) return
    await fetch(`/api/v1/projects/${project.id}/tasks/${detailTask.id}`, { method: 'DELETE' })
    setDetailTask(null)
    fetchProject()
  }

  const handleAddTask = (colId: string) => {
    setNewTaskColumn(colId)
    setNewTaskTitle('')
  }

  if (loading || !project) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  const columns = (project.columns || []) as Column[]

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-6">
      <div className="border-b px-6 py-3 flex items-center gap-3 shrink-0">
        <Link href="/intern/projekte"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-xl font-bold">{project.name}</h1>
        <span className="text-sm text-muted-foreground">{project.tasks.length} Aufgaben</span>
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full">
            {columns.map(column => {
              const columnTasks = project.tasks.filter(t => t.columnId === column.id)
              return (
                <DroppableColumn
                  key={column.id}
                  column={column}
                  tasks={columnTasks}
                  onAddTask={handleAddTask}
                  onClickTask={openDetail}
                />
              )
            })}
          </div>
          <DragOverlay>{activeTask && <div className="w-72"><DraggableCard task={activeTask} overlay /></div>}</DragOverlay>
        </DndContext>
      </div>

      {/* Inline new task input */}
      {newTaskColumn && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card border shadow-lg rounded-lg p-3 flex gap-2 z-50">
          <Input
            autoFocus
            placeholder="Neue Aufgabe..."
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') addTask()
              if (e.key === 'Escape') setNewTaskColumn(null)
            }}
            className="w-64"
          />
          <Button size="sm" onClick={addTask} disabled={!newTaskTitle.trim()}>Hinzufuegen</Button>
          <Button size="sm" variant="ghost" onClick={() => setNewTaskColumn(null)}>Abbrechen</Button>
        </div>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={!!detailTask} onOpenChange={open => { if (!open) setDetailTask(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Aufgabe bearbeiten</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Titel</label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Beschreibung</label>
              <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Faelligkeitsdatum</label>
                <Input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Labels (kommagetrennt)</label>
                <Input value={editLabels} onChange={e => setEditLabels(e.target.value)} placeholder="z.B. Blog, Wichtig" />
              </div>
            </div>
            {detailTask && detailTask.checklist && detailTask.checklist.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1 block">Checkliste</label>
                <div className="space-y-1">
                  {detailTask.checklist.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={item.checked} readOnly className="rounded" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" size="sm" onClick={deleteTask}>Loeschen</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDetailTask(null)}>Abbrechen</Button>
              <Button onClick={saveDetail} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}Speichern
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
