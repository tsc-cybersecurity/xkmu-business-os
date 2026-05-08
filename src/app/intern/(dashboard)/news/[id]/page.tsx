'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  ArrowLeft,
  ExternalLink,
  Play,
  EyeOff,
  FileText,
  Share2,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'

type PipelineStatus =
  | 'idle'
  | 'queued'
  | 'researching'
  | 'generating'
  | 'completed'
  | 'failed'

interface NewsItemDetail {
  id: string
  topicId: string
  title: string
  url: string
  snippet: string | null
  source: string | null
  imageUrl: string | null
  publishedAt: string | null
  pipelineStatus: PipelineStatus
  pipelineError: string | null
  pipelineTaskId: string | null
  researchData: {
    summary?: string
    keyPoints?: string[]
    sources?: Array<{ title?: string; url?: string } | string>
    context?: string
  } | null
  isHidden: boolean | null
  createdAt: string | null
  updatedAt: string | null
}

interface BlogDraft {
  id: string
  title: string
  status: string | null
  createdAt: string | null
}

interface SocialDraft {
  id: string
  platform: string
  content: string
  status: string | null
  createdAt: string | null
}

interface DetailPayload {
  item: NewsItemDetail
  drafts: {
    blog: BlogDraft[]
    social: SocialDraft[]
  }
}

const STATUS_LABELS: Record<PipelineStatus, string> = {
  idle: 'Bereit',
  queued: 'Wartet',
  researching: 'Recherche…',
  generating: 'Generiert…',
  completed: 'Fertig',
  failed: 'Fehler',
}

function statusBadgeVariant(
  status: PipelineStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'completed') return 'default'
  if (status === 'failed') return 'destructive'
  if (status === 'idle') return 'secondary'
  return 'outline'
}

