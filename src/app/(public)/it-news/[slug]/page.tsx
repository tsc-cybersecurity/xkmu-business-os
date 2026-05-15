import { BlogPostService } from '@/lib/services/blog-post.service'
import { CmsPromoSlotService } from '@/lib/services/cms-promo-slot.service'
import { toAbsoluteUrl } from '@/lib/utils/cms-metadata'
import { extractPromoSlugs } from '@/lib/utils/promo-placeholder'
import { BlogContentRenderer } from '../../../_components/blog-content-renderer'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { CmsPromoSlot } from '@/lib/db/schema'

interface Props {
  params: Promise<{ slug: string }>
}

// Pillar-Farbe fuer /api/og aus der Blog-Kategorie ableiten.
function pillarForBlogCategory(category: string | null | undefined): 'ki' | 'it' | 'cyber' | 'nis2' | 'default' {
  const c = (category ?? '').toLowerCase()
  if (c.includes('nis')) return 'nis2'
  if (c.includes('cyber') || c.includes('security') || c.includes('sicherheit') || c.includes('phishing') || c.includes('ransomware') || c.includes('backup')) return 'cyber'
  if (c.includes('ki') || c.includes(' ai') || c.startsWith('ai')) return 'ki'
  if (c.includes('it') || c.includes('cloud') || c.includes('infrastruktur') || c.includes('netzwerk')) return 'it'
  return 'default'
}

function buildBlogOgImageUrl(post: { title: string; excerpt: string | null; category: string | null }): string {
  const t = encodeURIComponent(post.title.slice(0, 90))
  const s = encodeURIComponent((post.excerpt ?? 'xKMU IT-Magazin für KMU').slice(0, 140))
  const p = pillarForBlogCategory(post.category)
  return `/api/og?t=${t}&s=${s}&p=${p}`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params
    const post = await BlogPostService.getBySlugPublic(slug)
    if (post) {
      const ogImage = toAbsoluteUrl(post.featuredImage ?? buildBlogOgImageUrl(post))
      return {
        title: post.seoTitle || post.title,
        description: post.seoDescription || post.excerpt || undefined,
        keywords: post.seoKeywords || undefined,
        openGraph: {
          title: post.seoTitle || post.title,
          description: post.seoDescription || post.excerpt || undefined,
          type: 'article',
          url: `/it-news/${slug}`,
          images: [ogImage],
        },
        twitter: {
          card: 'summary_large_image',
          site: '@xkmu',
          creator: '@xkmu',
          title: post.seoTitle || post.title,
          description: post.seoDescription || post.excerpt || undefined,
          images: [ogImage],
        },
      }
    }
  } catch {
    // DB not available
  }
  return { title: 'IT-News' }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  let post

  try {
    post = await BlogPostService.getBySlugPublic(slug)
  } catch {
    // DB not available
  }

  if (!post) {
    notFound()
  }

  // Promo-Slots aus dem Content extrahieren und vorab batched laden.
  // Wenn keine Platzhalter vorhanden sind oder die DB Fehler wirft,
  // bleibt das Map leer und der Renderer faellt auf reine Markdown-
  // Darstellung zurueck.
  let promoMap: Record<string, CmsPromoSlot> = {}
  if (post.content) {
    const promoSlugs = extractPromoSlugs(post.content)
    if (promoSlugs.length > 0) {
      try {
        const slots = await CmsPromoSlotService.getActiveBySlugs(promoSlugs)
        promoMap = Object.fromEntries(slots.map((s) => [s.slug, s]))
      } catch {
        // DB not available — Platzhalter werden weggelassen
      }
    }
  }

  return (
    <article className="container mx-auto px-4 py-8 max-w-3xl">
      <Link
        href="/it-news"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck zu IT-News
      </Link>

      {post.featuredImage && (
        <div className="relative aspect-video overflow-hidden rounded-lg mb-8">
          <Image
            src={post.featuredImage}
            alt={post.featuredImageAlt || post.title}
            className="w-full h-full object-cover"
            fill
            unoptimized
          />
        </div>
      )}

      <header className="mb-8">
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
          {post.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(post.publishedAt).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          )}
          {post.category && <Badge variant="outline">{post.category}</Badge>}
          {post.source === 'ai' && <Badge variant="secondary">KI-generiert</Badge>}
        </div>

        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>

        {post.excerpt && (
          <p className="text-xl text-muted-foreground">{post.excerpt}</p>
        )}
      </header>

      {post.content && (
        <BlogContentRenderer content={post.content} promos={promoMap} className="mb-12" />
      )}

      {post.tags && post.tags.length > 0 && (
        <footer className="border-t pt-6">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        </footer>
      )}
    </article>
  )
}
