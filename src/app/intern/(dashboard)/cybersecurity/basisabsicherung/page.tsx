'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Shield, Plus, Loader2, CheckCircle2, XCircle, MinusCircle, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/shared'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface Assessment {
  id: string
  name: string
  description: string | null
  companyName: string | null
  status: string | null
  createdAt: string
  completedAt: string | null
  answeredCount: number
  jaCount: number
  neinCount: number
  nichtRelevantCount: number
  totalQuestions: number
}

const statusLabels: Record<string, string> = {
  draft: 'Entwurf',
  in_progress: 'In Bearbeitung',
  completed: 'Abgeschlossen',
}

const statusVariants: Record<string, 'secondary' | 'default' | 'outline'> = {
  draft: 'secondary',
  in_progress: 'default',
  completed: 'outline',
}

export default function BasisabsicherungPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAssessments = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/wiba/assessments')
      const data = await response.json()
      if (data.success) {
        setAssessments(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch assessments', error, { module: 'CybersecurityBasisabsicherungPage' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssessments()
  }, [fetchAssessments])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Assessment wirklich löschen?')) return

    try {
      const response = await fetch(`/api/v1/wiba/assessments/${id}`, { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        toast.success('Assessment gelöscht')
        setAssessments((prev) => prev.filter((a) => a.id !== id))
      }
    } catch (error) {
      logger.error('Failed to delete assessment', error, { module: 'CybersecurityBasisabsicherungPage' })
      toast.error('Fehler beim Loeschen')
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Basisabsicherung</h1>
          <p className="text-muted-foreground">
            BSI Weg in die Basis-Absicherung (WiBA) - IT-Sicherheit systematisch umsetzen
          </p>
        </div>
        <Link href="/intern/cybersecurity/basisabsicherung/new" className="self-start sm:self-auto">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neues Assessment
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : assessments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <EmptyState
              icon={Shield}
              title="Noch keine Assessments"
              description="Starten Sie Ihre erste Basisabsicherung nach BSI WiBA. 19 thematische Checklisten helfen Ihnen, die wichtigsten IT-Sicherheitsmassnahmen systematisch umzusetzen."
              action={
                <Link href="/intern/cybersecurity/basisabsicherung/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Erstes Assessment starten
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assessments.map((assessment) => {
            const progress = assessment.totalQuestions > 0
              ? Math.round((assessment.answeredCount / assessment.totalQuestions) * 100)
              : 0

            return (
              <Link key={assessment.id} href={`/intern/cybersecurity/basisabsicherung/${assessment.id}`}>
                <Card className="transition-shadow hover:shadow-md cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{assessment.name}</CardTitle>
                        {assessment.companyName && (
                          <p className="text-sm text-muted-foreground">{assessment.companyName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariants[assessment.status || 'draft']}>
                          {statusLabels[assessment.status || 'draft']}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Löschen"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDelete(e, assessment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex gap-6 text-sm text-muted-foreground">
                      <span>Erstellt: {formatDate(assessment.createdAt)}</span>
                      {assessment.completedAt && <span>Abgeschlossen: {formatDate(assessment.completedAt)}</span>}
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Fortschritt: {assessment.answeredCount} / {assessment.totalQuestions} Prueffragen
                        </span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Answer breakdown */}
                    {assessment.answeredCount > 0 && (
                      <div className="flex gap-4 text-xs">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {assessment.jaCount} Ja
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-3.5 w-3.5" />
                          {assessment.neinCount} Nein
                        </span>
                        {assessment.nichtRelevantCount > 0 && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <MinusCircle className="h-3.5 w-3.5" />
                            {assessment.nichtRelevantCount} N/R
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
