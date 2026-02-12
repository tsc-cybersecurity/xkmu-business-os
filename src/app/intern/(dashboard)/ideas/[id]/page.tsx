'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Lightbulb,
  Loader2,
  Sparkles,
  Trash2,
  ArrowRightLeft,
  Calendar,
  Tag,
  FileText,
} from 'lucide-react'

interface Idea {
  id: string
  rawContent: string
  structuredContent: Record<string, unknown> | null
  type: string
  status: string | null
  tags: string[] | null
  createdAt: string
  updatedAt: string
}

const statusLabels: Record<string, string> = {
  backlog: 'Backlog',
  in_progress: 'In Bearbeitung',
  converted: 'Konvertiert',
}

const statusColors: Record<string, string> = {
  backlog: 'bg-slate-500',
  in_progress: 'bg-blue-500',
  converted: 'bg-green-500',
}

export default function IdeaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ideaId = params.id as string

  const [idea, setIdea] = useState<Idea | null>(null)
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [convertResult, setConvertResult] = useState<{
    companyId?: string
    companyName?: string
    leadId?: string
  } | null>(null)

  useEffect(() => {
    fetchIdea()
  }, [ideaId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchIdea = async () => {
    try {
      const response = await fetch(`/api/v1/ideas/${ideaId}`)
      const data = await response.json()
      if (data.success) {
        setIdea(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch idea:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConvert = async () => {
    setConverting(true)
    try {
      const response = await fetch(`/api/v1/ideas/${ideaId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      if (data.success) {
        setConvertResult(data.data)
        await fetchIdea()
      }
    } catch (error) {
      console.error('Failed to convert idea:', error)
    } finally {
      setConverting(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/v1/ideas/${ideaId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        router.push('/intern/ideas')
      }
    } catch (error) {
      console.error('Failed to delete idea:', error)
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!idea) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href="/intern/ideas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
        <div className="text-center py-12">
          <Lightbulb className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">Idee nicht gefunden</h2>
        </div>
      </div>
    )
  }

  const summary = (idea.structuredContent as Record<string, unknown>)?.summary as string | undefined
  const convertedTo = (idea.structuredContent as Record<string, unknown>)?.convertedTo as Record<string, string> | undefined

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/intern/ideas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zum Ideen-Labor
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {idea.status !== 'converted' && (
            <Button
              variant="default"
              onClick={() => setShowConvertDialog(true)}
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Konvertieren
            </Button>
          )}
          <Button
            variant="destructive"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Hauptinhalt */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <CardTitle>Rohtext</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {idea.rawContent}
              </p>
            </CardContent>
          </Card>

          {summary && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <CardTitle>KI-Zusammenfassung</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{summary}</p>
              </CardContent>
            </Card>
          )}

          {convertedTo && (
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-green-700 dark:text-green-400">
                    Konvertierungsergebnis
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {convertedTo.companyName && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Firma:</span>
                    <Link
                      href={`/intern/contacts/companies/${convertedTo.companyId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {convertedTo.companyName}
                    </Link>
                  </div>
                )}
                {convertedTo.leadId && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Lead:</span>
                    <Link
                      href={`/intern/leads/${convertedTo.leadId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      Lead ansehen
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Seitenleiste */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge className={statusColors[idea.status || 'backlog']}>
                  {statusLabels[idea.status || 'backlog']}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Typ:</span>
                <span className="text-sm font-medium capitalize">{idea.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Erstellt:</span>
                <span className="text-sm">{formatDate(idea.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Aktualisiert:</span>
                <span className="text-sm">{formatDate(idea.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>

          {idea.tags && idea.tags.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Tags</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {idea.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Konvertieren Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Idee konvertieren</DialogTitle>
            <DialogDescription>
              Aus dieser Idee wird ein Lead erstellt. Falls Firmennamen erkannt werden,
              wird automatisch eine Firma angelegt.
            </DialogDescription>
          </DialogHeader>
          {convertResult ? (
            <div className="space-y-3 py-4">
              <p className="text-sm font-medium text-green-600">
                Erfolgreich konvertiert!
              </p>
              {convertResult.companyName && (
                <p className="text-sm">
                  Firma erstellt: <strong>{convertResult.companyName}</strong>
                </p>
              )}
              {convertResult.leadId && (
                <p className="text-sm">
                  <Link href={`/intern/leads/${convertResult.leadId}`} className="text-primary hover:underline">
                    Zum neuen Lead
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConvertDialog(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleConvert} disabled={converting}>
                {converting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Jetzt konvertieren
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Löschen Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Idee löschen</DialogTitle>
            <DialogDescription>
              Möchten Sie diese Idee wirklich löschen? Diese Aktion kann nicht rückgängig
              gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
