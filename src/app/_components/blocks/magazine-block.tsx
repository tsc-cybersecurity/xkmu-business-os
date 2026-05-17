'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
  const sidebarStep = Math.max(0, content.sidebarCount ?? 3)
  const gridStep = Math.max(0, content.gridCount ?? 6)
  const showAllTab = content.showAllTab !== false
  const linkPrefix = content.linkPrefix || '/it-news'

  const [categories, setCategories] = useState<string[]>(content.categories ?? [])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  // Wie viele Sidebar-/Grid-Items aktuell ANGEZEIGT werden (waechst beim
  // Klick auf "Mehr laden"). Pagination geht gegen denselben /posts-
  // Endpunkt; geladene Posts liegen kumulativ in `posts`.
  const [sidebarVisible, setSidebarVisible] = useState(sidebarStep)
  const [gridVisible, setGridVisible] = useState(gridStep)
  const [cursorPage, setCursorPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState<null | 'sidebar' | 'grid'>(null)

  // ResizeObserver auf den Featured-Artikel — die Sidebar darf nie hoeher
  // werden als der Hauptbeitrag links. Ueberschuss wird scrollbar.
  const featuredRef = useRef<HTMLDivElement | null>(null)
  const [sidebarMaxHeight, setSidebarMaxHeight] = useState<number | null>(null)
  useEffect(() => {
    if (!featuredRef.current) return
    const el = featuredRef.current
    const update = () => setSidebarMaxHeight(el.getBoundingClientRect().height)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [posts.length])

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

  // Limit pro Fetch — ueberschiessend laden, damit Cursor-Sprung beim
  // ersten Render nicht direkt nachladen muss.
  const fetchLimit = Math.max(12, 1 + sidebarStep + gridStep)

  const fetchPage = useCallback(async (cat: string | null, page: number) => {
    const params = new URLSearchParams({ page: String(page), limit: String(fetchLimit) })
    if (cat) params.set('category', cat)
    else if (categories.length > 0) params.set('categories', categories.join(','))
    const res = await fetch(`/api/v1/public/blog/posts?${params}`)
    if (!res.ok) return { items: [] as BlogPost[], meta: { page, totalPages: page } }
    const data = await res.json()
    if (!data.success) return { items: [] as BlogPost[], meta: { page, totalPages: page } }
    return { items: (data.data as BlogPost[]) || [], meta: data.meta ?? { page, totalPages: page } }
  }, [categories, fetchLimit])

  const loadInitial = useCallback(async (cat: string | null) => {
    setLoading(true)
    try {
      const { items, meta } = await fetchPage(cat, 1)
      setPosts(items)
      setCursorPage(1)
      setHasMore((meta.page ?? 1) < (meta.totalPages ?? 1))
    } finally {
      setLoading(false)
    }
  }, [fetchPage])

  useEffect(() => {
    setSidebarVisible(sidebarStep)
    setGridVisible(gridStep)
    loadInitial(activeCategory)
  }, [loadInitial, activeCategory, sidebarStep, gridStep])

  // Stellt sicher, dass `posts` mindestens `needed` Items hat — sonst
  // werden so viele Folgeseiten geladen wie noetig (oder bis hasMore=false).
  const ensureLoaded = useCallback(async (needed: number) => {
    let currentPosts = posts
    let page = cursorPage
    let more = hasMore
    while (currentPosts.length < needed && more) {
      page += 1
      const { items, meta } = await fetchPage(activeCategory, page)
      currentPosts = [...currentPosts, ...items]
      more = (meta.page ?? page) < (meta.totalPages ?? page)
    }
    setPosts(currentPosts)
    setCursorPage(page)
    setHasMore(more)
    return currentPosts.length
  }, [posts, cursorPage, hasMore, fetchPage, activeCategory])

  const handleMoreSidebar = async () => {
    setLoadingMore('sidebar')
    try {
      const nextSidebar = sidebarVisible + sidebarStep
      await ensureLoaded(1 + nextSidebar + gridVisible)
      setSidebarVisible(nextSidebar)
    } finally {
      setLoadingMore(null)
    }
  }

  const handleMoreGrid = async () => {
    setLoadingMore('grid')
    try {
      const nextGrid = gridVisible + gridStep
      await ensureLoaded(1 + sidebarVisible + nextGrid)
      setGridVisible(nextGrid)
    } finally {
      setLoadingMore(null)
    }
  }

  const featured = posts[0]
  const sidebar = posts.slice(1, 1 + sidebarVisible)
  const grid = posts.slice(1 + sidebarVisible, 1 + sidebarVisible + gridVisible)
  const author = content.defaultAuthor || ''
  const showDate = content.showDate !== false && !author

  // Pool reicht aktuell schon mehr Sidebar-Items als angezeigt → Button
  // ohne Roundtrip moeglich. Sonst noch via API laden (hasMore).
  const canLoadMoreSidebar = sidebarStep > 0 && (posts.length > 1 + sidebarVisible + gridVisible || hasMore)
  const canLoadMoreGrid = gridStep > 0 && (posts.length > 1 + sidebarVisible + gridVisible || hasMore)

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
              <article
                ref={featuredRef}
                className={sidebar.length > 0 ? 'lg:col-span-2' : 'max-w-3xl mx-auto w-full'}
              >
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
              <div
                className="lg:overflow-y-auto pr-1 -mr-1"
                style={sidebarMaxHeight ? { maxHeight: `${sidebarMaxHeight}px` } : undefined}
              >
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
                  {canLoadMoreSidebar && (
                    <button
                      type="button"
                      onClick={handleMoreSidebar}
                      disabled={loadingMore === 'sidebar'}
                      className="w-full text-xs uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground py-2 border-t border-foreground/10 inline-flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loadingMore === 'sidebar' && <Loader2 className="h-3 w-3 animate-spin" />}
                      Mehr laden
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {grid.length > 0 && (
            <>
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
              {canLoadMoreGrid && (
                <div className="flex justify-center mt-10">
                  <button
                    type="button"
                    onClick={handleMoreGrid}
                    disabled={loadingMore === 'grid'}
                    className="px-6 py-2.5 rounded-full border border-foreground/30 text-sm font-medium uppercase tracking-wider hover:bg-foreground hover:text-background transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {loadingMore === 'grid' && <Loader2 className="h-4 w-4 animate-spin" />}
                    Weitere Beitraege laden
                  </button>
                </div>
              )}
            </>
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
