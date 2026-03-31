'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowLeft,
  Loader2,
  Download,
  Code2,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { DevTaskFilters } from './_components/dev-task-filters'
import { DevTaskCard } from './_components/dev-task-card'
import { DevAnalysisDialog } from './_components/dev-analysis-dialog'
import { generateMarkdown, generateSingleTaskMd, downloadMd, buildAiPrompt } from './_components/dev-markdown-utils'

interface DevRequirement {
  tool: string
  neededFunction: string
  approach: string
  effort: string
  priority: string
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

export default function DevTasksPage() {
  const [tasks, setTasks] = useState<DevTask[]>([])
  const [loading, setLoading] = useState(true)

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

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const allTools = useMemo(() => {
    const tools = new Set<string>()
    for (const task of tasks) {
      for (const req of (task.devRequirements || [])) tools.add(req.tool)
    }
    return Array.from(tools).sort()
  }, [tasks])

  const allProcesses = useMemo(() => {
    const procs = new Map<string, string>()
    for (const task of tasks) procs.set(task.processKey, task.processName)
    return Array.from(procs.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [tasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const reqs = task.devRequirements || []
      if (reqs.length === 0) return false
      if (search) {
        const s = search.toLowerCase()
        const matchesSearch = task.taskKey.toLowerCase().includes(s)
          || task.title.toLowerCase().includes(s)
          || reqs.some(r => r.tool.toLowerCase().includes(s) || r.neededFunction.toLowerCase().includes(s) || r.approach.toLowerCase().includes(s))
        if (!matchesSearch) return false
      }
      if (processFilter !== 'all' && task.processKey !== processFilter) return false
      if (appStatusFilter !== 'all' && task.appStatus !== appStatusFilter) return false
      if (effortFilter !== 'all' && !reqs.some(r => r.effort === effortFilter)) return false
      if (priorityFilter !== 'all' && !reqs.some(r => r.priority === priorityFilter)) return false
      if (toolFilter !== 'all' && !reqs.some(r => r.tool === toolFilter)) return false
      return true
    })
  }, [tasks, search, effortFilter, priorityFilter, appStatusFilter, toolFilter, processFilter])

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

  const [editingReq, setEditingReq] = useState<string | null>(null)
  const [editData, setEditData] = useState<DevRequirement | null>(null)
  const [editTaskData, setEditTaskData] = useState<{ appStatus: string; appNotes: string; appModule: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const startEdit = (task: DevTask, reqIndex: number, req: DevRequirement) => {
    setEditingReq(`${task.id}-${reqIndex}`)
    setEditData({ ...req })
    setEditTaskData({ appStatus: task.appStatus || 'none', appNotes: task.appNotes || '', appModule: task.appModule || '' })
  }

  const cancelEdit = () => { setEditingReq(null); setEditData(null); setEditTaskData(null) }

  const saveEdit = async (task: DevTask, reqIndex: number) => {
    if (!editData || !editTaskData) return
    setSaving(true)
    try {
      const updatedReqs = [...task.devRequirements]
      updatedReqs[reqIndex] = editData
      const response = await fetch(`/api/v1/processes/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devRequirements: updatedReqs,
          appStatus: editTaskData.appStatus,
          appNotes: editTaskData.appNotes || '',
          appModule: editTaskData.appModule || null,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setTasks(prev => prev.map(t =>
          t.id === task.id ? { ...t, devRequirements: updatedReqs, appStatus: editTaskData.appStatus, appNotes: editTaskData.appNotes, appModule: editTaskData.appModule } : t
        ))
        setEditingReq(null); setEditData(null); setEditTaskData(null)
        toast.success('Gespeichert')
      } else {
        toast.error('Speichern fehlgeschlagen')
      }
    } catch {
      toast.error('Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

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
      setGenerating(false); setGenProgress('')
    }
  }

  const [aiDialogTask, setAiDialogTask] = useState<DevTask | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiRunning, setAiRunning] = useState(false)

  const openAiDialog = (task: DevTask) => {
    setAiPrompt(buildAiPrompt(task))
    setAiDialogTask(task)
  }

  const runAiAnalysis = async () => {
    if (!aiDialogTask) return
    setAiRunning(true)
    try {
      const response = await fetch('/api/v1/processes/dev-tasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskKeys: [aiDialogTask.taskKey], overwrite: true, customPrompt: aiPrompt }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(`Analyse fuer ${aiDialogTask.taskKey} abgeschlossen`)
        setAiDialogTask(null)
        fetchTasks()
      } else {
        toast.error(data.error?.message || 'Analyse fehlgeschlagen')
      }
    } catch {
      toast.error('Analyse fehlgeschlagen')
    } finally {
      setAiRunning(false)
    }
  }

  const handleDownloadAll = () => {
    const md = generateMarkdown(filteredTasks, { effort: effortFilter, priority: priorityFilter, appStatus: appStatusFilter, tool: toolFilter })
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
          <p className="text-muted-foreground ml-12">Aus Prozessanalyse generierte Entwicklungsaufgaben</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleGenerate(false)} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            {generating ? genProgress || 'Generiert...' : 'KI-Analyse (fehlende)'}
          </Button>
          <Button variant="outline" onClick={() => handleGenerate(true)} disabled={generating}>
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
        <Card><CardContent className="pt-4 pb-3 text-center"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Anforderungen</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><div className="text-2xl font-bold text-red-600">{stats.high}</div><div className="text-xs text-muted-foreground">Hohe Prioritaet</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><div className="text-2xl font-bold text-yellow-600">{stats.medium}</div><div className="text-xs text-muted-foreground">Mittlere Prioritaet</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><div className="text-2xl font-bold text-gray-500">{stats.low}</div><div className="text-xs text-muted-foreground">Niedrige Prioritaet</div></CardContent></Card>
      </div>

      {/* Filters */}
      <DevTaskFilters
        search={search}
        setSearch={setSearch}
        processFilter={processFilter}
        setProcessFilter={setProcessFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        effortFilter={effortFilter}
        setEffortFilter={setEffortFilter}
        appStatusFilter={appStatusFilter}
        setAppStatusFilter={setAppStatusFilter}
        toolFilter={toolFilter}
        setToolFilter={setToolFilter}
        allProcesses={allProcesses}
        allTools={allTools}
      />

      <div className="text-sm text-muted-foreground">
        {filteredTasks.length} Aufgaben mit {stats.total} Programmieranforderungen
      </div>

      {/* Task Cards */}
      <div className="space-y-6">
        {filteredTasks.map((task) => {
          const reqs = task.devRequirements || []
          return reqs.map((req, i) => {
            const isEditing = editingReq === `${task.id}-${i}`
            return (
              <DevTaskCard
                key={`${task.id}-${i}`}
                task={task}
                req={req}
                reqIndex={i}
                isEditing={isEditing}
                editData={isEditing ? editData : null}
                editTaskData={isEditing ? editTaskData : null}
                saving={saving}
                onStartEdit={startEdit}
                onCancelEdit={cancelEdit}
                onSaveEdit={saveEdit}
                setEditData={setEditData}
                setEditTaskData={setEditTaskData}
                onOpenAiDialog={openAiDialog}
                onDownloadSingle={handleDownloadSingle}
              />
            )
          })
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Keine Programmierauftraege mit den gewaehlten Filtern gefunden.
        </div>
      )}

      <DevAnalysisDialog
        aiDialogTask={aiDialogTask}
        onClose={() => setAiDialogTask(null)}
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        aiRunning={aiRunning}
        onRunAnalysis={runAiAnalysis}
      />
    </div>
  )
}
