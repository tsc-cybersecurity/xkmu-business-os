'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Loader2,
  Newspaper,
  RefreshCcw,
  Trash2,
  Play,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { TopicForm, type TopicFormData } from '@/components/news/topic-form'
import { logger } from '@/lib/utils/logger'

interface NewsTopic {
  id: string
  name: string
  description: string | null
  color: string | null
  keywords: string[] | null
  sourceType: string
  sourceConfig: Record<string, unknown> | null
  isActive: boolean | null
  sortOrder: number | null
  createdAt: string | null
}

interface NewsItem {
  id: string
  topicId: string
  title: string
  url: string
  source: string | null
  publishedAt: string | null
  pipelineStatus: string
  pipelineError: string | null
  createdAt: string | null
}

type StatusKey = 'idle' | 'queued' | 'researching' | 'generating' | 'completed' | 'failed'

const STATUS_LABEL: Record<string, string> = {
  idle: 'Bereit',
  queued: 'In Warteschlange',
  researching: 'Recherchiert',
  generating: 'Erzeugt',
  completed: 'Abgeschlossen',
  failed: 'Fehlgeschlagen',
}

function statusBadge(status: string) {
  const key = (status || 'idle') as StatusKey
  const label = STATUS_LABEL[key] ?? status
  if (key === 'completed') {
    return (
      <Badge className="bg-green-600 hover:bg-green-600 text-white">{label}</Badge>
    )
  }
  if (key === 'failed') {
    return <Badge variant="destructive">{label}</Badge>
  }
  if (key === 'queued' || key === 'researching' || key === 'generating') {
    return (
      <Badge className="bg-blue-600 hover:bg-blue-600 text-white animate-pulse">
        {label}
      </Badge>
    )
  }
  return <Badge variant="secondary">{label}</Badge>
}

function formatDate(value: string | null): string {
  if (!value) return '–'
  try {
    return new Date(value).toLocaleString('de-DE')
  } catch {
    return '–'
  }
}

const NON_TRIGGERABLE = new Set(['queued', 'researching', 'generating', 'completed'])

