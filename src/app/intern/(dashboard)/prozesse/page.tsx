'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Loader2, Upload, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'

interface ProcessArea {
  id: string
  key: string
  name: string
  description: string | null
  taskCount: number
}

export default function ProzessePage() {
  const [processes, setProcesses] = useState<ProcessArea[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  const fetchProcesses = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/processes')
      const data = await response.json()
      if (data.success) setProcesses(data.data)
    } catch {
      toast.error('Prozesse konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProcesses()
  }, [fetchProcesses])

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

  const keyColorMap: Record<string, string> = {
    KP1: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    KP2: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    KP3: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    KP4: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    KP5: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    MP: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    UP: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BookOpen className="h-8 w-8" />
            Prozesshandbuch
          </h1>
          <p className="text-muted-foreground mt-1">
            Standard Operating Procedures — Prozesse, Aufgaben und Arbeitsanweisungen
          </p>
        </div>
        {processes.length === 0 && (
          <Button onClick={handleSeed} disabled={seeding}>
            {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            SOP-Daten importieren
          </Button>
        )}
      </div>

      {processes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">Noch keine Prozesse vorhanden</p>
            <p className="text-muted-foreground text-sm mt-1">
              Klicken Sie auf &quot;SOP-Daten importieren&quot; um die Prozessdokumentation zu laden.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {processes.map((process) => (
            <Link key={process.id} href={`/intern/prozesse/${process.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={keyColorMap[process.key] || 'bg-gray-100 text-gray-800'}>
                      {process.key}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {process.taskCount} Aufgaben
                    </span>
                  </div>
                  <CardTitle className="text-lg">{process.name}</CardTitle>
                  {process.description && (
                    <CardDescription>{process.description}</CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
