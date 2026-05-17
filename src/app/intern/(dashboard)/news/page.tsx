'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2,
  Newspaper,
  RefreshCcw,
  Settings2,
  Plus,
  ExternalLink,
  Play,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react'
import { EmptyState } from '@/components/shared'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import { NewsCard, type NewsItemData } from '@/components/news/news-card'

interface TopicData {
  id: string
  name: string
  description: string | null
  color: string | null
  isActive: boolean
}

interface DashboardGroup {
  topic: TopicData
  items: NewsItemData[]
}

const POLL_INTERVAL_MS = 5000
const NON_TERMINAL: NewsItemData['pipelineStatus'][] = ['queued', 'researching', 'generating']

const STATUS_LABELS: Record<NewsItemData['pipelineStatus'], string> = {
  idle: 'Bereit',
  queued: 'Wartet',
  researching: 'Recherche…',
  generating: 'Generiert…',
  completed: 'Fertig',
  failed: 'Fehler',
}

function formatRelativeDe(value: string): string {
  try {
    const date = new Date(value)
    const diffMs = Date.now() - date.getTime()
    const diffSec = Math.round(diffMs / 1000)
    const abs = Math.abs(diffSec)
    if (abs < 60) return 'gerade eben'
    const diffMin = Math.round(diffSec / 60)
    if (Math.abs(diffMin) < 60) return `vor ${Math.abs(diffMin)} Min.`
    const diffHr = Math.round(diffMin / 60)
    if (Math.abs(diffHr) < 24) return `vor ${Math.abs(diffHr)} Std.`
    const diffDay = Math.round(diffHr / 24)
    if (Math.abs(diffDay) < 30)
      return `vor ${Math.abs(diffDay)} Tag${Math.abs(diffDay) === 1 ? '' : 'en'}`
    return date.toLocaleDateString('de-DE')
  } catch {
    return ''
  }
}

