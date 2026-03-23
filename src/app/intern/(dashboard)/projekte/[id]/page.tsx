'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeft, Loader2, Plus, Calendar, User, GripVertical } from 'lucide-react'
import { toast } from 'sonner'

interface Column { id: string; name: string; color: string }
interface TaskItem {
  id: string; title: string; description: string | null; columnId: string; position: number
  assigneeName?: string; dueDate: string | null; labels: string[]; checklist: Array<{ text: string; checked: boolean }>
}
interface ProjectData { id: string; name: string; description: string | null; columns: Column[]; tasks: TaskItem[] }

function TaskCard({ task, overlay }: { task: TaskItem; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = overlay ? {} : { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }
  const checkDone = task.checklist?.filter(c => c.checked).length || 0
  const checkTotal = task.checklist?.length || 0

  return (
    <div ref={overlay ? undefined : setNodeRef} style={style} {...(overlay ? {} : attributes)}>
      <Card className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
        <div className="flex items-start gap-2">
          <div {...(overlay ? {} : listeners)} className="mt-1 text-muted-foreground"><GripVertical className="h-3.5 w-3.5" /></div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-sm font-medium leading-tight">{task.title}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {task.labels?.map((l, i) => <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{l}</Badge>)}
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
              {checkTotal > 0 && (
                <span className="text-[10px] text-muted-foreground">{checkDone}/{checkTotal}</span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default function ProjectBoardPage() {
  const params = useParams()
  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null)
  const [newTaskColumn, setNewTaskColumn] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/projects/${params.id}`)
      const data = await response.json()
      if (data.success) setProject(data.data)
    } catch {
      toast.error('Projekt konnte nicht geladen werden')
    } finally {
      setLoading(false)
    }
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
    // Determine target column — over.id could be a task or a column droppable
    let targetColumn = project.columns.find(c => c.id === over.id)?.id
    if (!targetColumn) {
      const overTask = project.tasks.find(t => t.id === over.id)
      targetColumn = overTask?.columnId
    }
    if (!targetColumn) return

    const task = project.tasks.find(t => t.id === taskId)
    if (!task || task.columnId === targetColumn) return

    // Optimistic update
    setProject(prev => prev ? {
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, columnId: targetColumn! } : t),
    } : null)

    // Save to DB
    await fetch(`/api/v1/projects/${project.id}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columnId: targetColumn }),
    })
  }

  const addTask = async (columnId: string) => {
    if (!newTaskTitle.trim() || !project) return
    const response = await fetch(`/api/v1/projects/${project.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTaskTitle, columnId }),
    })
    const data = await response.json()
    if (data.success) {
      setNewTaskColumn(null)
      setNewTaskTitle('')
      fetchProject()
    }
  }

  if (loading || !project) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  const columns = (project.columns || []) as Column[]

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-6">
      {/* Header */}
      <div className="border-b px-6 py-3 flex items-center gap-3 shrink-0">
        <Link href="/intern/projekte"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-xl font-bold">{project.name}</h1>
        <span className="text-sm text-muted-foreground">{project.tasks.length} Aufgaben</span>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full min-w-max">
            {columns.map(column => {
              const columnTasks = project.tasks.filter(t => t.columnId === column.id)
              return (
                <div key={column.id} className="w-72 flex flex-col bg-muted/30 rounded-lg">
                  {/* Column Header */}
                  <div className="px-3 py-2 flex items-center gap-2 border-b">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: column.color }} />
                    <span className="font-semibold text-sm">{column.name}</span>
                    <Badge variant="secondary" className="text-xs ml-auto">{columnTasks.length}</Badge>
                  </div>

                  {/* Tasks */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2" id={column.id}>
                    <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy} id={column.id}>
                      {columnTasks.map(task => <TaskCard key={task.id} task={task} />)}
                    </SortableContext>

                    {/* Add Task */}
                    {newTaskColumn === column.id ? (
                      <div className="space-y-1">
                        <Input
                          autoFocus
                          placeholder="Aufgabe..."
                          value={newTaskTitle}
                          onChange={e => setNewTaskTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') addTask(column.id)
                            if (e.key === 'Escape') { setNewTaskColumn(null); setNewTaskTitle('') }
                          }}
                          className="text-sm h-8"
                        />
                        <div className="flex gap-1">
                          <Button size="sm" className="h-7 text-xs" onClick={() => addTask(column.id)}>Hinzufuegen</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setNewTaskColumn(null); setNewTaskTitle('') }}>Abbrechen</Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground h-7" onClick={() => setNewTaskColumn(column.id)}>
                        <Plus className="h-3 w-3 mr-1" />Aufgabe
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <DragOverlay>
            {activeTask && <div className="w-72"><TaskCard task={activeTask} overlay /></div>}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
