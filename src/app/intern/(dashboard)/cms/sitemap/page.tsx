'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Map as MapIcon, ExternalLink, Search } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface Entry {
  id: string
  slug: string
  title: string
  status: string | null
  inSitemap: boolean
  updatedAt: string | null
}

interface SitemapData {
  cmsPages: Entry[]
  blogPosts: Entry[]
}

type EntityType = 'cms_page' | 'blog_post'

export default function CmsSitemapPage() {
  const [data, setData] = useState<SitemapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'in' | 'out' | 'published'>('all')
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/cms/sitemap')
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch (e) {
      logger.error('Failed to load sitemap overview', e, { module: 'CmsSitemapPage' })
      toast.error('Sitemap-Übersicht konnte nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggle = async (type: EntityType, entry: Entry) => {
    const next = !entry.inSitemap
    setPendingIds((prev) => new Set(prev).add(entry.id))
    // Optimistic UI
    setData((d) => {
      if (!d) return d
      const list = type === 'cms_page' ? 'cmsPages' : 'blogPosts'
      return {
        ...d,
        [list]: d[list].map((e) => (e.id === entry.id ? { ...e, inSitemap: next } : e)),
      } as SitemapData
    })
    try {
      const res = await fetch('/api/v1/cms/sitemap', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id: entry.id, inSitemap: next }),
      })
      if (!res.ok) throw new Error('update_failed')
    } catch (e) {
      logger.error('Toggle failed, reverting', e, { module: 'CmsSitemapPage' })
      toast.error('Speichern fehlgeschlagen')
      // Revert
      setData((d) => {
        if (!d) return d
        const list = type === 'cms_page' ? 'cmsPages' : 'blogPosts'
        return {
          ...d,
          [list]: d[list].map((e) => (e.id === entry.id ? { ...e, inSitemap: entry.inSitemap } : e)),
        } as SitemapData
      })
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(entry.id)
        return next
      })
    }
  }

  const matches = (e: Entry): boolean => {
    if (search) {
      const s = search.toLowerCase()
      if (!e.title.toLowerCase().includes(s) && !e.slug.toLowerCase().includes(s)) return false
    }
    if (filter === 'in' && !e.inSitemap) return false
    if (filter === 'out' && e.inSitemap) return false
    if (filter === 'published' && e.status !== 'published') return false
    return true
  }

  const filteredCms = useMemo(() => data?.cmsPages.filter(matches) ?? [], [data, search, filter])
  const filteredBlog = useMemo(() => data?.blogPosts.filter(matches) ?? [], [data, search, filter])

  const totalSelected = (data?.cmsPages.filter((e) => e.inSitemap && e.status === 'published').length ?? 0)
    + (data?.blogPosts.filter((e) => e.inSitemap && e.status === 'published').length ?? 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <MapIcon className="h-7 w-7 text-primary" />
            Sitemap-Verwaltung
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pro Seite und Blog-Beitrag entscheiden, ob er in <code className="text-xs">/sitemap.xml</code> erscheint.
            Aktuell <strong>{totalSelected}</strong> publizierte Einträge in der Sitemap.
            <a href="/sitemap.xml" target="_blank" rel="noopener" className="ml-2 inline-flex items-center gap-1 underline hover:no-underline">
              <ExternalLink className="h-3 w-3" /> sitemap.xml öffnen
            </a>
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Titel oder Slug suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {([
            { v: 'all', label: 'Alle' },
            { v: 'in', label: 'In Sitemap' },
            { v: 'out', label: 'Ausgeschlossen' },
            { v: 'published', label: 'Nur publiziert' },
          ] as const).map((opt) => (
            <Button
              key={opt.v}
              variant={filter === opt.v ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(opt.v)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <SectionCard
        title="CMS-Seiten"
        description="Statische Seiten aus dem CMS (Über uns, Leistungen, Kontakt, ...)"
        entries={filteredCms}
        type="cms_page"
        editLinkBase="/intern/cms"
        publicLinkBase=""
        pendingIds={pendingIds}
        onToggle={toggle}
      />

      <SectionCard
        title="Blog-Beiträge"
        description="Artikel im /blog-Bereich"
        entries={filteredBlog}
        type="blog_post"
        editLinkBase="/intern/blog"
        publicLinkBase="/blog/"
        pendingIds={pendingIds}
        onToggle={toggle}
      />
    </div>
  )
}

function SectionCard({
  title, description, entries, type, editLinkBase, publicLinkBase, pendingIds, onToggle,
}: {
  title: string
  description: string
  entries: Entry[]
  type: EntityType
  editLinkBase: string
  publicLinkBase: string
  pendingIds: Set<string>
  onToggle: (type: EntityType, entry: Entry) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {entries.filter((e) => e.inSitemap).length} / {entries.length}
          </span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Keine Einträge</p>
        ) : (
          <div className="divide-y">
            {entries.map((e) => {
              const pending = pendingIds.has(e.id)
              const isPublished = e.status === 'published'
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 py-2 px-1 hover:bg-muted/30 rounded transition-colors"
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={e.inSitemap}
                    disabled={pending}
                    onClick={() => onToggle(type, e)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      e.inSitemap ? 'bg-primary' : 'bg-muted'
                    } ${pending ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                        e.inSitemap ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{e.title}</span>
                      <Badge variant={isPublished ? 'default' : 'secondary'} className="text-[10px]">
                        {isPublished ? 'Publiziert' : (e.status ?? 'draft')}
                      </Badge>
                      {!isPublished && e.inSitemap && (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                          (nur publiziert landen in Sitemap)
                        </Badge>
                      )}
                    </div>
                    <code className="text-xs text-muted-foreground truncate block">
                      {publicLinkBase}{e.slug}
                    </code>
                  </div>
                  <Link
                    href={`${editLinkBase}/${e.id}`}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-2"
                  >
                    Bearbeiten →
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
