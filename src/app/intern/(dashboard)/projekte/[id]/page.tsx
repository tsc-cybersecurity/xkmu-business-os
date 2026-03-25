'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
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
  Clock, GanttChart, CheckCircle2, Settings2, Building2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Column { id: string; name: string; color: string }
interface CheckItem { text: string; checked: boolean }
interface TaskItem {
  id: string; title: string; description: string | null; columnId: string; position: number
  priority: string | null; assignedTo: string | null; assigneeName?: string; startDate: string | null; dueDate: string | null
  completedAt: string | null; estimatedMinutes: number | null
  labels: string[]; checklist: CheckItem[]; comments: Array<{ text: string; createdAt: string }>
}
interface ProjectData {
  id: string; name: string; description: string | null; columns: Column[]; tasks: TaskItem[]
  companyId: string | null; companyName?: string; ownerId: string | null
  status: string | null; projectType: string | null; priority: string | null
  startDate: string | null; endDate: string | null; budget: string | null
  color: string | null; tags: string[]
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
function TimelineView({ tasks, columns, onClickTask }: { tasks: TaskItem[]; columns: Column[]; onClickTask: (task: TaskItem) => void }) {
  const tasksWithDates = tasks.filter(t => t.startDate || t.dueDate)
  if (tasksWithDates.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">Keine Aufgaben mit Datumsbereichen. Setzen Sie Start- und Enddatum in den Aufgabendetails.</div>
  }

  // Find date range
  const allDates = tasksWithDates.flatMap(t => [t.startDate, t.dueDate].filter(Boolean) as string[]).map(d => new Date(d).getTime())
  const minDate = new Date(Math.min(...allDates))
  const maxDate = new Date(Math.max(...allDates))
  const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)

