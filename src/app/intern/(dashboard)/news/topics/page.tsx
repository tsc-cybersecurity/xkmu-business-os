'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  RefreshCcw,
  Newspaper,
} from 'lucide-react'
import { EmptyState } from '@/components/shared'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface NewsTopic {
  id: string
  name: string
  description: string | null
  color: string | null
  keywords: string[] | null
  sourceType: string
  sourceConfig: Record<string, unknown> | null
  isActive: boolean
  sortOrder: number
  createdAt: string | null
}

interface ResearchResult {
  topicId: string
  inserted: number
  skipped: number
  error?: string
}

const DEFAULT_FORM = {
  name: '',
  description: '',
  color: '#3b82f6',
  keywords: '',
}

function truncate(value: string, max = 60): string {
  if (value.length <= max) return value
  return value.slice(0, max - 1) + '…'
}

function formatDate(value: string | null): string {
  if (!value) return '–'
  try {
    return new Date(value).toLocaleDateString('de-DE')
  } catch {
    return '–'
  }
}

export default function NewsTopicsPage() {
  const router = useRouter()
  const [topics, setTopics] = useState<NewsTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [researchingAll, setResearchingAll] = useState(false)
  const [researchingId, setResearchingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...DEFAULT_FORM })

  const fetchTopics = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/news/topics')
      const data = await response.json()
      if (data.success) setTopics(data.data)
      else toast.error(data.error?.message || 'Themen konnten nicht geladen werden')
    } catch (error) {
      logger.error('Failed to fetch news topics', error, { module: 'NewsTopicsPage' })
      toast.error('Themen konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTopics()
  }, [fetchTopics])

  const handleDialogClose = (open: boolean) => {
    setShowDialog(open)
    if (!open) setForm({ ...DEFAULT_FORM })
  }

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Name ist erforderlich')
      return
    }
    const keywords = form.keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)

    setSaving(true)
    try {
      const response = await fetch('/api/v1/news/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          color: form.color,
          keywords,
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Thema erstellt')
        setShowDialog(false)
        setForm({ ...DEFAULT_FORM })
        fetchTopics()
      } else {
        toast.error(data.error?.message || 'Fehler beim Speichern')
      }
    } catch (error) {
      logger.error('Failed to create news topic', error, { module: 'NewsTopicsPage' })
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Thema "${name}" wirklich löschen?`)) return
    try {
      const response = await fetch(`/api/v1/news/topics/${id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({ success: response.ok }))
      if (response.ok && data.success !== false) {
        toast.success('Thema gelöscht')
        fetchTopics()
      } else {
        toast.error(data.error?.message || 'Löschen fehlgeschlagen')
      }
    } catch (error) {
      logger.error('Failed to delete news topic', error, { module: 'NewsTopicsPage' })
      toast.error('Löschen fehlgeschlagen')
    }
  }

  const handleResearchTopic = async (id: string, name: string) => {
    setResearchingId(id)
    try {
      const response = await fetch(`/api/v1/news/topics/${id}/research`, { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        const { inserted = 0, skipped = 0 } = data.data ?? {}
        toast.success(`Recherche "${name}": ${inserted} neu, ${skipped} übersprungen`)
      } else {
        toast.error(data.error?.message || 'Recherche fehlgeschlagen')
      }
    } catch (error) {
      logger.error('Failed to run topic research', error, { module: 'NewsTopicsPage' })
      toast.error('Recherche fehlgeschlagen')
    } finally {
      setResearchingId(null)
    }
  }

  const handleResearchAll = async () => {
    setResearchingAll(true)
    try {
      const response = await fetch('/api/v1/news/research', { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        const summary: ResearchResult[] = data.data?.summary ?? []
        const inserted = summary.reduce((acc, s) => acc + (s.inserted || 0), 0)
        const skipped = summary.reduce((acc, s) => acc + (s.skipped || 0), 0)
        const failed = summary.filter((s) => s.error).length
        toast.success(
          `Recherche fertig: ${summary.length} Themen, ${inserted} neu, ${skipped} übersprungen${failed ? `, ${failed} Fehler` : ''}`,
        )
      } else {
        toast.error(data.error?.message || 'Recherche fehlgeschlagen')
      }
    } catch (error) {
      logger.error('Failed to run all-topics research', error, { module: 'NewsTopicsPage' })
      toast.error('Recherche fehlgeschlagen')
    } finally {
      setResearchingAll(false)
    }
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/intern/news">
            <Button variant="ghost" size="icon" aria-label="Zurück zum Dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Newspaper className="h-8 w-8" />
              News-Themen
            </h1>
            <p className="text-muted-foreground mt-1">
              Verwalten Sie Themen für die automatische News-Recherche
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleResearchAll} disabled={researchingAll}>
            {researchingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4 mr-2" />
            )}
            Alle aktiven recherchieren
          </Button>
          <Dialog open={showDialog} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Neues Thema
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neues Thema erstellen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topic-name">Name *</Label>
                  <Input
                    id="topic-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="z. B. KI im Mittelstand"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topic-description">Beschreibung</Label>
                  <Textarea
                    id="topic-description"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Optionale Beschreibung"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topic-color">Farbe</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="topic-color"
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                      className="h-10 w-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={form.color}
                      onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                      placeholder="#3b82f6"
                      className="w-32"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topic-keywords">Keywords (kommagetrennt)</Label>
                  <Input
                    id="topic-keywords"
                    value={form.keywords}
                    onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                    placeholder="KI, Mittelstand, Digitalisierung"
                  />
                  <p className="text-xs text-muted-foreground">
                    Weitere Quellen-Konfiguration auf der Detailseite.
                  </p>
                </div>
                <Button onClick={handleCreate} disabled={saving} className="w-full">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Erstellen
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Themenliste</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {topics.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              title="Noch keine Themen vorhanden"
              description="Legen Sie ein erstes Thema an, um die automatische News-Recherche zu starten."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium w-8"></th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Keywords</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Erstellt</th>
                    <th className="px-4 py-3 font-medium text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.map((topic) => {
                    const keywordList = (topic.keywords ?? []).join(', ')
                    return (
                      <tr key={topic.id} className="border-b last:border-b-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <span
                            className="inline-block w-3 h-3 rounded-full"
                            style={{ backgroundColor: topic.color || '#3b82f6' }}
                            aria-hidden="true"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">{topic.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {keywordList ? truncate(keywordList, 60) : '–'}
                        </td>
                        <td className="px-4 py-3">
                          {topic.isActive ? (
                            <Badge variant="default">Aktiv</Badge>
                          ) : (
                            <Badge variant="secondary">Inaktiv</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(topic.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResearchTopic(topic.id, topic.name)}
                              disabled={researchingId === topic.id}
                              aria-label="Recherche starten"
                            >
                              {researchingId === topic.id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <RefreshCcw className="h-4 w-4 mr-1" />
                              )}
                              Recherche
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Bearbeiten"
                              onClick={() => router.push(`/intern/news/topics/${topic.id}`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Löschen"
                              onClick={() => handleDelete(topic.id, topic.name)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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
        </CardContent>
      </Card>
    </div>
  )
}
