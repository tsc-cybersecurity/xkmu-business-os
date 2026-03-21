import { BlogPostService } from '@/lib/services/blog-post.service'
import { BlogPostCard } from '../../_components/blog-post-card'
import { Newspaper } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'IT-News - Aktuelle Artikel und Analysen',
  description: 'Aktuelle Nachrichten und Trends aus der IT-Welt: IT-Sicherheit, Kuenstliche Intelligenz und Digitalisierung.',
}

export default async function ITNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>
}) {
  let posts: any[] = []
  let meta = { page: 1, limit: 12, total: 0, totalPages: 0 }

  try {
    const resolvedParams = await searchParams
    const page = parseInt(resolvedParams.page || '1', 10)
    const category = resolvedParams.category || undefined
    const result = await BlogPostService.listPublished({ page, limit: 12, category })
    posts = result.items
    meta = result.meta
  } catch {
    // DB not available
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-4">
            <Newspaper className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4">IT-News</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Aktuelle Nachrichten und Trends aus der IT-Welt.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <div className="rounded-lg border bg-card p-8 max-w-lg mx-auto">
            <p className="text-muted-foreground">
              Noch keine Beitraege veröffentlicht. Schauen Sie bald wieder vorbei.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <BlogPostCard
                key={post.id}
                title={post.title}
                slug={post.slug}
                excerpt={post.excerpt}
                featuredImage={post.featuredImage}
                featuredImageAlt={post.featuredImageAlt}
                category={post.category}
                tags={post.tags}
                publishedAt={post.publishedAt}
              />
            ))}
          </div>

          {meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                <a
                  key={p}
                  href={`/it-news?page=${p}`}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    p === meta.page
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border hover:bg-accent'
                  }`}
                >
                  {p}
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