  // Generate day columns
  const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  const days: Array<{ day: string; weekday: string; isWeekend: boolean; monthLabel?: string }> = []
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate() + i)
    days.push({
      day: String(d.getDate()).padStart(2, '0'),
      weekday: WEEKDAYS[d.getDay()],
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      monthLabel: d.getDate() === 1 || i === 0 ? d.toLocaleDateString('de-DE', { month: 'short' }) : undefined,
    })
  }
  const dayWidth = Math.max(24, Math.min(36, 800 / totalDays))

  const colMap = new Map((columns || []).map(c => [c.id, c]))

  const gridWidth = days.length * dayWidth

  const getBarPx = (task: TaskItem) => {
    const start = task.startDate ? new Date(task.startDate) : task.dueDate ? new Date(task.dueDate) : minDate
    const end = task.dueDate ? new Date(task.dueDate) : task.startDate ? new Date(task.startDate) : maxDate
    const leftDays = (start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
    const widthDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return { left: leftDays * dayWidth, width: widthDays * dayWidth }
  }

  return (
    <div className="flex">
      {/* Task names */}
      <div className="w-48 shrink-0 pt-[52px]">
        {tasksWithDates.map(task => (
          <div key={task.id} className="h-9 flex items-center gap-1.5 pr-3 truncate cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1" onClick={() => onClickTask(task)}>
            <PriorityDot priority={task.priority} />
            <span className="text-xs truncate">{task.title}</span>
          </div>
        ))}
      </div>
      {/* Timeline grid */}
      <div className="flex-1 overflow-x-auto">
        <div style={{ width: gridWidth, minWidth: '100%' }}>
          {/* Month row */}
          <div className="flex">
            {days.map((d, i) => (
              <div key={i} style={{ width: dayWidth }} className="shrink-0 text-center h-4">
                {d.monthLabel && <span className="text-[9px] text-muted-foreground font-medium">{d.monthLabel}</span>}
              </div>
            ))}
          </div>
          {/* Day + weekday rows */}
          <div className="flex border-b">
            {days.map((d, i) => (
              <div key={i} style={{ width: dayWidth }} className={cn('shrink-0 text-center border-r border-border/40 py-0.5', d.isWeekend && 'bg-muted/40')}>
                <div className="text-[10px] font-medium leading-tight">{d.day}</div>
                <div className={cn('text-[9px] leading-tight', d.isWeekend ? 'text-muted-foreground/60' : 'text-muted-foreground')}>{d.weekday}</div>
              </div>
            ))}
          </div>
          {/* Task bars */}
          {tasksWithDates.map(task => {
            const col = colMap.get(task.columnId)
            const bar = getBarPx(task)
            return (
              <div key={task.id} className="relative h-9 flex items-center">
                {/* Weekend stripes */}
                {days.map((d, i) => d.isWeekend && (
                  <div key={i} className="absolute top-0 h-full bg-muted/20" style={{ left: i * dayWidth, width: dayWidth }} />
                ))}
                <div
                  className="absolute h-6 rounded flex items-center px-1.5 text-[10px] text-white font-medium truncate shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ left: bar.left, width: bar.width, backgroundColor: col?.color || '#3b82f6' }}
                  title={`${task.startDate ? new Date(task.startDate).toLocaleDateString('de-DE') : '?'} — ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('de-DE') : '?'}`}
                  onClick={() => onClickTask(task)}
                >
                  {task.assigneeName || ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>
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

  const [editAssignedTo, setEditAssignedTo] = useState<string | null>(null)

  // Project details edit
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([])
  const [projectSaving, setProjectSaving] = useState(false)

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

  useEffect(() => {
    fetch('/api/v1/companies?limit=200').then(r => r.json()).then(d => {
      if (d.success) setCompanies((d.data || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
    }).catch(() => {})
    fetch('/api/v1/users').then(r => r.json()).then(d => {
      if (d.success) setUsers((d.data || []).map((u: { id: string; firstName?: string; lastName?: string; email: string }) => ({
        id: u.id, name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
      })))
    }).catch(() => {})
  }, [])

  const saveProject = async (updates: Record<string, unknown>) => {
    if (!project) return
    setProjectSaving(true)
    try {
      const res = await fetch(`/api/v1/projects/${project.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (data.success) { fetchProject(); toast.success('Projekt aktualisiert') }
      else toast.error('Fehler beim Speichern')
    } catch { toast.error('Fehler') }
    finally { setProjectSaving(false) }
  }

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
    setEditAssignedTo(task.assignedTo || null)
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
          priority: editPriority, assignedTo: editAssignedTo || null,
          startDate: editStartDate || null, dueDate: editDueDate || null,
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
            <TabsTrigger value="details" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"><Settings2 className="h-4 w-4 mr-1" />Details</TabsTrigger>
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
          <TimelineView tasks={project.tasks} columns={columns} onClickTask={openDetail} />
        </TabsContent>

        {/* Details */}
        <TabsContent value="details" className="flex-1 overflow-auto p-6 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
            <Card>
              <CardHeader><CardTitle>Projektinformationen</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input defaultValue={project.name} onBlur={e => { if (e.target.value !== project.name) saveProject({ name: e.target.value }) }} />
                </div>
                <div className="space-y-2">
                  <Label>Beschreibung</Label>
                  <Textarea defaultValue={project.description || ''} rows={3} onBlur={e => { if (e.target.value !== (project.description || '')) saveProject({ description: e.target.value || null }) }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={project.status || 'active'} onValueChange={v => saveProject({ status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Aktiv</SelectItem>
                        <SelectItem value="on_hold">Pausiert</SelectItem>
                        <SelectItem value="completed">Abgeschlossen</SelectItem>
                        <SelectItem value="archived">Archiviert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioritaet</Label>
                    <Select value={project.priority || 'mittel'} onValueChange={v => saveProject({ priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kritisch">Kritisch</SelectItem>
                        <SelectItem value="hoch">Hoch</SelectItem>
                        <SelectItem value="mittel">Mittel</SelectItem>
                        <SelectItem value="niedrig">Niedrig</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Projekttyp</Label>
                  <Select value={project.projectType || 'kanban'} onValueChange={v => saveProject({ projectType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kanban">Kanban</SelectItem>
                      <SelectItem value="okr">OKR / Ziele</SelectItem>
                      <SelectItem value="content">Content-Planung</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Zuordnung &amp; Zeitraum</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Firma</Label>
                  <Select value={project.companyId || '__none__'} onValueChange={v => saveProject({ companyId: v === '__none__' ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Keine Firma zugeordnet" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Keine Firma —</SelectItem>
                      {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Startdatum</Label>
                    <Input type="date" defaultValue={project.startDate ? project.startDate.split('T')[0] : ''} onBlur={e => saveProject({ startDate: e.target.value || null })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Enddatum</Label>
                    <Input type="date" defaultValue={project.endDate ? project.endDate.split('T')[0] : ''} onBlur={e => saveProject({ endDate: e.target.value || null })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Budget (EUR)</Label>
                  <Input type="number" defaultValue={project.budget || ''} placeholder="z.B. 5000" onBlur={e => saveProject({ budget: e.target.value || null })} />
                </div>
                <div className="space-y-2">
                  <Label>Tags (kommagetrennt)</Label>
                  <Input defaultValue={(project.tags || []).join(', ')} placeholder="z.B. Website, Redesign" onBlur={e => saveProject({ tags: e.target.value ? e.target.value.split(',').map(t => t.trim()).filter(Boolean) : [] })} />
                </div>
                {projectSaving && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Speichern...</div>}
              </CardContent>
            </Card>
          </div>
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

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Zugewiesen an</label>
                <Select value={editAssignedTo || '__none__'} onValueChange={v => setEditAssignedTo(v === '__none__' ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Niemand" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Niemand —</SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
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