export default function NewsTopicDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [topic, setTopic] = useState<NewsTopic | null>(null)
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [researching, setResearching] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [triggeringItemId, setTriggeringItemId] = useState<string | null>(null)

  const fetchTopic = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/news/topics/${id}`)
      const json = await response.json()
      if (json.success) {
        setTopic(json.data)
      } else {
        toast.error(json.error?.message || 'Thema konnte nicht geladen werden')
      }
    } catch (error) {
      logger.error('Failed to fetch news topic', error, { module: 'NewsTopicDetailPage' })
      toast.error('Thema konnte nicht geladen werden')
    }
  }, [id])

  const fetchItems = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/news/items?topicId=${id}`)
      const json = await response.json()
      if (json.success) {
        setItems(Array.isArray(json.data) ? json.data : [])
      }
    } catch (error) {
      logger.error('Failed to fetch news items', error, { module: 'NewsTopicDetailPage' })
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([fetchTopic(), fetchItems()]).finally(() => setLoading(false))
  }, [id, fetchTopic, fetchItems])

  const handleSubmit = async (data: TopicFormData) => {
    setSaving(true)
    try {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        color: data.color,
        keywords: data.keywords,
        sourceType: data.sourceType,
        sourceConfig: data.sourceConfig,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      }
      const response = await fetch(`/api/v1/news/topics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await response.json()
      if (response.ok && json.success) {
        toast.success('Thema gespeichert')
        setTopic(json.data)
      } else {
        toast.error(json.error?.message || 'Fehler beim Speichern')
      }
    } catch (error) {
      logger.error('Failed to update news topic', error, { module: 'NewsTopicDetailPage' })
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleResearch = async () => {
    setResearching(true)
    try {
      const response = await fetch(`/api/v1/news/topics/${id}/research`, {
        method: 'POST',
      })
      const json = await response.json()
      if (json.success) {
        const { inserted = 0, skipped = 0 } = json.data ?? {}
        toast.success(`Recherche abgeschlossen: ${inserted} neu, ${skipped} übersprungen`)
        fetchItems()
      } else {
        toast.error(json.error?.message || 'Recherche fehlgeschlagen')
      }
    } catch (error) {
      logger.error('Failed to run topic research', error, { module: 'NewsTopicDetailPage' })
      toast.error('Recherche fehlgeschlagen')
    } finally {
      setResearching(false)
    }
  }

  const handleDelete = async () => {
    if (!topic) return
    if (!confirm(`Thema "${topic.name}" wirklich löschen? Alle zugehörigen News-Items werden ebenfalls entfernt.`)) {
      return
    }
    setDeleting(true)
    try {
      const response = await fetch(`/api/v1/news/topics/${id}`, { method: 'DELETE' })
      const json = await response.json().catch(() => ({ success: response.ok }))
      if (response.ok && json.success !== false) {
        toast.success('Thema gelöscht')
        router.push('/intern/news/topics')
      } else {
        toast.error(json.error?.message || 'Löschen fehlgeschlagen')
      }
    } catch (error) {
      logger.error('Failed to delete news topic', error, { module: 'NewsTopicDetailPage' })
      toast.error('Löschen fehlgeschlagen')
    } finally {
      setDeleting(false)
    }
  }

  const handleTriggerPipeline = async (itemId: string) => {
    setTriggeringItemId(itemId)
    try {
      const response = await fetch(`/api/v1/news/items/${itemId}/pipeline`, {
        method: 'POST',
      })
      const json = await response.json()
      if (response.ok && json.success) {
        toast.success('Pipeline gestartet')
        fetchItems()
      } else {
        toast.error(json.error?.message || 'Pipeline-Start fehlgeschlagen')
      }
    } catch (error) {
      logger.error('Failed to trigger pipeline', error, { module: 'NewsTopicDetailPage' })
      toast.error('Pipeline-Start fehlgeschlagen')
    } finally {
      setTriggeringItemId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!topic) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">Thema nicht gefunden</p>
        <Link href="/intern/news/topics">
          <Button variant="link">Zurück zur Liste</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/intern/news/topics">
            <Button variant="ghost" size="icon" aria-label="Zurück zur Liste">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <span
              className="inline-block w-4 h-4 rounded-full"
              style={{ backgroundColor: topic.color || '#3b82f6' }}
              aria-hidden="true"
            />
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Newspaper className="h-8 w-8" />
                {topic.name}
              </h1>
              <p className="text-muted-foreground mt-1">News-Thema bearbeiten</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleResearch} disabled={researching}>
            {researching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4 mr-2" />
            )}
            Jetzt recherchieren
          </Button>
          <Link href="/intern/news/topics">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zur Liste
            </Button>
          </Link>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Löschen
          </Button>
        </div>
      </div>

      <TopicForm
        initial={topic}
        onSubmit={handleSubmit}
        saving={saving}
        submitLabel="Speichern"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">News-Items dieses Themas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Noch keine News-Items für dieses Thema. Starten Sie eine Recherche.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Titel</th>
                    <th className="px-4 py-3 font-medium">Quelle</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const status = item.pipelineStatus || 'idle'
                    const canTrigger = !NON_TRIGGERABLE.has(status)
                    return (
                      <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/20">
                        <td className="px-4 py-3 max-w-xl">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline inline-flex items-start gap-1"
                          >
                            <span className="line-clamp-2">{item.title}</span>
                            <ExternalLink className="h-3 w-3 mt-1 flex-shrink-0 text-muted-foreground" />
                          </a>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          <div>{item.source || '–'}</div>
                          <div className="text-xs">{formatDate(item.publishedAt)}</div>
                        </td>
                        <td className="px-4 py-3">
                          {statusBadge(status)}
                          {item.pipelineError && (
                            <div
                              className="text-xs text-destructive mt-1 max-w-xs truncate"
                              title={item.pipelineError}
                            >
                              {item.pipelineError}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTriggerPipeline(item.id)}
                            disabled={!canTrigger || triggeringItemId === item.id}
                            title={
                              canTrigger
                                ? 'Pipeline starten'
                                : 'Pipeline läuft bereits oder ist abgeschlossen'
                            }
                          >
                            {triggeringItemId === item.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4 mr-1" />
                            )}
                            Verarbeiten
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
