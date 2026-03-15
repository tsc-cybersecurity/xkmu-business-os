import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

interface BlogPostCardProps {
  title: string
  slug: string
  excerpt?: string | null
  featuredImage?: string | null
  featuredImageAlt?: string | null
  category?: string | null
  tags?: string[] | null
  publishedAt?: string | null
}

export function BlogPostCard({
  title,
  slug,
  excerpt,
  featuredImage,
  featuredImageAlt,
  category,
  tags,
  publishedAt,
}: BlogPostCardProps) {
  return (
    <Link href={`/it-news/${slug}`} className="block group">
      <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow">
        {featuredImage && (
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={featuredImage}
              alt={featuredImageAlt || title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              fill
              unoptimized
            />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            {publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(publishedAt).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>
            )}
            {category && <Badge variant="outline" className="text-xs">{category}</Badge>}
          </div>
          <h3 className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
        </CardHeader>
        <CardContent>
          {excerpt && (
            <p className="text-muted-foreground text-sm line-clamp-3">{excerpt}</p>
          )}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