function formatDateTimeDe(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

export default function NewsDetailPage() {
  const params = useParams<{ id: string }>()
  const itemId = params?.id as string

  const [data, setData] = useState<DetailPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [hiding, setHiding] = useState(false)

  const fetchDetail = useCallback(async () => {
    if (!itemId) return
    try {
      const response = await fetch(`/api/v1/news/items/${itemId}`)
      const json = await response.json()
      if (json.success) {
        setData(json.data as DetailPayload)
      } else {
        toast.error(json.error?.message || 'News-Item konnte nicht geladen werden')
      }
    } catch (error) {
      logger.error('Failed to fetch news item detail', error, {
        module: 'NewsDetailPage',
      })
      toast.error('News-Item konnte nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const handlePipeline = useCallback(async () => {
    if (!itemId) return
    setTriggering(true)
    try {
      const response = await fetch(`/api/v1/news/items/${itemId}/pipeline`, {
        method: 'POST',
      })
      if (response.status === 202 || response.ok) {
        toast.success('Pipeline gestartet')
        fetchDetail()
      } else {
        const json = await response.json().catch(() => ({}))
        toast.error(json.error?.message || 'Pipeline konnte nicht gestartet werden')
      }
    } catch (error) {
      logger.error('Failed to trigger pipeline', error, { module: 'NewsDetailPage' })
      toast.error('Pipeline konnte nicht gestartet werden')
    } finally {
      setTriggering(false)
    }
  }, [itemId, fetchDetail])

  const handleHide = useCallback(async () => {
    if (!itemId) return
    setHiding(true)
    try {
      const response = await fetch(`/api/v1/news/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHidden: true }),
      })
      if (response.ok) {
        toast.success('News-Item verborgen')
        fetchDetail()
      } else {
        const json = await response.json().catch(() => ({}))
        toast.error(json.error?.message || 'Verbergen fehlgeschlagen')
      }
    } catch (error) {
      logger.error('Failed to hide news item', error, { module: 'NewsDetailPage' })
      toast.error('Verbergen fehlgeschlagen')
    } finally {
      setHiding(false)
    }
  }, [itemId, fetchDetail])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Link
          href="/intern/news"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Zurück
        </Link>
        <p className="text-muted-foreground">News-Item nicht gefunden.</p>
      </div>
    )
  }

  const { item, drafts } = data
  const status = item.pipelineStatus
  const isPulsing =
    status === 'queued' || status === 'researching' || status === 'generating'
  const canTrigger = status === 'idle' || status === 'failed'
  const research = item.researchData

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/intern/news"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Zurück
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0 space-y-2">
          <h1 className="text-2xl font-bold leading-tight">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline inline-flex items-start gap-2"
            >
              <span>{item.title}</span>
              <ExternalLink className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
            </a>
          </h1>
          <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
            {item.source && <span>{item.source}</span>}
            {item.source && item.publishedAt && <span>·</span>}
            {item.publishedAt && <span>{formatDateTimeDe(item.publishedAt)}</span>}
            <Badge
              variant={statusBadgeVariant(status)}
              className={cn(isPulsing && 'animate-pulse')}
            >
              {STATUS_LABELS[status]}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handlePipeline}
            disabled={!canTrigger || triggering}
            title={
              canTrigger
                ? 'Pipeline starten'
                : 'Pipeline nicht verfügbar (läuft oder ist bereits abgeschlossen)'
            }
          >
            {triggering ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Verarbeiten
          </Button>
          <Button variant="outline" onClick={handleHide} disabled={hiding}>
            {hiding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <EyeOff className="h-4 w-4 mr-2" />
            )}
            Verbergen
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Inhalt</TabsTrigger>
          <TabsTrigger value="drafts">
            Entwürfe ({drafts.blog.length + drafts.social.length})
          </TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline-Log</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          {item.snippet && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Snippet</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {item.snippet}
                </p>
              </CardContent>
            </Card>
          )}

          {research ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recherche</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {research.summary && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Zusammenfassung</h4>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                      {research.summary}
                    </p>
                  </div>
                )}

                {Array.isArray(research.keyPoints) && research.keyPoints.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Kernpunkte</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                      {research.keyPoints.map((kp, idx) => (
                        <li key={idx}>{kp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {research.context && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Kontext</h4>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                      {research.context}
                    </p>
                  </div>
                )}

                {Array.isArray(research.sources) && research.sources.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Quellen</h4>
                    <ul className="space-y-1 text-sm">
                      {research.sources.map((src, idx) => {
                        const url = typeof src === 'string' ? src : src?.url
                        const title =
                          typeof src === 'string' ? src : src?.title || src?.url
                        if (!url) {
                          return (
                            <li key={idx} className="text-muted-foreground">
                              {title}
                            </li>
                          )
                        }
                        return (
                          <li key={idx}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              {title || url}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-6">
                <p className="text-sm text-muted-foreground italic">
                  Recherche noch nicht ausgeführt
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          {drafts.blog.length === 0 && drafts.social.length === 0 ? (
            <Card>
              <CardContent className="py-6">
                <p className="text-sm text-muted-foreground italic">
                  Noch keine Entwürfe vorhanden. Pipeline starten, um Inhalte zu generieren.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {drafts.blog.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Blog-Entwürfe ({drafts.blog.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {drafts.blog.map((b) => (
                        <li
                          key={b.id}
                          className="flex items-center justify-between gap-2 border-b pb-2 last:border-0 last:pb-0"
                        >
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/intern/blog/${b.id}`}
                              className="text-sm font-medium hover:underline truncate block"
                            >
                              {b.title}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTimeDe(b.createdAt)}
                            </p>
                          </div>
                          {b.status && (
                            <Badge variant="outline" className="text-xs">
                              {b.status}
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {drafts.social.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Share2 className="h-4 w-4" />
                      Social-Media-Entwürfe ({drafts.social.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {drafts.social.map((s) => (
                        <li
                          key={s.id}
                          className="border-b pb-3 last:border-0 last:pb-0 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {s.platform}
                              </Badge>
                              {s.status && (
                                <Badge variant="outline" className="text-xs">
                                  {s.status}
                                </Badge>
                              )}
                            </div>
                            <Link
                              href={`/intern/social-media/${s.id}`}
                              className="text-xs text-primary hover:underline"
                            >
                              Bearbeiten
                            </Link>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                            {s.content}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTimeDe(s.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pipeline-Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-32 shrink-0">Status:</span>
                <Badge
                  variant={statusBadgeVariant(status)}
                  className={cn(isPulsing && 'animate-pulse')}
                >
                  {STATUS_LABELS[status]}
                </Badge>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-muted-foreground w-32 shrink-0">Task-ID:</span>
                <input
                  type="text"
                  readOnly
                  value={item.pipelineTaskId || '—'}
                  className="flex-1 bg-muted rounded px-2 py-1 text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-32 shrink-0">Erstellt:</span>
                <span>{formatDateTimeDe(item.createdAt)}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-32 shrink-0">Aktualisiert:</span>
                <span>{formatDateTimeDe(item.updatedAt)}</span>
              </div>

              {item.pipelineError && (
                <div>
                  <span className="text-muted-foreground block mb-1">Fehler:</span>
                  <pre className="bg-destructive/10 text-destructive rounded p-3 text-xs overflow-auto whitespace-pre-wrap">
                    {item.pipelineError}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
