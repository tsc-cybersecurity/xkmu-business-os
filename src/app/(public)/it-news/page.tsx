import { CmsPageContent } from '../../_components/cms-page-content'
import { CmsPageService } from '@/lib/services/cms-page.service'
import { BlogPostService } from '@/lib/services/blog-post.service'
import { BlogPostCard } from '../../_components/blog-post-card'
import { generateCmsMetadata } from '@/lib/utils/cms-metadata'
import { Newspaper } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsMetadata('/it-news', 'IT-News')
}

export default async function ITNewsPage() {
  // Prüfe ob eine CMS-Seite fuer /it-news existiert
  try {
    const cmsPage = await CmsPageService.getBySlugPublic('/it-news')
    if (cmsPage && cmsPage.blocks.length > 0) {
      return <CmsPageContent slug="/it-news" />
    }
  } catch {
    // DB not available
  }

  // Fallback: Standard-Blog-Liste
  let posts: any[] = []
  try {
    const result = await BlogPostService.listPublished({ limit: 12 })
    posts = result.items
  } catch { /* ignore */ }

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
        <div className="text-center py-12 text-muted-foreground">Noch keine Beitraege.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <BlogPostCard key={post.id} title={post.title} slug={post.slug} excerpt={post.excerpt}
              featuredImage={post.featuredImage} featuredImageAlt={post.featuredImageAlt}
              category={post.category} tags={post.tags} publishedAt={post.publishedAt} />
          ))}
        </div>
      )}
    </div>
  )
}
