'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  ArrowLeft,
  Loader2,
  Clock,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  ListChecks,
  FileOutput,
} from 'lucide-react'

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
}

interface ProcessDetail {
  id: string
  key: string
  name: string
  description: string | null
  tasks: ProcessTask[]
}

export default function ProcessDetailPage() {
  const params = useParams()
  const [process, setProcess] = useState<ProcessDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProcess = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/processes/${params.id}`)
      const data = await response.json()
      if (data.success) setProcess(data.data)
    } catch {
      // Error handling
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchProcess()
  }, [fetchProcess])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!process) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Prozess nicht gefunden</p>
        <Link href="/intern/prozesse">
          <Button variant="outline" className="mt-4">Zurueck</Button>
        </Link>
      </div>
    )
  }

  // Group tasks by subprocess
  const grouped = new Map<string, ProcessTask[]>()
  for (const task of process.tasks) {
    const key = task.subprocess || 'Sonstige'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(task)
  }

  const potentialColor = (p: string | null) => {
    switch (p) {
      case 'Hoch': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'Mittel': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'Niedrig': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/intern/prozesse">
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurueck
        </Button>
      </Link>

      <div>
        <div className="flex items-center gap-3 mb-1">
          <Badge variant="outline" className="text-sm">{process.key}</Badge>
          <h1 className="text-3xl font-bold">{process.name}</h1>
        </div>
        {process.description && (
          <p className="text-muted-foreground mt-1">{process.description}</p>
        )}
        <p className="text-sm text-muted-foreground mt-2">
          {process.tasks.length} Aufgaben in {grouped.size} Teilprozessen
        </p>
      </div>

      {Array.from(grouped.entries()).map(([subprocess, tasks]) => (
        <Card key={subprocess}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-muted-foreground" />
              {subprocess}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Accordion type="multiple" className="w-full">
              {tasks.map((task) => (
                <AccordionItem key={task.id} value={task.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <Badge variant="outline" className="font-mono text-xs shrink-0">
                        {task.taskKey}
                      </Badge>
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
                    <div className="space-y-4 pt-2 pl-2">
                      {/* Zweck */}
                      {task.purpose && (
                        <div>
                          <h4 className="text-sm font-semibold flex items-center gap-2 mb-1">
                            <Target className="h-4 w-4 text-blue-500" />
                            Zweck
                          </h4>
                          <p className="text-sm text-muted-foreground">{task.purpose}</p>
                        </div>
                      )}

                      {/* Trigger */}
                      {task.trigger && (
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Ausloser</h4>
                          <p className="text-sm text-muted-foreground">{task.trigger}</p>
                        </div>
                      )}

                      {/* Tools */}
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

                      {/* Vorbedingungen */}
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

                      {/* Schritte */}
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

                      {/* Checkliste */}
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

                      {/* Erwartetes Ergebnis */}
                      {task.expectedOutput && (
                        <div>
                          <h4 className="text-sm font-semibold flex items-center gap-2 mb-1">
                            <FileOutput className="h-4 w-4 text-teal-500" />
                            Erwartetes Ergebnis
                          </h4>
                          <p className="text-sm text-muted-foreground">{task.expectedOutput}</p>
                        </div>
                      )}

                      {/* Fehlerfall */}
                      {task.errorEscalation && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-md p-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2 mb-1 text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-4 w-4" />
                            Fehlerfall / Eskalation
                          </h4>
                          <p className="text-sm text-amber-700 dark:text-amber-300">{task.errorEscalation}</p>
                        </div>
                      )}

                      {/* KI-Ansatz */}
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
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
