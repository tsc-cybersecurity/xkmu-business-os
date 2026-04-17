'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  BookOpen,
  Loader2,
  Upload,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  ChevronRight,
  Clock,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  ListChecks,
  FileOutput,
  ClipboardList,
  Monitor,
  CircleDot,
  Code2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ============================================
// Types
// ============================================

interface Step {
  nr: number | string
  action: string
  tool?: string
  hint?: string
}

interface ProcessTask {
  id: string
  taskKey: string
  subprocess: string | null
  title: string
  purpose: string | null
  trigger: string | null
  timeEstimate: string | null
  automationPotential: string | null
  tools: string[]
  prerequisites: string[]
  steps: Step[]
  checklist: string[]
  expectedOutput: string | null
  errorEscalation: string | null
  solution: string | null
  appStatus: string | null
  appNotes: string | null
  appModule: string | null
}

interface ProcessArea {
  id: string
  key: string
  name: string
  description: string | null
  taskCount: number
}

interface ProcessWithTasks extends ProcessArea {
  tasks: ProcessTask[]
}

// ============================================
// Constants
// ============================================

const KEY_COLORS: Record<string, string> = {
  KP1: 'bg-blue-500',
  KP2: 'bg-green-500',
  KP3: 'bg-purple-500',
  KP4: 'bg-orange-500',
  KP5: 'bg-pink-500',
  KP6: 'bg-cyan-500',
  KP7: 'bg-red-500',
  MP: 'bg-amber-500',
  UP: 'bg-slate-500',
}

function potentialColor(p: string | null) {
  switch (p) {
    case 'Hoch': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'Mittel': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'Niedrig': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    default: return 'bg-gray-100 text-gray-800'
  }
}

// ============================================
// Task Detail Component
// ============================================

function AppStatusBadge({ status }: { status: string | null }) {
  switch (status) {
    case 'full': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs"><Monitor className="h-3 w-3 mr-1" />In App</Badge>
    case 'partial': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs"><CircleDot className="h-3 w-3 mr-1" />Teilweise</Badge>
    case 'none': return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">Fehlt</Badge>
    default: return null
  }
}

