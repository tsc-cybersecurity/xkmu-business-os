'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Lightbulb, Plus, Loader2, Sparkles } from 'lucide-react'

interface Idea {
  id: string
  rawContent: string
  structuredContent: Record<string, unknown> | null
  type: string
  status: string | null
  tags: string[] | null
  createdAt: string
}

type GroupedIdeas = Record<string, Idea[]>

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

export default function IdeasPage() {
  const [grouped, setGrouped] = useState<GroupedIdeas>({ backlog: [], in_progress: [], converted: [] })
  const [loading, setLoading] = useState(true)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newType, setNewType] = useState('text')
  const [creating, setCreating] = useState(false)

  const fetchIdeas = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/ideas?grouped=true')
      const data = await response.json()
      if (data.success) {
        setGrouped({
          backlog: data.data.backlog || [],
          in_progress: data.data.in_progress || [],
          converted: data.data.converted || [],
        })
      }
    } catch (error) {
      console.error('Failed to fetch ideas:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIdeas()
  }, [fetchIdeas])

  const handleCreate = async () => {
    if (!newContent.trim()) return
    setCreating(true)
    try {
      const response = await fetch('/api/v1/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawContent: newContent, type: newType }),
      })
      if (response.ok) {
        setNewContent('')
        setNewType('text')
        setShowNewDialog(false)
        await fetchIdeas()
      }
    } catch (error) {
      console.error('Failed to create idea:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleStatusChange = async (ideaId: string, newStatus: string) => {
    try {
      await fetch(`/api/v1/ideas/${ideaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      await fetchIdeas()
    } catch (error) {
      console.error('Failed to update idea status:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const columns = ['backlog', 'in_progress', 'converted'] as const

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ideen-Labor</h1>
          <p className="text-muted-foreground">
            Sammeln, strukturieren und konvertieren Sie Ihre Ideen
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Idee
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {columns.map((status) => (
            <div key={status} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${statusColors[status]}`} />
                <h2 className="font-semibold">{statusLabels[status]}</h2>
                <Badge variant="secondary" className="ml-auto">
                  {grouped[status]?.length || 0}
                </Badge>
              </div>

              <div className="space-y-3">
                {(grouped[status] || []).length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                      <Lightbulb className="h-8 w-8 text-muted-foreground/40" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Keine Ideen
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  (grouped[status] || []).map((idea) => (
                    <Card key={idea.id} className="transition-shadow hover:shadow-md">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/intern/ideas/${idea.id}`}
                            className="flex-1 text-sm font-medium hover:underline line-clamp-2"
                          >
                            {(idea.structuredContent as Record<string, unknown>)?.summary as string ||
                              idea.rawContent.substring(0, 100)}
                          </Link>
                          {idea.type === 'voice' && (
                            <Badge variant="outline" className="shrink-0 text-xs">
                              Sprache
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        {idea.tags && idea.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {idea.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(idea.createdAt)}
                          </span>
                          {status !== 'converted' && (
                            <Select
                              value={idea.status || 'backlog'}
                              onValueChange={(val) => handleStatusChange(idea.id, val)}
                            >
                              <SelectTrigger className="h-7 w-[130px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="backlog">Backlog</SelectItem>
                                <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {status === 'converted' && (
                            <Badge variant="default" className="bg-green-500 text-xs">
                              <Sparkles className="mr-1 h-3 w-3" />
                              Konvertiert
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Neue Idee Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Neue Idee erfassen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Beschreiben Sie Ihre Idee..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Typ:</span>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="voice">Spracheingabe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newContent.trim()}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
