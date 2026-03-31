'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface BlogPost {
  id: string; title: string; slug: string; excerpt: string | null
  featuredImage: string | null; featuredImageAlt: string | null
  category: string | null; tags: string[]; publishedAt: string | null
}

export interface BlogListingBlockContent {
  title?: string
  subtitle?: string
  columns?: 1 | 2 | 3 | 4
  postsPerPage?: number
  showLoadMore?: boolean
  showCategory?: boolean
  showTags?: boolean
  showDate?: boolean
  linkPrefix?: string
}

interface BlogListingBlockProps {
  content: BlogListingBlockContent
  settings?: Record<string, unknown>
}

export function BlogListingBlock({ content, settings }: BlogListingBlockProps) {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const cols = content.columns || 3
  const perPage = content.postsPerPage || 6
  const showLoadMore = content.showLoadMore !== false
  const linkPrefix = content.linkPrefix || '/it-news'
  const showCategory = content.showCategory !== false
  const showTags = content.showTags !== false
  const showDate = content.showDate !== false

  const gridClass = cols === 1 ? 'max-w-2xl mx-auto' : cols === 2 ? 'md:grid-cols-2' : cols === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3'

  useEffect(() => {
    loadPosts(1, true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadPosts = async (p: number, reset = false) => {
    if (reset) setLoading(true)
    else setLoadingMore(true)

    try {
      const res = await fetch(`/api/v1/public/blog/posts?page=${p}&limit=${perPage}`)
      const data = await res.json()
      if (data.success) {
        const items = data.data || []
        setPosts(prev => reset ? items : [...prev, ...items])
        setHasMore((data.meta?.page || 1) < (data.meta?.totalPages || 1))
        setPage(p)
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setLoadingMore(false) }
  }

  return (
    <section
      className="container mx-auto px-4 py-12"
      style={{
        paddingTop: settings?.paddingTop ? `${settings.paddingTop}px` : undefined,
        paddingBottom: settings?.paddingBottom ? `${settings.paddingBottom}px` : undefined,
      }}
    >
      {(content.title || content.subtitle) && (
        <div className="text-center mb-10">
          {content.title && <h2 className="text-3xl font-bold mb-2">{content.title}</h2>}
          {content.subtitle && <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{content.subtitle}</p>}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Noch keine Beitraege veroeffentlicht.</div>
      ) : (
        <>
          <div className={`grid gap-6 ${gridClass}`}>
            {posts.map(post => (
              <Link key={post.id} href={`${linkPrefix}/${post.slug}`} className="group">
                <div className="rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
                  {post.featuredImage && (
                    <div className="relative aspect-video overflow-hidden">
                      <Image src={post.featuredImage} alt={post.featuredImageAlt || post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                    </div>
                  )}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {showDate && post.publishedAt && (
                        <span className="text-xs text-muted-foreground">{new Date(post.publishedAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                      )}
                      {showCategory && post.category && <Badge variant="outline" className="text-xs">{post.category}</Badge>}
                    </div>
                    <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">{post.title}</h3>
                    {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-3 flex-1">{post.excerpt}</p>}
                    {showTags && post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">{post.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {showLoadMore && hasMore && (
            <div className="flex justify-center mt-8">
              <Button variant="outline" size="lg" onClick={() => loadPosts(page + 1)} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Mehr laden
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