function TaskDetail({ task }: { task: ProcessTask }) {
  return (
    <div className="space-y-4 pt-2 pl-2">
      {/* App-Abdeckung */}
      {task.appStatus && task.appStatus !== 'none' && task.appNotes && (
        <div className="bg-green-50 dark:bg-green-950/30 rounded-md p-3">
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-1 text-green-700 dark:text-green-400">
            <Monitor className="h-4 w-4" />
            In der App verfuegbar {task.appModule && <span className="font-normal">({task.appModule})</span>}
          </h4>
          <p className="text-sm text-green-700 dark:text-green-300">{task.appNotes}</p>
        </div>
      )}
      {task.appStatus === 'none' && task.appNotes && (
        <div className="bg-red-50 dark:bg-red-950/30 rounded-md p-3">
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-1 text-red-700 dark:text-red-400">
            <CircleDot className="h-4 w-4" />
            Noch nicht in der App
          </h4>
          <p className="text-sm text-red-700 dark:text-red-300">{task.appNotes}</p>
        </div>
      )}

      {task.purpose && (
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-blue-500" />
            Zweck
          </h4>
          <p className="text-sm text-muted-foreground">{task.purpose}</p>
        </div>
      )}

      {task.trigger && (
        <div>
          <h4 className="text-sm font-semibold mb-1">Ausloeser</h4>
          <p className="text-sm text-muted-foreground">{task.trigger}</p>
        </div>
      )}

      {Array.isArray(task.tools) && task.tools.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-1">
            <Wrench className="h-4 w-4 text-gray-500" />
            Tools
          </h4>
          <div className="flex flex-wrap gap-1">
            {task.tools.map((tool, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{tool}</Badge>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(task.prerequisites) && task.prerequisites.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-1">Vorbedingungen</h4>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
            {task.prerequisites.map((pre, i) => (
              <li key={i}>{pre}</li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(task.steps) && task.steps.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <ListChecks className="h-4 w-4 text-purple-500" />
            Schritte
          </h4>
          <div className="space-y-2">
            {task.steps.map((step, i) => (
              <div key={i} className="flex gap-3 text-sm border-l-2 border-muted pl-3 py-1">
                <span className="font-mono font-bold text-muted-foreground shrink-0 w-6">
                  {step.nr}.
                </span>
                <div className="space-y-1">
                  <p>{step.action}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {step.tool && (
                      <span className="flex items-center gap-1">
                        <Wrench className="h-3 w-3" /> {step.tool}
                      </span>
                    )}
                    {step.hint && (
                      <span className="italic">Tipp: {step.hint}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(task.checklist) && task.checklist.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Erfolgskontrolle
          </h4>
          <ul className="text-sm text-muted-foreground space-y-0.5">
            {task.checklist.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {task.expectedOutput && (
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-1">
            <FileOutput className="h-4 w-4 text-teal-500" />
            Erwartetes Ergebnis
          </h4>
          <p className="text-sm text-muted-foreground">{task.expectedOutput}</p>
        </div>
      )}

      {task.errorEscalation && (
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-md p-3">
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-1 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Fehlerfall / Eskalation
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-300">{task.errorEscalation}</p>
        </div>
      )}

      {task.solution && (
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-md p-3">
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-1 text-blue-700 dark:text-blue-400">
            <Zap className="h-4 w-4" />
            KI-Ansatz / Loesung
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300">{task.solution}</p>
        </div>
      )}
    </div>
  )
}

// ============================================
// Main Page
// ============================================

export default function ProzessePage() {
  const [processes, setProcesses] = useState<ProcessArea[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)

  // Navigation state
  const [expandedProcesses, setExpandedProcesses] = useState<Set<string>>(new Set())
  const [expandedSubprocesses, setExpandedSubprocesses] = useState<Set<string>>(new Set())
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // Content state
  const [processDetail, setProcessDetail] = useState<ProcessWithTasks | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const fetchProcesses = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/processes')
      const data = await response.json()
      if (data.success) {
        setProcesses(data.data)
        // Auto-select first process
        if (data.data.length > 0 && !selectedProcessId) {
          const first = data.data[0]
          setSelectedProcessId(first.id)
          setExpandedProcesses(new Set([first.id]))
        }
      }
    } catch {
      toast.error('Prozesse konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchProcessDetail = useCallback(async (processId: string) => {
    setLoadingDetail(true)
    try {
      const response = await fetch(`/api/v1/processes/${processId}`)
      const data = await response.json()
      if (data.success) {
        setProcessDetail(data.data)
      }
    } catch {
      toast.error('Prozess-Details konnten nicht geladen werden')
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    fetchProcesses()
  }, [fetchProcesses])

  useEffect(() => {
    if (selectedProcessId) {
      fetchProcessDetail(selectedProcessId)
    }
  }, [selectedProcessId, fetchProcessDetail])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const response = await fetch('/api/v1/processes/seed', { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        toast.success(`${data.data.processCount} Prozesse und ${data.data.taskCount} Aufgaben importiert`)
        fetchProcesses()
      } else {
        toast.error(data.error?.message || 'Import fehlgeschlagen')
      }
    } catch {
      toast.error('Import fehlgeschlagen')
    } finally {
      setSeeding(false)
    }
  }

  const toggleProcess = (processId: string) => {
    setExpandedProcesses(prev => {
      const next = new Set(prev)
      if (next.has(processId)) {
        next.delete(processId)
      } else {
        next.add(processId)
      }
      return next
    })
    setSelectedProcessId(processId)
    setSelectedTaskId(null)
  }

  const toggleSubprocess = (key: string) => {
    setExpandedSubprocesses(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const selectTask = (processId: string, taskId: string) => {
    setSelectedProcessId(processId)
    setSelectedTaskId(taskId)
  }

  // Group tasks by subprocess for sidebar
  const groupedTasks = new Map<string, ProcessTask[]>()
  if (processDetail) {
    for (const task of processDetail.tasks) {
      const key = task.subprocess || 'Sonstige'
      if (!groupedTasks.has(key)) groupedTasks.set(key, [])
      groupedTasks.get(key)!.push(task)
    }
  }

  const selectedTask = processDetail?.tasks.find(t => t.id === selectedTaskId) || null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (processes.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BookOpen className="h-8 w-8" />
            Prozesshandbuch
          </h1>
          <p className="text-muted-foreground mt-1">Standard Operating Procedures</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">Noch keine Prozesse vorhanden</p>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Klicken Sie auf &quot;SOP-Daten importieren&quot; um die Prozessdokumentation zu laden.
            </p>
            <Button onClick={handleSeed} disabled={seeding}>
              {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              SOP-Daten importieren
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalTasks = processes.reduce((sum, p) => sum + p.taskCount, 0)

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-card border-r flex flex-col shrink-0">
          {/* Sidebar Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Prozesshandbuch
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSidebar(false)}>
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {processes.length} Prozesse, {totalTasks} Aufgaben
            </p>
          </div>

          {/* Process Tree */}
          <div className="flex-1 overflow-y-auto">
            {processes.map((process) => (
              <div key={process.id}>
                {/* Process Area */}
                <button
                  onClick={() => toggleProcess(process.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors',
                    selectedProcessId === process.id && !selectedTaskId && 'bg-accent')}
                >
                  {expandedProcesses.has(process.id)
                    ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  }
                  <span className={cn('w-2 h-2 rounded-full shrink-0', KEY_COLORS[process.key] || 'bg-gray-400')} />
                  <span className="font-medium truncate">{process.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">{process.taskCount}</span>
                </button>

                {/* Subprocesses + Tasks (expanded) */}
                {expandedProcesses.has(process.id) && selectedProcessId === process.id && processDetail && (
                  <div className="bg-muted/30">
                    {Array.from(groupedTasks.entries()).map(([subprocess, tasks]) => {
                      const subKey = `${process.id}-${subprocess}`
                      const isSubExpanded = expandedSubprocesses.has(subKey)
                      return (
                        <div key={subKey}>
                          {/* Subprocess header */}
                          <button
                            onClick={() => toggleSubprocess(subKey)}
                            className="w-full flex items-center gap-2 pl-9 pr-4 py-1.5 text-left text-xs hover:bg-accent transition-colors text-muted-foreground"
                          >
                            {isSubExpanded
                              ? <ChevronDown className="h-3 w-3 shrink-0" />
                              : <ChevronRight className="h-3 w-3 shrink-0" />
                            }
                            <span className="truncate font-medium">{subprocess}</span>
                            <span className="ml-auto shrink-0">{tasks.length}</span>
                          </button>

                          {/* Tasks */}
                          {isSubExpanded && tasks.map((task) => (
                            <button
                              key={task.id}
                              onClick={() => selectTask(process.id, task.id)}
                              className={cn(
                                'w-full flex items-center gap-2 pl-14 pr-4 py-1.5 text-left text-xs hover:bg-accent transition-colors',
                                selectedTaskId === task.id && 'bg-accent font-medium')}
                            >
                              <span className="font-mono text-muted-foreground shrink-0">{task.taskKey}</span>
                              <span className="truncate">{task.title}</span>
                              <span className="shrink-0 ml-auto flex items-center gap-1">
                                {task.appStatus === 'full' && <span className="w-2 h-2 rounded-full bg-green-500" title="In App" />}
                                {task.appStatus === 'partial' && <span className="w-2 h-2 rounded-full bg-yellow-500" title="Teilweise" />}
                                {task.appStatus === 'none' && <span className="w-2 h-2 rounded-full bg-red-400" title="Fehlt" />}
                              </span>
                            </button>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="border-b bg-muted/30 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {!showSidebar && (
              <Button variant="ghost" size="icon" onClick={() => setShowSidebar(true)}>
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
            {processDetail && (
              <div className="flex items-center gap-2">
                <span className={cn('w-2.5 h-2.5 rounded-full', KEY_COLORS[processDetail.key] || 'bg-gray-400')} />
                <span className="font-semibold">{processDetail.name}</span>
                {processDetail.description && (
                  <span className="text-sm text-muted-foreground hidden md:inline">
                    — {processDetail.description}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {processDetail && (
              <span>{processDetail.tasks.length} Aufgaben</span>
            )}
            <Link href="/intern/prozesse/dev">
              <Button variant="outline" size="sm">
                <Code2 className="h-4 w-4 mr-1" />
                Programmierauftraege
              </Button>
            </Link>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedTask ? (
            /* Single Task View */
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="font-mono">{selectedTask.taskKey}</Badge>
                <h2 className="text-2xl font-bold">{selectedTask.title}</h2>
              </div>
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <AppStatusBadge status={selectedTask.appStatus} />
                {selectedTask.timeEstimate && (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {selectedTask.timeEstimate}
                  </Badge>
                )}
                {selectedTask.automationPotential && (
                  <Badge className={`text-xs ${potentialColor(selectedTask.automationPotential)}`}>
                    <Zap className="h-3 w-3 mr-1" />
                    {selectedTask.automationPotential}
                  </Badge>
                )}
                {selectedTask.subprocess && (
                  <span className="text-sm text-muted-foreground">{selectedTask.subprocess}</span>
                )}
              </div>
              <TaskDetail task={selectedTask} />
            </div>
          ) : processDetail ? (
            /* All Tasks Accordion View */
            <div className="max-w-3xl space-y-6">
              {Array.from(groupedTasks.entries()).map(([subprocess, tasks]) => (
                <div key={subprocess}>
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 sticky top-0 bg-background py-2 z-10">
                    <ListChecks className="h-5 w-5 text-muted-foreground" />
                    {subprocess}
                    <span className="text-sm font-normal text-muted-foreground">({tasks.length})</span>
                  </h3>
                  <Accordion type="multiple" className="w-full">
                    {tasks.map((task) => (
                      <AccordionItem key={task.id} value={task.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 text-left">
                            <Badge variant="outline" className="font-mono text-xs shrink-0">
                              {task.taskKey}
                            </Badge>
                            <AppStatusBadge status={task.appStatus} />
                            <span className="font-medium">{task.title}</span>
                            <div className="flex items-center gap-2 ml-auto mr-4">
                              {task.timeEstimate && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {task.timeEstimate}
                                </span>
                              )}
                              {task.automationPotential && (
                                <Badge className={`text-xs ${potentialColor(task.automationPotential)}`}>
                                  <Zap className="h-3 w-3 mr-1" />
                                  {task.automationPotential}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <TaskDetail task={task} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Waehlen Sie einen Prozess in der Seitenleiste
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
