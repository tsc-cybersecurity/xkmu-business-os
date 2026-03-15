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
import { Newspaper, Plus, Loader2, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface BlogPost {
  id: string
  title: string
  slug: string
  status: string | null
  source: string | null
  category: string | null
  publishedAt: string | null
  updatedAt: string | null
}

const sourceLabels: Record<string, string> = {
  manual: 'Manuell',
  ai: 'KI',
  api: 'API',
}

export default function BlogPostsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/blog/posts?limit=50')
      const data = await response.json()
      if (data.success) setPosts(data.data)
    } catch (error) {
      logger.error('Failed to fetch blog posts', error, { module: 'BlogPage' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handlePublish = async (id: string, unpublish = false) => {
    try {
      await fetch(`/api/v1/blog/posts/${id}/publish${unpublish ? '?unpublish=true' : ''}`, {
        method: 'POST',
      })
      fetchPosts()
    } catch (error) {
      logger.error('Failed to publish/unpublish', error, { module: 'BlogPage' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Beitrag wirklich loeschen?')) return
    try {
      await fetch(`/api/v1/blog/posts/${id}`, { method: 'DELETE' })
      fetchPosts()
    } catch (error) {
      logger.error('Failed to delete post', error, { module: 'BlogPage' })
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
            <Newspaper className="h-8 w-8" />
            Blog / IT-News
          </h1>
          <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Blog-Beitraege</p>
        </div>
        <Link href="/intern/blog/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Neuer Beitrag
          </Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quelle</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Letzte Aenderung</TableHead>
              <TableHead className="w-[160px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Noch keine Blog-Beitraege vorhanden
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell>
                    <Badge variant={post.status === 'published' ? 'default' : post.status === 'archived' ? 'outline' : 'secondary'}>
                      {post.status === 'published' ? 'Veroeffentlicht' : post.status === 'archived' ? 'Archiviert' : 'Entwurf'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{sourceLabels[post.source || 'manual'] || post.source}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{post.category || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {post.updatedAt
                      ? new Date(post.updatedAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/intern/blog/${post.id}`}>
                        <Button variant="ghost" size="icon" title="Bearbeiten">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={post.status === 'published' ? 'Zurueckziehen' : 'Veroeffentlichen'}
                        onClick={() => handlePublish(post.id, post.status === 'published')}
                      >
                        {post.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
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
