'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Loader2,
  Download,
  Code2,
  Wrench,
  Monitor,
  CircleDot,
  Search,
  FileCode,
  Save,
  Pencil,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ============================================
// Types
// ============================================

interface DevRequirement {
  tool: string
  neededFunction: string
  approach: string
  effort: string // S, M, L, XL
  priority: string // hoch, mittel, niedrig
}

interface Step {
  nr: number | string
  action: string
  tool?: string
  hint?: string
}

interface DevTask {
  id: string
  taskKey: string
  title: string
  subprocess: string | null
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
  appModule: string | null
  appNotes: string | null
  devRequirements: DevRequirement[]
  processKey: string
  processName: string
}

// ============================================
// Constants
// ============================================

const EFFORT_LABELS: Record<string, { label: string; color: string }> = {
  S: { label: 'S (klein)', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  M: { label: 'M (mittel)', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  L: { label: 'L (gross)', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  XL: { label: 'XL (sehr gross)', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
}

const PRIORITY_COLORS: Record<string, string> = {
  hoch: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  mittel: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  niedrig: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

// ============================================
// MD Generation
// ============================================

function generateMarkdown(tasks: DevTask[], filters: { effort: string; priority: string; appStatus: string; tool: string }): string {
  const lines: string[] = []
  const date = new Date().toISOString().split('T')[0]

  lines.push(`# Programmierauftraege xKMU BusinessOS`)
  lines.push(``)
  lines.push(`**Generiert:** ${date}`)
  lines.push(`**Filter:** Aufwand=${filters.effort || 'alle'}, Prioritaet=${filters.priority || 'alle'}, Status=${filters.appStatus || 'alle'}, Tool=${filters.tool || 'alle'}`)
  lines.push(`**Anzahl Aufgaben:** ${tasks.length}`)
  lines.push(``)

  // Summary table
  const totalReqs = tasks.reduce((sum, t) => sum + t.devRequirements.length, 0)
  const byEffort = { S: 0, M: 0, L: 0, XL: 0 }
  const byPriority = { hoch: 0, mittel: 0, niedrig: 0 }
  for (const t of tasks) {
    for (const r of t.devRequirements) {
      if (r.effort in byEffort) byEffort[r.effort as keyof typeof byEffort]++
      if (r.priority in byPriority) byPriority[r.priority as keyof typeof byPriority]++
    }
  }

  lines.push(`## Uebersicht`)
  lines.push(``)
  lines.push(`| Kennzahl | Wert |`)
  lines.push(`|----------|------|`)
  lines.push(`| Programmieranforderungen gesamt | ${totalReqs} |`)
  lines.push(`| Aufwand S (klein) | ${byEffort.S} |`)
  lines.push(`| Aufwand M (mittel) | ${byEffort.M} |`)
  lines.push(`| Aufwand L (gross) | ${byEffort.L} |`)
  lines.push(`| Aufwand XL (sehr gross) | ${byEffort.XL} |`)
  lines.push(`| Prioritaet hoch | ${byPriority.hoch} |`)
  lines.push(`| Prioritaet mittel | ${byPriority.mittel} |`)
  lines.push(`| Prioritaet niedrig | ${byPriority.niedrig} |`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  // Group by process
  const grouped = new Map<string, DevTask[]>()
  for (const task of tasks) {
    const key = `${task.processKey} ${task.processName}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(task)
  }

  for (const [processName, processTasks] of grouped) {
    lines.push(`## ${processName}`)
    lines.push(``)

    for (const task of processTasks) {
      lines.push(`### ${task.taskKey}: ${task.title}`)
      lines.push(``)
      if (task.subprocess) lines.push(`**Teilprozess:** ${task.subprocess}`)
      lines.push(`**App-Status:** ${task.appStatus === 'full' ? 'Voll abgedeckt' : task.appStatus === 'partial' ? 'Teilweise abgedeckt' : 'Fehlt'}`)
      if (task.appModule) lines.push(`**App-Modul:** ${task.appModule}`)
      if (task.appNotes) lines.push(`**Aktueller Stand:** ${task.appNotes}`)
      lines.push(``)

      for (const req of task.devRequirements) {
        lines.push(`#### ${req.tool}: ${req.neededFunction}`)
        lines.push(``)
        lines.push(`- **Aufwand:** ${req.effort} | **Prioritaet:** ${req.priority}`)
        lines.push(`- **Umsetzungsansatz:** ${req.approach}`)
        lines.push(``)
      }

      lines.push(`---`)
      lines.push(``)
    }
  }

  return lines.join('\n')
}

function generateSingleTaskMd(task: DevTask, req: DevRequirement): string {
  const lines: string[] = []
  const date = new Date().toISOString().split('T')[0]

  lines.push(`# Programmierauftrag: ${req.tool} - ${req.neededFunction}`)
  lines.push(``)
  lines.push(`**Datum:** ${date}`)
  lines.push(`**Aufwand:** ${req.effort} | **Prioritaet:** ${req.priority}`)
  lines.push(`**Prozess:** ${task.processKey} ${task.processName}`)
  lines.push(`**Aufgabe:** ${task.taskKey} - ${task.title}`)
  if (task.subprocess) lines.push(`**Teilprozess:** ${task.subprocess}`)
  if (task.timeEstimate) lines.push(`**Zeitaufwand Prozessschritt:** ${task.timeEstimate}`)
  lines.push(``)

  lines.push(`## Prozesskontext`)
  lines.push(``)
  if (task.purpose) lines.push(`**Zweck der Aufgabe:** ${task.purpose}`)
  if (task.trigger) lines.push(`**Ausloeser:** ${task.trigger}`)
  lines.push(`**Externe Tools:** ${(task.tools || []).join(', ') || 'keine'}`)
  lines.push(``)

  if (Array.isArray(task.prerequisites) && task.prerequisites.length > 0) {
    lines.push(`**Vorbedingungen:**`)
    task.prerequisites.forEach(p => lines.push(`- ${p}`))
    lines.push(``)
  }

  if (Array.isArray(task.steps) && task.steps.length > 0) {
    lines.push(`**Prozessschritte:**`)
    task.steps.forEach(s => {
      lines.push(`${s.nr}. ${s.action}${s.tool ? ` [${s.tool}]` : ''}${s.hint ? ` *(${s.hint})*` : ''}`)
    })
    lines.push(``)
  }

  if (Array.isArray(task.checklist) && task.checklist.length > 0) {
    lines.push(`**Erfolgskontrolle:**`)
    task.checklist.forEach(c => lines.push(`- [ ] ${c}`))
    lines.push(``)
  }

  if (task.expectedOutput) {
    lines.push(`**Erwartetes Ergebnis:** ${task.expectedOutput}`)
    lines.push(``)
  }

  if (task.errorEscalation) {
    lines.push(`**Fehlerfall/Eskalation:** ${task.errorEscalation}`)
    lines.push(``)
  }

  if (task.solution) {
    lines.push(`**Bisheriger KI-Ansatz:** ${task.solution}`)
    lines.push(``)
  }

  lines.push(`## Aktueller App-Stand`)
  lines.push(``)
  lines.push(`- **Status:** ${task.appStatus === 'full' ? 'Voll abgedeckt' : task.appStatus === 'partial' ? 'Teilweise abgedeckt' : 'Fehlt'}`)
  if (task.appModule) lines.push(`- **Vorhandenes Modul:** ${task.appModule}`)
  if (task.appNotes) lines.push(`- **Details:** ${task.appNotes}`)
  lines.push(``)

  lines.push(`## Programmieranforderung`)
  lines.push(``)
  lines.push(`**Tool das ersetzt/integriert wird:** ${req.tool}`)
  lines.push(``)
  lines.push(`**Benoetigte Funktion:** ${req.neededFunction}`)
  lines.push(``)
  lines.push(`## Umsetzungsansatz`)
  lines.push(``)
  lines.push(req.approach)
  lines.push(``)

  return lines.join('\n')
}

function downloadMd(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ============================================
// Page
// ============================================

export default function DevTasksPage() {
  const [tasks, setTasks] = useState<DevTask[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [effortFilter, setEffortFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [appStatusFilter, setAppStatusFilter] = useState<string>('all')
  const [toolFilter, setToolFilter] = useState<string>('all')
  const [processFilter, setProcessFilter] = useState<string>('all')

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/processes/dev-tasks')
      const data = await response.json()
      if (data.success) setTasks(data.data)
    } catch {
      toast.error('Programmierauftraege konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Extract unique values for filters
  const allTools = useMemo(() => {
    const tools = new Set<string>()
    for (const task of tasks) {
      for (const req of (task.devRequirements || [])) {
        tools.add(req.tool)
      }
    }
    return Array.from(tools).sort()
  }, [tasks])

  const allProcesses = useMemo(() => {
    const procs = new Map<string, string>()
    for (const task of tasks) {
      procs.set(task.processKey, task.processName)
    }
    return Array.from(procs.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [tasks])

  // Apply filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const reqs = task.devRequirements || []
      if (reqs.length === 0) return false

      // Search
      if (search) {
        const s = search.toLowerCase()
        const matchesSearch = task.taskKey.toLowerCase().includes(s)
          || task.title.toLowerCase().includes(s)
          || reqs.some(r => r.tool.toLowerCase().includes(s) || r.neededFunction.toLowerCase().includes(s) || r.approach.toLowerCase().includes(s))
        if (!matchesSearch) return false
      }

      // Process filter
      if (processFilter !== 'all' && task.processKey !== processFilter) return false

      // App status filter
      if (appStatusFilter !== 'all' && task.appStatus !== appStatusFilter) return false

      // Effort and priority filter on requirements level
      if (effortFilter !== 'all' && !reqs.some(r => r.effort === effortFilter)) return false
      if (priorityFilter !== 'all' && !reqs.some(r => r.priority === priorityFilter)) return false
      if (toolFilter !== 'all' && !reqs.some(r => r.tool === toolFilter)) return false

      return true
    })
  }, [tasks, search, effortFilter, priorityFilter, appStatusFilter, toolFilter, processFilter])

  // Stats
  const stats = useMemo(() => {
    let total = 0, high = 0, medium = 0, low = 0
    for (const t of filteredTasks) {
      for (const r of t.devRequirements) {
        total++
        if (r.priority === 'hoch') high++
        else if (r.priority === 'mittel') medium++
        else low++
      }
    }
    return { total, high, medium, low }
  }, [filteredTasks])

  // Editing state
  const [editingReq, setEditingReq] = useState<string | null>(null) // "taskId-reqIndex"
  const [editData, setEditData] = useState<DevRequirement | null>(null)
  const [saving, setSaving] = useState(false)

  const startEdit = (taskId: string, reqIndex: number, req: DevRequirement) => {
    setEditingReq(`${taskId}-${reqIndex}`)
    setEditData({ ...req })
  }

  const cancelEdit = () => {
    setEditingReq(null)
    setEditData(null)
  }

  const saveEdit = async (task: DevTask, reqIndex: number) => {
    if (!editData) return
    setSaving(true)
    try {
      const updatedReqs = [...task.devRequirements]
      updatedReqs[reqIndex] = editData

      const response = await fetch(`/api/v1/processes/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devRequirements: updatedReqs }),
      })
      const data = await response.json()
      if (data.success) {
        // Update local state
        setTasks(prev => prev.map(t =>
          t.id === task.id ? { ...t, devRequirements: updatedReqs } : t
        ))
        setEditingReq(null)
        setEditData(null)
        toast.success('Anforderung gespeichert')
      } else {
        toast.error('Speichern fehlgeschlagen')
      }
    } catch {
      toast.error('Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  // AI Generation
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState('')

  const handleGenerate = async (overwrite: boolean) => {
    if (!confirm(overwrite
      ? 'Alle Programmieranforderungen neu generieren? Bestehende werden ueberschrieben.'
      : 'Fehlende Programmieranforderungen per KI generieren? Bestehende bleiben erhalten.'
    )) return

    setGenerating(true)
    setGenProgress('KI-Analyse laeuft...')
    try {
      const response = await fetch('/api/v1/processes/dev-tasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overwrite }),
      })
      const data = await response.json()
      if (data.success) {
        setGenProgress('')
        toast.success(`${data.data.generated} Aufgaben analysiert, ${data.data.errors} Fehler`)
        fetchTasks()
      } else {
        toast.error(data.error?.message || 'Generierung fehlgeschlagen')
      }
    } catch {
      toast.error('Generierung fehlgeschlagen')
    } finally {
      setGenerating(false)
      setGenProgress('')
    }
  }

  const handleDownloadAll = () => {
    const md = generateMarkdown(filteredTasks, {
      effort: effortFilter, priority: priorityFilter,
      appStatus: appStatusFilter, tool: toolFilter,
    })
    const date = new Date().toISOString().split('T')[0]
    downloadMd(md, `programmierauftraege-${date}.md`)
    toast.success(`${filteredTasks.length} Auftraege als MD exportiert`)
  }

  const handleDownloadSingle = (task: DevTask, req: DevRequirement) => {
    const md = generateSingleTaskMd(task, req)
    downloadMd(md, `auftrag-${task.taskKey}-${req.tool.replace(/[^a-zA-Z0-9]/g, '_')}.md`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/intern/prozesse">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Code2 className="h-8 w-8" />
              Programmierauftraege
            </h1>
          </div>
          <p className="text-muted-foreground ml-12">
            Aus Prozessanalyse generierte Entwicklungsaufgaben
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleGenerate(false)}
            disabled={generating}
          >
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            {generating ? genProgress || 'Generiert...' : 'KI-Analyse (fehlende)'}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleGenerate(true)}
            disabled={generating}
          >
            <Zap className="h-4 w-4 mr-2" />
            Alle neu generieren
          </Button>
          <Button onClick={handleDownloadAll} disabled={filteredTasks.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export (.md)
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Anforderungen</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.high}</div>
            <div className="text-xs text-muted-foreground">Hohe Prioritaet</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
            <div className="text-xs text-muted-foreground">Mittlere Prioritaet</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-gray-500">{stats.low}</div>
            <div className="text-xs text-muted-foreground">Niedrige Prioritaet</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="col-span-2 md:col-span-1 lg:col-span-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Suche..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={processFilter} onValueChange={setProcessFilter}>
              <SelectTrigger><SelectValue placeholder="Prozess" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Prozesse</SelectItem>
                {allProcesses.map(([key, name]) => (
                  <SelectItem key={key} value={key}>{key} {name.replace(key + ' ', '')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger><SelectValue placeholder="Prioritaet" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Prioritaeten</SelectItem>
                <SelectItem value="hoch">Hoch</SelectItem>
                <SelectItem value="mittel">Mittel</SelectItem>
                <SelectItem value="niedrig">Niedrig</SelectItem>
              </SelectContent>
            </Select>
            <Select value={effortFilter} onValueChange={setEffortFilter}>
              <SelectTrigger><SelectValue placeholder="Aufwand" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Aufwaende</SelectItem>
                <SelectItem value="S">S (klein)</SelectItem>
                <SelectItem value="M">M (mittel)</SelectItem>
                <SelectItem value="L">L (gross)</SelectItem>
                <SelectItem value="XL">XL (sehr gross)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={appStatusFilter} onValueChange={setAppStatusFilter}>
              <SelectTrigger><SelectValue placeholder="App-Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="none">Fehlt</SelectItem>
                <SelectItem value="partial">Teilweise</SelectItem>
                <SelectItem value="full">Vorhanden</SelectItem>
              </SelectContent>
            </Select>
            <Select value={toolFilter} onValueChange={setToolFilter}>
              <SelectTrigger><SelectValue placeholder="Tool" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Tools</SelectItem>
                {allTools.map(tool => (
                  <SelectItem key={tool} value={tool}>{tool}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="text-sm text-muted-foreground">
        {filteredTasks.length} Aufgaben mit {stats.total} Programmieranforderungen
      </div>

      <div className="space-y-6">
        {filteredTasks.map((task) => {
          const reqs = task.devRequirements || []
          return reqs.map((req, i) => {
            const isEditing = editingReq === `${task.id}-${i}`
            const current = isEditing && editData ? editData : req
            return (
              <Card key={`${task.id}-${i}`} className={cn(isEditing && 'ring-2 ring-primary')}>
                {/* Header */}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">{task.taskKey}</Badge>
                        <Badge variant="secondary" className="text-xs"><Wrench className="h-3 w-3 mr-1" />{current.tool}</Badge>
                        {isEditing ? (
                          <>
                            <Select value={editData!.effort} onValueChange={v => setEditData({ ...editData!, effort: v })}>
                              <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="S">S</SelectItem>
                                <SelectItem value="M">M</SelectItem>
                                <SelectItem value="L">L</SelectItem>
                                <SelectItem value="XL">XL</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select value={editData!.priority} onValueChange={v => setEditData({ ...editData!, priority: v })}>
                              <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hoch">hoch</SelectItem>
                                <SelectItem value="mittel">mittel</SelectItem>
                                <SelectItem value="niedrig">niedrig</SelectItem>
                              </SelectContent>
                            </Select>
                          </>
                        ) : (
                          <>
                            <Badge className={cn('text-xs', EFFORT_LABELS[current.effort]?.color || '')}>{current.effort}</Badge>
                            <Badge className={cn('text-xs', PRIORITY_COLORS[current.priority] || '')}>{current.priority}</Badge>
                          </>
                        )}
                        {task.appStatus === 'none' && <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">Fehlt</Badge>}
                        {task.appStatus === 'partial' && <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs"><CircleDot className="h-3 w-3 mr-1" />Teilweise</Badge>}
                      </div>
                      <CardTitle className="text-base">{task.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {task.processName} {task.subprocess && <>&#8250; {task.subprocess}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <Button variant="outline" size="sm" onClick={cancelEdit}>Abbrechen</Button>
                          <Button size="sm" onClick={() => saveEdit(task, i)} disabled={saving}>
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                            Speichern
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(task.id, i, req)} title="Bearbeiten">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDownloadSingle(task, req)}>
                            <FileCode className="h-3.5 w-3.5 mr-1" />.md
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {/* Anforderung */}
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Benoetigte Funktion</label>
                        <Textarea
                          value={editData!.neededFunction}
                          onChange={e => setEditData({ ...editData!, neededFunction: e.target.value })}
                          rows={2} className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Umsetzungsansatz</label>
                        <Textarea
                          value={editData!.approach}
                          onChange={e => setEditData({ ...editData!, approach: e.target.value })}
                          rows={5} className="text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Benoetigte Funktion</h4>
                        <p className="text-sm">{current.neededFunction}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Umsetzungsansatz</h4>
                        <p className="text-sm">{current.approach}</p>
                      </div>
                    </div>
                  )}

                  {/* Prozesskontext (collapsible) */}
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="context" className="border-0">
                      <AccordionTrigger className="hover:no-underline py-2 text-xs text-muted-foreground">
                        Prozesskontext anzeigen
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 text-sm">
                          {task.purpose && (
                            <div><span className="font-semibold">Zweck:</span> <span className="text-muted-foreground">{task.purpose}</span></div>
                          )}
                          {task.trigger && (
                            <div><span className="font-semibold">Ausloeser:</span> <span className="text-muted-foreground">{task.trigger}</span></div>
                          )}
                          {Array.isArray(task.tools) && task.tools.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">Tools:</span>
                              {task.tools.map((tool, ti) => <Badge key={ti} variant="secondary" className="text-xs">{tool}</Badge>)}
                            </div>
                          )}
                          {Array.isArray(task.steps) && task.steps.length > 0 && (
                            <div>
                              <span className="font-semibold">Schritte:</span>
                              <ol className="mt-1 space-y-0.5 text-muted-foreground ml-4 list-decimal text-xs">
                                {task.steps.map((step, si) => (
                                  <li key={si}>{step.action}{step.tool && <span className="ml-1">[{step.tool}]</span>}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                          {Array.isArray(task.checklist) && task.checklist.length > 0 && (
                            <div>
                              <span className="font-semibold">Checkliste:</span>
                              <ul className="mt-1 space-y-0.5 text-muted-foreground ml-4 list-disc text-xs">
                                {task.checklist.map((item, ci) => <li key={ci}>{item}</li>)}
                              </ul>
                            </div>
                          )}
                          {task.expectedOutput && (
                            <div><span className="font-semibold">Ergebnis:</span> <span className="text-muted-foreground">{task.expectedOutput}</span></div>
                          )}
                          {task.solution && (
                            <div><span className="font-semibold">KI-Ansatz:</span> <span className="text-muted-foreground">{task.solution}</span></div>
                          )}
                          {task.appNotes && (
                            <div className={cn('rounded p-2', task.appStatus === 'none' ? 'bg-red-50 dark:bg-red-950/30' : task.appStatus === 'partial' ? 'bg-yellow-50 dark:bg-yellow-950/30' : 'bg-green-50 dark:bg-green-950/30')}>
                              <span className="font-semibold">App-Stand:</span>{' '}
                              {task.appModule && <Badge variant="outline" className="text-xs mr-1">{task.appModule}</Badge>}
                              <span className="text-muted-foreground">{task.appNotes}</span>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            )
          })
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Keine Programmierauftraege mit den gewaehlten Filtern gefunden.
        </div>
      )}
    </div>
  )
}
