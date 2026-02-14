import { BlogPostService } from '@/lib/services/blog-post.service'
import { MarkdownRenderer } from '../../../_components/markdown-renderer'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params
    const post = await BlogPostService.getBySlugPublic(slug)
    if (post) {
      return {
        title: post.seoTitle || post.title,
        description: post.seoDescription || post.excerpt || undefined,
        keywords: post.seoKeywords || undefined,
        openGraph: post.featuredImage ? { images: [post.featuredImage] } : undefined,
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
        <div className="aspect-video overflow-hidden rounded-lg mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.featuredImage}
            alt={post.featuredImageAlt || post.title}
            className="w-full h-full object-cover"
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
        <MarkdownRenderer content={post.content} className="mb-12" />
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
