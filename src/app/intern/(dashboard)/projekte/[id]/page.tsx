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
  Clock, GanttChart, CheckCircle2, Settings2, Building2, List, ChevronRight, ChevronDown as ChevronDownIcon,
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
  parentTaskId: string | null; delegatedTo: string | null
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
function DroppableColumn({ column, tasks, allTasks, onAddTask, onClickTask }: {
  column: Column; tasks: TaskItem[]; allTasks: TaskItem[]; onAddTask: (colId: string) => void; onClickTask: (task: TaskItem) => void
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
        {tasks.map(task => (
          <DraggableCard
            key={task.id}
            task={task}
            subtasks={allTasks.filter(t => t.parentTaskId === task.id)}
            onClick={() => onClickTask(task)}
          />
        ))}
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
function DraggableCard({ task, subtasks, onClick, overlay }: {
  task: TaskItem; subtasks?: TaskItem[]; onClick?: () => void; overlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = overlay ? {} : { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }
  const checkDone = (task.checklist || []).filter(c => c.checked).length
  const checkTotal = (task.checklist || []).length
  const subs = subtasks || []
  const subsDone = subs.filter(s => s.columnId === 'done').length

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
              {task.delegatedTo && <Badge variant="outline" className="text-[10px] px-1 py-0">{task.delegatedTo.startsWith('agent:') ? 'KI' : 'Delegiert'}</Badge>}
            </div>
            {subs.length > 0 && (
              <div className="pt-1 border-t border-border/40 space-y-0.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground">{subsDone}/{subs.length} Unteraufgaben</span>
                  {subs.length > 0 && (
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${(subsDone / subs.length) * 100}%` }} />
                    </div>
                  )}
                </div>
                {subs.slice(0, 3).map(st => (
                  <div key={st.id} className="flex items-center gap-1.5 text-[10px]">
                    {st.columnId === 'done'
                      ? <CheckCircle2 className="h-2.5 w-2.5 text-green-500 shrink-0" />
                      : <span className="w-2.5 h-2.5 rounded-full border border-muted-foreground/40 shrink-0" />}
                    <span className={cn('truncate', st.columnId === 'done' && 'line-through text-muted-foreground')}>{st.title}</span>
                    {st.assigneeName && <span className="text-muted-foreground ml-auto shrink-0">{st.assigneeName}</span>}
                  </div>
                ))}
                {subs.length > 3 && <span className="text-[10px] text-muted-foreground">+{subs.length - 3} weitere</span>}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

// ============================================
// Task List View (hierarchical)
// ============================================
function TaskListRow({ task, subtasks, allTasks, columns, depth, onClickTask, onToggleDone }: {
  task: TaskItem; subtasks: TaskItem[]; allTasks: TaskItem[]; columns: Column[]
  depth: number; onClickTask: (t: TaskItem) => void; onToggleDone: (t: TaskItem) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const isDone = task.columnId === 'done'
  const checkDone = (task.checklist || []).filter(c => c.checked).length
  const checkTotal = (task.checklist || []).length
  const col = columns.find(c => c.id === task.columnId)

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 hover:bg-muted/50 border-b border-border/30 cursor-pointer group',
          isDone && 'opacity-60'
        )}
        style={{ paddingLeft: `${12 + depth * 24}px` }}
      >
        {/* Expand toggle */}
        <button
          className="w-4 h-4 flex items-center justify-center shrink-0"
          onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
        >
          {subtasks.length > 0 ? (
            expanded ? <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : <span className="w-3.5" />}
        </button>

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isDone}
          onChange={e => { e.stopPropagation(); onToggleDone(task) }}
          className="rounded shrink-0"
        />

        {/* Priority + Title */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={() => onClickTask(task)}>
          <PriorityDot priority={task.priority} />
          <span className={cn('text-sm font-medium truncate', isDone && 'line-through')}>{task.title}</span>
        </div>

        {/* Metadata columns */}
        <div className="flex items-center gap-3 shrink-0 text-[11px] text-muted-foreground">
          {/* Status */}
          {col && (
            <span className="flex items-center gap-1 w-20">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
              <span className="truncate">{col.name}</span>
            </span>
          )}
          {/* Assignee */}
          <span className="w-24 truncate">{task.assigneeName || '—'}</span>
          {/* Due date */}
          <span className="w-20">{task.dueDate ? new Date(task.dueDate).toLocaleDateString('de-DE') : '—'}</span>
          {/* Checklist/Subtask progress */}
          <span className="w-16 text-right">
            {subtasks.length > 0
              ? `${subtasks.filter(s => s.columnId === 'done').length}/${subtasks.length}`
              : checkTotal > 0 ? `${checkDone}/${checkTotal}` : '—'}
          </span>
        </div>
      </div>

      {/* Children */}
      {expanded && subtasks.map(st => (
        <TaskListRow
          key={st.id}
          task={st}
          subtasks={allTasks.filter(t => t.parentTaskId === st.id)}
          allTasks={allTasks}
          columns={columns}
          depth={depth + 1}
          onClickTask={onClickTask}
          onToggleDone={onToggleDone}
        />
      ))}
    </>
  )
}

function TaskListView({ tasks, columns, onClickTask, onToggleDone }: {
  tasks: TaskItem[]; columns: Column[]
  onClickTask: (t: TaskItem) => void; onToggleDone: (t: TaskItem) => void
}) {
  const rootTasks = tasks.filter(t => !t.parentTaskId)
  const parentCount = rootTasks.length
  const totalSubs = tasks.length - parentCount
  const doneCount = tasks.filter(t => t.columnId === 'done').length

  if (tasks.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">Noch keine Aufgaben vorhanden.</div>
  }

  return (
    <div className="max-w-5xl">
      {/* Summary */}
      <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground px-3">
        <span>{parentCount} Aufgaben</span>
        {totalSubs > 0 && <span>{totalSubs} Unteraufgaben</span>}
        <span>{doneCount}/{tasks.length} erledigt</span>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        <div className="flex-1" style={{ paddingLeft: '52px' }}>Aufgabe</div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="w-20">Status</span>
          <span className="w-24">Zugewiesen</span>
          <span className="w-20">Faellig</span>
          <span className="w-16 text-right">Fortschritt</span>
        </div>
      </div>

      {/* Rows */}
      <div>
        {rootTasks.map(task => (
          <TaskListRow
            key={task.id}
            task={task}
            subtasks={tasks.filter(t => t.parentTaskId === task.id)}
            allTasks={tasks}
            columns={columns}
            depth={0}
            onClickTask={onClickTask}
            onToggleDone={onToggleDone}
          />
        ))}
      </div>
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
  const [editDelegatedTo, setEditDelegatedTo] = useState('')
  const [subtasks, setSubtasks] = useState<TaskItem[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [taskStack, setTaskStack] = useState<TaskItem[]>([])

  // Project details edit (controlled form)
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([])
  const [projectSaving, setProjectSaving] = useState(false)

  // Controlled fields for Details tab — synced from project on load
  const [detailName, setDetailName] = useState('')
  const [detailDesc, setDetailDesc] = useState('')
  const [detailStatus, setDetailStatus] = useState('active')
  const [detailPriority, setDetailPriority] = useState('mittel')
  const [detailType, setDetailType] = useState('kanban')
  const [detailCompanyId, setDetailCompanyId] = useState('__none__')
  const [detailStartDate, setDetailStartDate] = useState('')
  const [detailEndDate, setDetailEndDate] = useState('')
  const [detailBudget, setDetailBudget] = useState('')
  const [detailTags, setDetailTags] = useState('')
  const [detailsDirty, setDetailsDirty] = useState(false)

  // Sync controlled fields when project loads/changes
  useEffect(() => {
    if (!project) return
    setDetailName(project.name || '')
    setDetailDesc(project.description || '')
    setDetailStatus(project.status || 'active')
    setDetailPriority(project.priority || 'mittel')
    setDetailType(project.projectType || 'kanban')
    setDetailCompanyId(project.companyId || '__none__')
    setDetailStartDate(project.startDate ? project.startDate.split('T')[0] : '')
    setDetailEndDate(project.endDate ? project.endDate.split('T')[0] : '')
    setDetailBudget(project.budget || '')
    setDetailTags((project.tags || []).join(', '))
    setDetailsDirty(false)
  }, [project])

  const markDirty = () => setDetailsDirty(true)

  const saveAllDetails = async () => {
    if (!project) return
    await saveProject({
      name: detailName,
      description: detailDesc || null,
      status: detailStatus,
      priority: detailPriority,
      projectType: detailType,
      companyId: detailCompanyId === '__none__' ? null : detailCompanyId,
      startDate: detailStartDate || null,
      endDate: detailEndDate || null,
      budget: detailBudget || null,
      tags: detailTags ? detailTags.split(',').map(t => t.trim()).filter(Boolean) : [],
    })
    setDetailsDirty(false)
  }

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

  const populateDetailForm = (task: TaskItem) => {
    setDetailTask(task)
    setEditTitle(task.title)
    setEditDesc(task.description || '')
    setEditPriority(task.priority || 'mittel')
    setEditAssignedTo(task.assignedTo || null)
    setEditDelegatedTo(task.delegatedTo || '')
    setEditStartDate(task.startDate ? task.startDate.split('T')[0] : '')
    setEditDueDate(task.dueDate ? task.dueDate.split('T')[0] : '')
    setEditEstimate(task.estimatedMinutes ? String(task.estimatedMinutes) : '')
    setEditLabels((task.labels || []).join(', '))
    setEditChecklist([...(task.checklist || [])])
    setEditComment('')
    setNewSubtaskTitle('')
    if (project) {
      setSubtasks(project.tasks.filter(t => t.parentTaskId === task.id))
    }
  }

  const openDetail = (task: TaskItem) => {
    setTaskStack([])
    populateDetailForm(task)
  }

  const openSubtaskDetail = (subtask: TaskItem) => {
    if (detailTask) {
      setTaskStack(prev => [...prev, detailTask])
    }
    populateDetailForm(subtask)
  }

  const goBackToParent = () => {
    const stack = [...taskStack]
    const parentSnapshot = stack.pop()
    if (!parentSnapshot) return
    setTaskStack(stack)
    // Use the freshest version of the parent from the project state
    const freshParent = project?.tasks.find(t => t.id === parentSnapshot.id) || parentSnapshot
    populateDetailForm(freshParent)
  }

  const addSubtask = async () => {
    if (!newSubtaskTitle.trim() || !detailTask || !project) return
    setAddingSubtask(true)
    try {
      const res = await fetch(`/api/v1/projects/${project.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSubtaskTitle,
          columnId: detailTask.columnId,
          parentTaskId: detailTask.id,
          priority: detailTask.priority || 'mittel',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setNewSubtaskTitle('')
        await fetchProject()
        // Update subtasks from refreshed project
        setSubtasks(prev => [...prev, data.data])
      }
    } catch { toast.error('Unteraufgabe erstellen fehlgeschlagen') }
    finally { setAddingSubtask(false) }
  }

  const toggleSubtaskDone = async (subtask: TaskItem) => {
    if (!project) return
    const newColumn = subtask.columnId === 'done' ? 'backlog' : 'done'
    await fetch(`/api/v1/projects/${project.id}/tasks/${subtask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columnId: newColumn }),
    })
    setSubtasks(prev => prev.map(s =>
      s.id === subtask.id ? { ...s, columnId: newColumn } : s
    ))
    fetchProject()
  }

  const deleteSubtask = async (subtaskId: string) => {
    if (!project) return
    await fetch(`/api/v1/projects/${project.id}/tasks/${subtaskId}`, { method: 'DELETE' })
    setSubtasks(prev => prev.filter(s => s.id !== subtaskId))
    fetchProject()
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
          delegatedTo: editDelegatedTo || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Gespeichert')
        await fetchProject()
        if (taskStack.length > 0) {
          goBackToParent()
        } else {
          setDetailTask(null)
        }
      }
      else { toast.error('Fehler beim Speichern') }
    } catch { toast.error('Fehler') }
    finally { setSaving(false) }
  }

  const deleteTask = async () => {
    if (!detailTask || !project) return
    const isSubtask = taskStack.length > 0
    if (!confirm(isSubtask ? 'Unteraufgabe loeschen?' : 'Aufgabe und alle Unteraufgaben loeschen?')) return
    await fetch(`/api/v1/projects/${project.id}/tasks/${detailTask.id}`, { method: 'DELETE' })
    await fetchProject()
    if (isSubtask) {
      goBackToParent()
    } else {
      setDetailTask(null)
    }
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
      <Tabs defaultValue="tasks" className="flex-1 flex flex-col">
        <div className="border-b px-6">
          <TabsList className="h-10 bg-transparent p-0 gap-4">
            <TabsTrigger value="tasks" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"><List className="h-4 w-4 mr-1" />Aufgaben</TabsTrigger>
            <TabsTrigger value="kanban" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Kanban</TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"><GanttChart className="h-4 w-4 mr-1" />Timeline</TabsTrigger>
            <TabsTrigger value="details" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"><Settings2 className="h-4 w-4 mr-1" />Details</TabsTrigger>
          </TabsList>
        </div>

        {/* Task List */}
        <TabsContent value="tasks" className="flex-1 overflow-auto p-4 m-0">
          <TaskListView
            tasks={project.tasks}
            columns={columns}
            onClickTask={openDetail}
            onToggleDone={toggleSubtaskDone}
          />
        </TabsContent>

        {/* Kanban */}
        <TabsContent value="kanban" className="flex-1 overflow-x-auto p-4 m-0">
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 h-full">
              {columns.map(column => (
                <DroppableColumn key={column.id} column={column} tasks={project.tasks.filter(t => t.columnId === column.id && !t.parentTaskId)}
                  allTasks={project.tasks} onAddTask={colId => { setNewTaskColumn(colId); setNewTaskTitle('') }} onClickTask={openDetail} />
              ))}
            </div>
            <DragOverlay>{activeTask && <div className="w-72"><DraggableCard task={activeTask} subtasks={project.tasks.filter(t => t.parentTaskId === activeTask.id)} overlay /></div>}</DragOverlay>
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
                  <Input value={detailName} onChange={e => { setDetailName(e.target.value); markDirty() }} />
                </div>
                <div className="space-y-2">
                  <Label>Beschreibung</Label>
                  <Textarea value={detailDesc} rows={3} onChange={e => { setDetailDesc(e.target.value); markDirty() }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={detailStatus} onValueChange={v => { setDetailStatus(v); markDirty() }}>
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
                    <Select value={detailPriority} onValueChange={v => { setDetailPriority(v); markDirty() }}>
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
                  <Select value={detailType} onValueChange={v => { setDetailType(v); markDirty() }}>
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
                  <Select value={detailCompanyId} onValueChange={v => { setDetailCompanyId(v); markDirty() }}>
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
                    <Input type="date" value={detailStartDate} onChange={e => { setDetailStartDate(e.target.value); markDirty() }} />
                  </div>
                  <div className="space-y-2">
                    <Label>Enddatum</Label>
                    <Input type="date" value={detailEndDate} onChange={e => { setDetailEndDate(e.target.value); markDirty() }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Budget (EUR)</Label>
                  <Input type="number" value={detailBudget} placeholder="z.B. 5000" onChange={e => { setDetailBudget(e.target.value); markDirty() }} />
                </div>
                <div className="space-y-2">
                  <Label>Tags (kommagetrennt)</Label>
                  <Input value={detailTags} placeholder="z.B. Website, Redesign" onChange={e => { setDetailTags(e.target.value); markDirty() }} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Save button (sticky at bottom) */}
          <div className="max-w-4xl mt-6 flex items-center gap-3">
            <Button onClick={saveAllDetails} disabled={!detailsDirty || projectSaving}>
              {projectSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Speichern
            </Button>
            {detailsDirty && (
              <span className="text-xs text-muted-foreground">Ungespeicherte Aenderungen</span>
            )}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            {taskStack.length > 0 && (
              <button
                onClick={goBackToParent}
                className="flex items-center gap-1 text-xs text-primary hover:underline mb-1"
              >
                <ArrowLeft className="h-3 w-3" />
                {taskStack[taskStack.length - 1].title}
              </button>
            )}
            <DialogTitle>
              {detailTask?.parentTaskId ? 'Unteraufgabe bearbeiten' : 'Aufgabe bearbeiten'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-lg font-semibold" />
            <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} placeholder="Beschreibung..." />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Schaetzung (Min)</label>
                <Input type="number" value={editEstimate} onChange={e => setEditEstimate(e.target.value)} placeholder="z.B. 120" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Startdatum</label>
                <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Enddatum</label>
                <Input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} />
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

            {/* Delegierung */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
                <User className="h-3.5 w-3.5" />Delegiert an
              </label>
              <Select value={editDelegatedTo || '__none__'} onValueChange={v => setEditDelegatedTo(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Nicht delegiert" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nicht delegiert —</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={`user:${u.id}`}>{u.name}</SelectItem>)}
                  <SelectItem value="agent:ki-research">KI-Agent: Research</SelectItem>
                  <SelectItem value="agent:ki-text">KI-Agent: Texterstellung</SelectItem>
                  <SelectItem value="agent:ki-analysis">KI-Agent: Analyse</SelectItem>
                </SelectContent>
              </Select>
              {editDelegatedTo?.startsWith('agent:') && (
                <p className="text-xs text-muted-foreground mt-1">
                  KI-Agenten-Ausfuehrung wird in einer zukuenftigen Version verfuegbar.
                </p>
              )}
            </div>

            {/* Unteraufgaben */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />Unteraufgaben ({subtasks.length})
              </label>
              {subtasks.length > 0 && (
                <div className="space-y-2 mb-2">
                  {subtasks.map(st => {
                    const stCheckDone = (st.checklist || []).filter(c => c.checked).length
                    const stCheckTotal = (st.checklist || []).length
                    const isDone = st.columnId === 'done'
                    const stSubtaskCount = project ? project.tasks.filter(t => t.parentTaskId === st.id).length : 0
                    return (
                      <div
                        key={st.id}
                        className={cn(
                          'group rounded-lg border p-3 hover:shadow-sm transition-shadow cursor-pointer',
                          isDone && 'opacity-60'
                        )}
                        onClick={() => openSubtaskDetail(st)}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={e => { e.stopPropagation(); toggleSubtaskDone(st) }}
                            onClick={e => e.stopPropagation()}
                            className="rounded mt-0.5 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            {/* Title row */}
                            <div className="flex items-center gap-1.5">
                              <PriorityDot priority={st.priority} />
                              <span className={cn('text-sm font-medium truncate', isDone && 'line-through')}>
                                {st.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                                {PRIORITY_LABELS[st.priority || 'mittel'] || 'Mittel'}
                              </span>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {st.description || 'Keine Beschreibung'}
                            </p>

                            {/* Metadata grid — always visible */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-2 text-[11px]">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <User className="h-3 w-3 shrink-0" />
                                <span className="truncate">{st.assigneeName || 'Nicht zugewiesen'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3 w-3 shrink-0" />
                                <span>{st.dueDate ? new Date(st.dueDate).toLocaleDateString('de-DE') : 'Kein Datum'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>{st.estimatedMinutes ? `${Math.round(st.estimatedMinutes / 60)}h geschaetzt` : 'Keine Schaetzung'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                <span>{stCheckTotal > 0 ? `${stCheckDone}/${stCheckTotal} Checkliste` : 'Keine Checkliste'}</span>
                              </div>
                            </div>

                            {/* Labels + badges row */}
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {(st.labels || []).map((l, i) => (
                                <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">{l}</Badge>
                              ))}
                              {st.delegatedTo && (
                                <Badge variant="outline" className="text-[10px]">
                                  {st.delegatedTo.startsWith('agent:') ? 'KI-Agent' : 'Delegiert'}
                                </Badge>
                              )}
                              {st.columnId && st.columnId !== 'backlog' && (
                                <Badge variant="outline" className="text-[10px]">
                                  {(project?.columns as Column[])?.find(c => c.id === st.columnId)?.name || st.columnId}
                                </Badge>
                              )}
                              {stSubtaskCount > 0 && (
                                <Badge variant="secondary" className="text-[10px]">{stSubtaskCount} Unter-Unteraufgaben</Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={e => { e.stopPropagation(); deleteSubtask(st.id) }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Neue Unteraufgabe..."
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  className="text-sm h-8"
                  onKeyDown={e => { if (e.key === 'Enter') addSubtask() }}
                />
                <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={addSubtask} disabled={addingSubtask || !newSubtaskTitle.trim()}>
                  {addingSubtask ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                </Button>
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
