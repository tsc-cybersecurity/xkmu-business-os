'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  featuredImage: string | null
  featuredImageAlt: string | null
  category: string | null
  tags: string[]
  publishedAt: string | null
}

export interface MagazineBlockContent {
  /** Ueberschrift ueber dem Magazin-Layout (z.B. "Aktuelle Beiträge"). */
  title?: string
  /** Pool an Kategorien, der als Filter-Tabs angezeigt wird. Leer/unset =
   *  alle aktiven Blog-Kategorien werden geladen. */
  categories?: string[]
  /** Default-Anzahl Sidebar-Items rechts neben dem Hero. 0 = keine Sidebar. */
  sidebarCount?: number
  /** Anzahl Karten im unteren Grid. 0 = kein Grid. */
  gridCount?: number
  /** "Alle"-Tab anzeigen, der die Kategoriefilter aufhebt. */
  showAllTab?: boolean
  /** URL-Prefix fuer Beitrags-Links. Default /it-news (Bestands-Routing). */
  linkPrefix?: string
  /** Optionaler Autor/Quelle unter dem Titel (z.B. "xKMU Redaktion"). */
  defaultAuthor?: string
  /** Datum statt Autor anzeigen (z.B. "12. Mai 2026"). */
  showDate?: boolean
}

interface MagazineBlockProps {
  content: MagazineBlockContent
  settings?: Record<string, unknown>
}

const DEFAULT_CATEGORY_POOL_LIMIT = 8