export default function NewsDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState<Set<string>>(new Set())
  const [researchingAll, setResearchingAll] = useState(false)
  const [researchingTopicId, setResearchingTopicId] = useState<string | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const url = showHidden ? '/api/v1/news/items?hidden=true' : '/api/v1/news/items'
      const response = await fetch(url)
      const json = await response.json()
      if (json.success) {
        setData(json.data ?? [])
      } else {
        toast.error(json.error?.message || 'News konnten nicht geladen werden')
      }
    } catch (error) {
      logger.error('Failed to fetch news dashboard', error, { module: 'NewsDashboardPage' })
      toast.error('News konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [showHidden])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Polling: refetch every 5s if any item is non-terminal
  useEffect(() => {
    const hasPending = data.some((group) =>
      group.items.some((it) => NON_TERMINAL.includes(it.pipelineStatus)),
    )

    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    if (hasPending) {
      pollRef.current = setInterval(() => {
        fetchData()
      }, POLL_INTERVAL_MS)
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [data, fetchData])

  const handlePipeline = useCallback(
    async (itemId: string) => {
      setTriggering((prev) => {
        const next = new Set(prev)
        next.add(itemId)
        return next
      })
      try {
        const response = await fetch(`/api/v1/news/items/${itemId}/pipeline`, {
          method: 'POST',
        })
        if (response.status === 202 || response.ok) {
          toast.success('Pipeline gestartet')
          fetchData()
        } else {
          const json = await response.json().catch(() => ({}))
          toast.error(json.error?.message || 'Pipeline konnte nicht gestartet werden')
        }
      } catch (error) {
        logger.error('Failed to trigger pipeline', error, { module: 'NewsDashboardPage' })
        toast.error('Pipeline konnte nicht gestartet werden')
      } finally {
        setTriggering((prev) => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      }
    },
    [fetchData],
  )

  const handleHide = useCallback(
    async (itemId: string) => {
      const item = data.flatMap((g) => g.items).find((i) => i.id === itemId)
      if (!item) return
      const newHiddenValue = !item.isHidden
      // optimistic update — when showHidden=false: remove if hiding (unhiding here is unreachable
      // since hidden items wouldn't be visible in that mode anyway)
      if (!showHidden && newHiddenValue) {
        setData((prev) =>
          prev.map((group) => ({
            ...group,
            items: group.items.filter((i) => i.id !== itemId),
          })),
        )
      } else {
        // update isHidden flag in place
        setData((prev) =>
          prev.map((group) => ({
            ...group,
            items: group.items.map((i) =>
              i.id === itemId ? { ...i, isHidden: newHiddenValue } : i,
            ),
          })),
        )
      }
      try {
        const response = await fetch(`/api/v1/news/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isHidden: newHiddenValue }),
        })
        if (!response.ok) {
          const json = await response.json().catch(() => ({}))
          toast.error(
            json.error?.message ||
              (newHiddenValue ? 'Verbergen fehlgeschlagen' : 'Einblenden fehlgeschlagen'),
          )
          fetchData()
        }
      } catch (error) {
        logger.error('Failed to toggle hide for news item', error, {
          module: 'NewsDashboardPage',
        })
        toast.error(newHiddenValue ? 'Verbergen fehlgeschlagen' : 'Einblenden fehlgeschlagen')
        fetchData()
      }
    },
    [data, fetchData, showHidden],
  )

  const handleDelete = useCallback(
    async (itemId: string) => {
      if (
        !confirm(
          'News-Eintrag wirklich loeschen? Verknuepfte Blog-/Social-Drafts bleiben erhalten.',
        )
      )
        return
      // Optimistic remove
      setData((prev) =>
        prev.map((group) => ({
          ...group,
          items: group.items.filter((i) => i.id !== itemId),
        })),
      )
      try {
        const response = await fetch(`/api/v1/news/items/${itemId}`, { method: 'DELETE' })
        if (!response.ok) {
          const json = await response.json().catch(() => ({}))
          toast.error(json.error?.message || 'Löschen fehlgeschlagen')
          fetchData()
        } else {
          toast.success('Gelöscht')
        }
      } catch (error) {
        logger.error('Failed to delete news item', error, { module: 'NewsDashboardPage' })
        toast.error('Löschen fehlgeschlagen')
      }
    },
    [fetchData],
  )

  const handleOpenDetail = useCallback(
    (itemId: string) => {
      router.push(`/intern/news/${itemId}`)
    },
    [router],
  )

  const handleTopicResearch = useCallback(
    async (topicId: string, topicName: string) => {
      setResearchingTopicId(topicId)
      try {
        const response = await fetch(`/api/v1/news/topics/${topicId}/research`, {
          method: 'POST',
        })
        const json = await response.json()
        if (json.success) {
          const { inserted = 0, skipped = 0 } = json.data ?? {}
          toast.success(`Recherche "${topicName}": ${inserted} neu, ${skipped} übersprungen`)
          fetchData()
        } else {
          toast.error(json.error?.message || 'Recherche fehlgeschlagen')
        }
      } catch (error) {
        logger.error('Failed to run topic research', error, { module: 'NewsDashboardPage' })
        toast.error('Recherche fehlgeschlagen')
      } finally {
        setResearchingTopicId(null)
      }
    },
    [fetchData],
  )

  const handleAllResearch = useCallback(async () => {
    setResearchingAll(true)
    try {
      const response = await fetch('/api/v1/news/research', { method: 'POST' })
      const json = await response.json()
      if (json.success) {
        const summary: { inserted?: number; skipped?: number; error?: string }[] =
          json.data?.summary ?? []
        const inserted = summary.reduce((acc, s) => acc + (s.inserted || 0), 0)
        const skipped = summary.reduce((acc, s) => acc + (s.skipped || 0), 0)
        toast.success(`Recherche fertig: ${inserted} neu, ${skipped} übersprungen`)
        fetchData()
      } else {
        toast.error(json.error?.message || 'Recherche fehlgeschlagen')
      }
    } catch (error) {
      logger.error('Failed to run all-topics research', error, { module: 'NewsDashboardPage' })
      toast.error('Recherche fehlgeschlagen')
    } finally {
      setResearchingAll(false)
    }
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const activeGroups = data.filter((g) => g.topic.isActive)

  // Flat list for the Liste-Tab, sorted by publishedAt desc, then createdAt desc (createdAt
  // is not part of NewsItemData -- fallback to id stability via stable sort).
  const flatItems = activeGroups
    .flatMap((g) => g.items.map((item) => ({ item, topic: g.topic })))
    .sort((a, b) => {
      const aTs = a.item.publishedAt ? new Date(a.item.publishedAt).getTime() : 0
      const bTs = b.item.publishedAt ? new Date(b.item.publishedAt).getTime() : 0
      return bTs - aTs
    })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Newspaper className="h-8 w-8" />
            News-Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Recherchierte News nach Themenbereichen — Pipeline pro Karte starten.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="rounded"
            />
            Ausgeblendete einblenden
          </label>
          <Link href="/intern/news/topics">
            <Button variant="outline">
              <Settings2 className="h-4 w-4 mr-2" />
              Themen verwalten
            </Button>
          </Link>
          <Button onClick={handleAllResearch} disabled={researchingAll}>
            {researchingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4 mr-2" />
            )}
            Alle aktiven recherchieren
          </Button>
        </div>
      </div>

      {activeGroups.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Noch keine aktiven Themen"
          description="Legen Sie ein erstes Thema an, um die automatische News-Recherche zu starten."
          action={
            <Link href="/intern/news/topics">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Themen anlegen
              </Button>
            </Link>
          }
        />
      ) : (
        <Tabs defaultValue="columns" className="w-full">
          <TabsList>
            <TabsTrigger value="columns">Themenbereiche</TabsTrigger>
            <TabsTrigger value="list">Liste</TabsTrigger>
          </TabsList>

          <TabsContent value="columns">
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4 min-w-max">
                {activeGroups.map(({ topic, items }) => (
                  <div
                    key={topic.id}
                    className="w-[320px] shrink-0 flex flex-col rounded-lg bg-muted/30 border"
                  >
                    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="inline-block w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: topic.color || '#3b82f6' }}
                          aria-hidden="true"
                        />
                        <span className="font-medium text-sm truncate" title={topic.name}>
                          {topic.name}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          ({items.length})
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleTopicResearch(topic.id, topic.name)}
                        disabled={researchingTopicId === topic.id}
                        title="Recherche für dieses Thema"
                      >
                        {researchingTopicId === topic.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCcw className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <div className="flex-1 p-2 space-y-2">
                      {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">
                          Noch keine News
                        </p>
                      ) : (
                        items.map((item) => (
                          <NewsCard
                            key={item.id}
                            item={item}
                            onPipeline={handlePipeline}
                            onHide={handleHide}
                            onDelete={handleDelete}
                            onOpenDetail={handleOpenDetail}
                            triggering={triggering.has(item.id)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list">
            {flatItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Noch keine News in den aktiven Themen.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium">Themenbereich</th>
                      <th className="px-3 py-2 font-medium">Titel</th>
                      <th className="px-3 py-2 font-medium">Quelle</th>
                      <th className="px-3 py-2 font-medium">Veröffentlicht</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatItems.map(({ item, topic }) => {
                      const status = item.pipelineStatus
                      const isPulsing =
                        status === 'queued' ||
                        status === 'researching' ||
                        status === 'generating'
                      const canTrigger = status === 'idle' || status === 'failed'
                      const badgeVariant:
                        | 'default'
                        | 'secondary'
                        | 'destructive'
                        | 'outline' =
                        status === 'completed'
                          ? 'default'
                          : status === 'failed'
                            ? 'destructive'
                            : status === 'idle'
                              ? 'secondary'
                              : 'outline'
                      return (
                        <tr
                          key={item.id}
                          className={cn(
                            'border-b last:border-b-0 hover:bg-muted/50',
                            item.isHidden && 'opacity-60',
                          )}
                        >
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: topic.color || '#3b82f6' }}
                                aria-hidden="true"
                              />
                              <span className="truncate" title={topic.name}>
                                {topic.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 max-w-[480px]">
                            <button
                              onClick={() => handleOpenDetail(item.id)}
                              className="text-left font-medium hover:underline line-clamp-2"
                              title={item.title}
                            >
                              {item.title}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[180px]">
                            <span className="truncate block" title={item.source ?? ''}>
                              {item.source || '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {item.publishedAt ? formatRelativeDe(item.publishedAt) : '—'}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant={badgeVariant}
                              className={cn('text-xs', isPulsing && 'animate-pulse')}
                            >
                              {STATUS_LABELS[status]}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center h-7 w-7"
                                title="Quelle öffnen"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canTrigger || triggering.has(item.id)}
                                onClick={() => handlePipeline(item.id)}
                                title="Verarbeiten"
                                className="h-7 w-7 p-0"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleHide(item.id)}
                                title={item.isHidden ? 'Wieder einblenden' : 'Verbergen'}
                                className="h-7 w-7 p-0"
                              >
                                {item.isHidden ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(item.id)}
                                title="Löschen"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
