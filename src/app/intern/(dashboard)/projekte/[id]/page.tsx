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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft, Loader2, Plus, Calendar, User, GripVertical, Save, Trash2,
  Clock, Flag, GanttChart, CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Column { id: string; name: string; color: string }
interface CheckItem { text: string; checked: boolean }
interface TaskItem {
  id: string; title: string; description: string | null; columnId: string; position: number
  priority: string | null; assigneeName?: string; startDate: string | null; dueDate: string | null
  completedAt: string | null; estimatedMinutes: number | null
  labels: string[]; checklist: CheckItem[]; comments: Array<{ text: string; createdAt: string }>
}
interface ProjectData {
  id: string; name: string; description: string | null; columns: Column[]; tasks: TaskItem[]
  companyName?: string; priority: string | null; startDate: string | null; endDate: string | null
}

const PRIORITY_COLORS: Record<string, string> = {
  kritisch: 'bg-red-500', hoch: 'bg-orange-500', mittel: 'bg-yellow-500', niedrig: 'bg-blue-400',
}

const PRIORITY_LABELS: Record<string, string> = {
  kritisch: 'Kritisch', hoch: 'Hoch', mittel: 'Mittel', niedrig: 'Niedrig',
}

function PriorityDot({ priority }: { priority: string | null }) {
  return <span className={cn('w-2 h-2 rounded-full shrink-0', PRIORITY_COLORS[priority || 'mittel'] || 'bg-gray-400')} />
}

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
      <div ref={setNodeRef} className={cn('flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px] transition-colors', isOver && 'bg-primary/5')}>
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
            <div className="flex items-center gap-1.5">
              <PriorityDot priority={task.priority} />
              <p className="text-sm font-medium leading-tight truncate">{task.title}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(task.labels || []).map((l, i) => <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{l}</Badge>)}
              {task.dueDate && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />{new Date(task.dueDate).toLocaleDateString('de-DE')}</span>}
              {task.assigneeName && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><User className="h-2.5 w-2.5" />{task.assigneeName}</span>}
              {task.estimatedMinutes && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{Math.round(task.estimatedMinutes / 60)}h</span>}
              {checkTotal > 0 && <span className="text-[10px] text-muted-foreground">{checkDone}/{checkTotal}</span>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ============================================
// Timeline View
// ============================================
function TimelineView({ tasks, columns }: { tasks: TaskItem[]; columns: Column[] }) {
  const tasksWithDates = tasks.filter(t => t.startDate || t.dueDate)
  if (tasksWithDates.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">Keine Aufgaben mit Datumsbereichen. Setzen Sie Start- und Enddatum in den Aufgabendetails.</div>
  }

  // Find date range
  const allDates = tasksWithDates.flatMap(t => [t.startDate, t.dueDate].filter(Boolean) as string[]).map(d => new Date(d).getTime())
  const minDate = new Date(Math.min(...allDates))
  const maxDate = new Date(Math.max(...allDates))
  const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)

  // Generate month headers
  const months: Array<{ label: string; startPct: number; widthPct: number }> = []
  const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
  while (cursor <= maxDate) {
    const monthStart = Math.max(0, (cursor.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    const monthEnd = Math.min(totalDays, (nextMonth.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
    months.push({
      label: cursor.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }),
      startPct: (monthStart / totalDays) * 100,
      widthPct: ((monthEnd - monthStart) / totalDays) * 100,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  const getBarStyle = (task: TaskItem) => {
    const start = task.startDate ? new Date(task.startDate) : task.dueDate ? new Date(task.dueDate) : minDate
    const end = task.dueDate ? new Date(task.dueDate) : task.startDate ? new Date(task.startDate) : maxDate
    const leftDays = (start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
    const widthDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return {
      left: `${(leftDays / totalDays) * 100}%`,
      width: `${(widthDays / totalDays) * 100}%`,
    }
  }

  const colMap = new Map((columns || []).map(c => [c.id, c]))

  return (
    <div className="space-y-1">
      {/* Month headers */}
      <div className="relative h-8 bg-muted/30 rounded">
        {months.map((m, i) => (
          <div key={i} className="absolute top-0 h-full flex items-center px-2 text-xs text-muted-foreground border-l" style={{ left: `${m.startPct}%`, width: `${m.widthPct}%` }}>
            {m.label}
          </div>
        ))}
      </div>
      {/* Task bars */}
      {tasksWithDates.map(task => {
        const col = colMap.get(task.columnId)
        return (
          <div key={task.id} className="relative h-10 flex items-center">
            <div className="w-48 shrink-0 pr-3 flex items-center gap-1.5 truncate">
              <PriorityDot priority={task.priority} />
              <span className="text-xs truncate">{task.title}</span>
            </div>
            <div className="flex-1 relative h-7">
              <div
                className="absolute h-full rounded-md flex items-center px-2 text-[10px] text-white font-medium truncate"
                style={{ ...getBarStyle(task), backgroundColor: col?.color || '#3b82f6' }}
                title={`${task.startDate ? new Date(task.startDate).toLocaleDateString('de-DE') : '?'} — ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('de-DE') : '?'}`}
              >
                {task.assigneeName || ''}
              </div>
            </div>
          </div>
        )
      })}
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
  const [newTaskColumn, setNewTaskColumn] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  // Task detail dialog
  const [detailTask, setDetailTask] = useState<TaskItem | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPriority, setEditPriority] = useState('mittel')
  const [editStartDate, setEditStartDate] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editEstimate, setEditEstimate] = useState('')
  const [editLabels, setEditLabels] = useState('')
  const [editChecklist, setEditChecklist] = useState<CheckItem[]>([])
  const [newCheckItem, setNewCheckItem] = useState('')
  const [editComment, setEditComment] = useState('')
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
    const targetColumn = (project.columns as Column[]).find(c => c.id === over.id)?.id
    if (!targetColumn || targetColumn === task.columnId) return
    setProject(prev => prev ? { ...prev, tasks: prev.tasks.map(t => t.id === taskId ? { ...t, columnId: targetColumn } : t) } : null)
    await fetch(`/api/v1/projects/${project.id}/tasks/${taskId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columnId: targetColumn }),
    })
  }

  const addTask = async () => {
    if (!newTaskTitle.trim() || !project || !newTaskColumn) return
    const res = await fetch(`/api/v1/projects/${project.id}/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTaskTitle, columnId: newTaskColumn }),
    })
    if ((await res.json()).success) { setNewTaskColumn(null); setNewTaskTitle(''); fetchProject() }
  }

  const openDetail = (task: TaskItem) => {
    setDetailTask(task)
    setEditTitle(task.title)
    setEditDesc(task.description || '')
    setEditPriority(task.priority || 'mittel')
    setEditStartDate(task.startDate ? task.startDate.split('T')[0] : '')
    setEditDueDate(task.dueDate ? task.dueDate.split('T')[0] : '')
    setEditEstimate(task.estimatedMinutes ? String(task.estimatedMinutes) : '')
    setEditLabels((task.labels || []).join(', '))
    setEditChecklist([...(task.checklist || [])])
    setEditComment('')
  }

  const saveDetail = async () => {
    if (!detailTask || !project) return
    setSaving(true)
    try {
      const comments = [...(detailTask.comments || [])]
      if (editComment.trim()) {
        comments.push({ text: editComment, createdAt: new Date().toISOString() })
      }
      const res = await fetch(`/api/v1/projects/${project.id}/tasks/${detailTask.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle, description: editDesc || null,
          priority: editPriority, startDate: editStartDate || null, dueDate: editDueDate || null,
          estimatedMinutes: editEstimate ? parseInt(editEstimate) : null,
          labels: editLabels ? editLabels.split(',').map(l => l.trim()).filter(Boolean) : [],
          checklist: editChecklist, comments,
        }),
      })
      const data = await res.json()
      if (data.success) { setDetailTask(null); fetchProject(); toast.success('Gespeichert') }
      else { toast.error('Fehler beim Speichern') }
    } catch { toast.error('Fehler') }
    finally { setSaving(false) }
  }

  const deleteTask = async () => {
    if (!detailTask || !project || !confirm('Aufgabe loeschen?')) return
    await fetch(`/api/v1/projects/${project.id}/tasks/${detailTask.id}`, { method: 'DELETE' })
    setDetailTask(null); fetchProject()
  }

  const toggleCheckItem = (index: number) => {
    setEditChecklist(prev => prev.map((item, i) => i === index ? { ...item, checked: !item.checked } : item))
  }

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return
    setEditChecklist(prev => [...prev, { text: newCheckItem, checked: false }])
    setNewCheckItem('')
  }

  const removeCheckItem = (index: number) => {
    setEditChecklist(prev => prev.filter((_, i) => i !== index))
  }

  if (loading || !project) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  const columns = (project.columns || []) as Column[]
  const completedCount = project.tasks.filter(t => t.columnId === 'done').length
  const progress = project.tasks.length > 0 ? Math.round((completedCount / project.tasks.length) * 100) : 0

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-6">
      {/* Header */}
      <div className="border-b px-6 py-3 flex items-center gap-3 shrink-0">
        <Link href="/intern/projekte"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold truncate">{project.name}</h1>
            {project.priority && <Badge className={cn('text-xs', PRIORITY_COLORS[project.priority]?.replace('bg-', 'bg-') + '/20 ' + PRIORITY_COLORS[project.priority]?.replace('bg-', 'text-'))}>{PRIORITY_LABELS[project.priority]}</Badge>}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{project.tasks.length} Aufgaben</span>
            <span>{progress}% erledigt</span>
            {project.companyName && <span>Firma: {project.companyName}</span>}
            {project.startDate && <span>Start: {new Date(project.startDate).toLocaleDateString('de-DE')}</span>}
            {project.endDate && <span>Ende: {new Date(project.endDate).toLocaleDateString('de-DE')}</span>}
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="kanban" className="flex-1 flex flex-col">
        <div className="border-b px-6">
          <TabsList className="h-10 bg-transparent p-0 gap-4">
            <TabsTrigger value="kanban" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Kanban</TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"><GanttChart className="h-4 w-4 mr-1" />Timeline</TabsTrigger>
          </TabsList>
        </div>

        {/* Kanban */}
        <TabsContent value="kanban" className="flex-1 overflow-x-auto p-4 m-0">
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 h-full">
              {columns.map(column => (
                <DroppableColumn key={column.id} column={column} tasks={project.tasks.filter(t => t.columnId === column.id)}
                  onAddTask={colId => { setNewTaskColumn(colId); setNewTaskTitle('') }} onClickTask={openDetail} />
              ))}
            </div>
            <DragOverlay>{activeTask && <div className="w-72"><DraggableCard task={activeTask} overlay /></div>}</DragOverlay>
          </DndContext>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline" className="flex-1 overflow-auto p-6 m-0">
          <TimelineView tasks={project.tasks} columns={columns} />
        </TabsContent>
      </Tabs>

      {/* New task floating input */}
      {newTaskColumn && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card border shadow-lg rounded-lg p-3 flex gap-2 z-50">
          <Input autoFocus placeholder="Neue Aufgabe..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setNewTaskColumn(null) }} className="w-64" />
          <Button size="sm" onClick={addTask} disabled={!newTaskTitle.trim()}>Hinzufuegen</Button>
          <Button size="sm" variant="ghost" onClick={() => setNewTaskColumn(null)}>Abbrechen</Button>
        </div>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={!!detailTask} onOpenChange={open => { if (!open) setDetailTask(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Aufgabe bearbeiten</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-lg font-semibold" />
            <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} placeholder="Beschreibung..." />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Prioritaet</label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kritisch"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Kritisch</span></SelectItem>
                    <SelectItem value="hoch"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" />Hoch</span></SelectItem>
                    <SelectItem value="mittel"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500" />Mittel</span></SelectItem>
                    <SelectItem value="niedrig"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" />Niedrig</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Startdatum</label>
                <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Enddatum</label>
                <Input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Schaetzung (Min)</label>
                <Input type="number" value={editEstimate} onChange={e => setEditEstimate(e.target.value)} placeholder="z.B. 120" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Labels (kommagetrennt)</label>
              <Input value={editLabels} onChange={e => setEditLabels(e.target.value)} placeholder="z.B. Frontend, Dringend" />
            </div>

            {/* Checklist */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Checkliste</label>
              <div className="space-y-1">
                {editChecklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm group">
                    <input type="checkbox" checked={item.checked} onChange={() => toggleCheckItem(i)} className="rounded" />
                    <span className={cn(item.checked && 'line-through text-muted-foreground')}>{item.text}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => removeCheckItem(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-1">
                <Input placeholder="Neuer Punkt..." value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)} className="text-sm h-8"
                  onKeyDown={e => { if (e.key === 'Enter') addCheckItem() }} />
                <Button variant="outline" size="sm" className="h-8" onClick={addCheckItem}>+</Button>
              </div>
            </div>

            {/* Comments */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Kommentar hinzufuegen</label>
              <Textarea value={editComment} onChange={e => setEditComment(e.target.value)} rows={2} placeholder="Kommentar..." />
              {detailTask?.comments && detailTask.comments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {detailTask.comments.map((c, i) => (
                    <div key={i} className="text-xs bg-muted/50 rounded p-2">
                      <span className="text-muted-foreground">{new Date(c.createdAt).toLocaleString('de-DE')}:</span> {c.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