function formatDate(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

export function MagazineBlock({ content, settings }: MagazineBlockProps) {
  const sidebarCount = content.sidebarCount ?? 3
  const gridCount = content.gridCount ?? 6
  const showAllTab = content.showAllTab !== false
  const linkPrefix = content.linkPrefix || '/it-news'
  const totalNeeded = 1 + Math.max(0, sidebarCount) + Math.max(0, gridCount)

  const [categories, setCategories] = useState<string[]>(content.categories ?? [])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  // Wenn der Operator keine Kategorien gepflegt hat, laden wir die aktiven
  // aus der DB — der Block bleibt damit sofort einsetzbar ohne Konfiguration.
  useEffect(() => {
    if (content.categories && content.categories.length > 0) {
      setCategories(content.categories)
      return
    }
    let abort = false
    fetch('/api/v1/blog-categories?active=true')
      .then((r) => r.json())
      .then((d) => {
        if (abort) return
        if (d?.success && Array.isArray(d.data)) {
          setCategories(
            d.data
              .slice(0, DEFAULT_CATEGORY_POOL_LIMIT)
              .map((c: { name: string }) => c.name),
          )
        }
      })
      .catch(() => { /* silent */ })
    return () => { abort = true }
  }, [content.categories])

  const loadPosts = useCallback(async (cat: string | null) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: '1', limit: String(totalNeeded) })
      if (cat) params.set('category', cat)
      else if (categories.length > 0) params.set('categories', categories.join(','))
      const res = await fetch(`/api/v1/public/blog/posts?${params}`)
      const data = await res.json()
      if (data.success) setPosts(data.data || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [categories, totalNeeded])

  useEffect(() => {
    loadPosts(activeCategory)
  }, [loadPosts, activeCategory])

  const featured = posts[0]
  const sidebar = posts.slice(1, 1 + sidebarCount)
  const grid = posts.slice(1 + sidebarCount, 1 + sidebarCount + gridCount)
  const author = content.defaultAuthor || ''
  const showDate = content.showDate !== false && !author

  return (
    <section
      className="container mx-auto px-4 py-12"
      style={{
        paddingTop: settings?.paddingTop ? `${settings.paddingTop}px` : undefined,
        paddingBottom: settings?.paddingBottom ? `${settings.paddingBottom}px` : undefined,
      }}
    >
      <div className="border-b border-foreground/15 pb-3 mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {content.title && (
          <h2 className="text-4xl sm:text-5xl font-serif font-semibold tracking-tight">
            {content.title}
          </h2>
        )}
        {categories.length > 0 && (
          <nav aria-label="Kategorien" className="flex flex-wrap gap-1.5">
            {showAllTab && (
              <CategoryButton
                label="Alle"
                active={activeCategory === null}
                onClick={() => setActiveCategory(null)}
              />
            )}
            {categories.map((cat) => (
              <CategoryButton
                key={cat}
                label={cat}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </nav>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Keine Beitraege in dieser Kategorie.</div>
      ) : (
        <>
          {/* Top-Section: Hero links, Sidebar rechts */}
          <div className={`grid gap-8 mb-12 ${sidebar.length > 0 ? 'lg:grid-cols-3' : ''}`}>
            {featured && (
              <article className={sidebar.length > 0 ? 'lg:col-span-2' : 'max-w-3xl mx-auto w-full'}>
                <Link href={`${linkPrefix}/${featured.slug}`} className="group block">
                  {featured.category && (
                    <CategoryLabel name={featured.category} />
                  )}
                  <h3 className="text-2xl sm:text-3xl font-serif font-semibold leading-tight mt-2 mb-2 group-hover:opacity-80 transition-opacity">
                    {featured.title}
                  </h3>
                  {(author || showDate) && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {author || formatDate(featured.publishedAt)}
                    </p>
                  )}
                  {featured.featuredImage && (
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                      <Image
                        src={featured.featuredImage}
                        alt={featured.featuredImageAlt || featured.title}
                        fill
                        className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        unoptimized
                      />
                    </div>
                  )}
                </Link>
              </article>
            )}

            {sidebar.length > 0 && (
              <div className="space-y-6">
                {sidebar.map((post) => (
                  <SidebarCard
                    key={post.id}
                    post={post}
                    linkPrefix={linkPrefix}
                    author={author}
                    showDate={showDate}
                  />
                ))}
              </div>
            )}
          </div>

          {grid.length > 0 && (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {grid.map((post) => (
                <GridCard
                  key={post.id}
                  post={post}
                  linkPrefix={linkPrefix}
                  author={author}
                  showDate={showDate}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function CategoryButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider rounded-full transition-colors ${
        active
          ? 'bg-foreground text-background'
          : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  )
}

function CategoryLabel({ name }: { name: string }) {
  return (
    <span className="text-xs font-bold uppercase tracking-widest text-primary">
      {name}
    </span>
  )
}

function SidebarCard({
  post,
  linkPrefix,
  author,
  showDate,
}: {
  post: BlogPost
  linkPrefix: string
  author: string
  showDate: boolean
}) {
  return (
    <Link href={`${linkPrefix}/${post.slug}`} className="group flex gap-3 items-start">
      {post.featuredImage && (
        <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden bg-muted">
          <Image
            src={post.featuredImage}
            alt={post.featuredImageAlt || post.title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {post.category && <CategoryLabel name={post.category} />}
        <h4 className="text-sm font-serif font-semibold leading-snug mt-1 mb-1 group-hover:opacity-80 transition-opacity line-clamp-3">
          {post.title}
        </h4>
        {(author || showDate) && (
          <p className="text-xs text-muted-foreground">
            {author || formatDate(post.publishedAt)}
          </p>
        )}
      </div>
    </Link>
  )
}

function GridCard({
  post,
  linkPrefix,
  author,
  showDate,
}: {
  post: BlogPost
  linkPrefix: string
  author: string
  showDate: boolean
}) {
  return (
    <Link href={`${linkPrefix}/${post.slug}`} className="group block">
      {post.featuredImage && (
        <div className="relative aspect-[4/3] overflow-hidden bg-muted mb-3">
          <Image
            src={post.featuredImage}
            alt={post.featuredImageAlt || post.title}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
            unoptimized
          />
        </div>
      )}
      {post.category && <CategoryLabel name={post.category} />}
      <h3 className="text-base font-serif font-semibold leading-snug mt-1 mb-1 group-hover:opacity-80 transition-opacity">
        {post.title}
      </h3>
      {(author || showDate) && (
        <p className="text-xs text-muted-foreground">
          {author || formatDate(post.publishedAt)}
        </p>
      )}
    </Link>
  )
}
