'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Share2, Plus, Loader2, Pencil, Trash2, CalendarDays, Tags } from 'lucide-react'
import { toast } from 'sonner'

interface Post {
  id: string
  platform: string
  title: string | null
  content: string
  status: string | null
  hashtags: string[] | null
  aiGenerated: boolean | null
  scheduledAt: string | null
  createdAt: string | null
}

interface Topic {
  id: string
  name: string
  color: string | null
}

const platformLabels: Record<string, string> = {
  linkedin: 'LinkedIn',
  twitter: 'Twitter/X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  xing: 'XING',
}

const statusLabels: Record<string, string> = {
  draft: 'Entwurf',
  scheduled: 'Geplant',
  posted: 'Gepostet',
  failed: 'Fehlgeschlagen',
}

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  scheduled: 'outline',
  posted: 'default',
  failed: 'destructive',
}

export default function SocialMediaPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (platformFilter !== 'all') params.set('platform', platformFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const [postsRes, topicsRes] = await Promise.all([
        fetch(`/api/v1/social-media/posts?${params}`),
        fetch('/api/v1/social-media/topics'),
      ])
      const postsData = await postsRes.json()
      const topicsData = await topicsRes.json()
      if (postsData.success) setPosts(postsData.data)
      if (topicsData.success) setTopics(topicsData.data)
    } catch (error) {
      console.error('Failed to fetch social media data:', error)
    } finally {
      setLoading(false)
    }
  }, [platformFilter, statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: string) => {
    if (!confirm('Beitrag wirklich loeschen?')) return
    try {
      await fetch(`/api/v1/social-media/posts/${id}`, { method: 'DELETE' })
      toast.success('Beitrag geloescht')
      fetchData()
    } catch {
      toast.error('Loeschen fehlgeschlagen')
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Share2 className="h-8 w-8" />
            Social Media
          </h1>
          <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Social-Media-Beitraege</p>
        </div>
        <div className="flex gap-2">
          <Link href="/intern/social-media/topics">
            <Button variant="outline">
              <Tags className="h-4 w-4 mr-2" />
              Themen
            </Button>
          </Link>
          <Link href="/intern/social-media/content-plan">
            <Button variant="outline">
              <CalendarDays className="h-4 w-4 mr-2" />
              Contentplan
            </Button>
          </Link>
          <Link href="/intern/social-media/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Neuer Beitrag
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-3">
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Plattform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Plattformen</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="twitter">Twitter/X</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="xing">XING</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="draft">Entwurf</SelectItem>
            <SelectItem value="scheduled">Geplant</SelectItem>
            <SelectItem value="posted">Gepostet</SelectItem>
            <SelectItem value="failed">Fehlgeschlagen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plattform</TableHead>
              <TableHead>Inhalt</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Erstellt</TableHead>
              <TableHead className="w-[100px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Noch keine Beitraege vorhanden
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{platformLabels[post.platform] || post.platform}</Badge>
                      {post.aiGenerated && <Badge variant="secondary">KI</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[400px]">
                    <p className="text-sm font-medium truncate">{post.title || post.content.substring(0, 80)}</p>
                    {post.hashtags && post.hashtags.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {post.hashtags.join(' ')}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[post.status || 'draft']}>
                      {statusLabels[post.status || 'draft']}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {post.createdAt
                      ? new Date(post.createdAt).toLocaleDateString('de-DE', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                        })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/intern/social-media/${post.id}`}>
                        <Button variant="ghost" size="icon" title="Bearbeiten">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" title="Loeschen" onClick={() => handleDelete(post.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
