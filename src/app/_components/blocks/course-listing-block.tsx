'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, Loader2 } from 'lucide-react'

interface PublicCourse {
  id: string
  title: string
  subtitle?: string | null
  slug: string
  estimatedMinutes?: number | null
  useModules?: boolean | null
}

export interface CourseListingBlockContent {
  title?: string
  subtitle?: string
  columns?: 1 | 2 | 3 | 4
  limit?: number
  basePath?: '/kurse' | '/portal/kurse'
  emptyText?: string
}

interface Props {
  content: CourseListingBlockContent
  settings?: Record<string, unknown>
}

export function CourseListingBlock({ content }: Props) {
  const [courses, setCourses] = useState<PublicCourse[]>([])
  const [loading, setLoading] = useState(true)

  const limit = content.limit ?? 60
  const cols = content.columns ?? 3
  const basePath = content.basePath ?? '/kurse'

  useEffect(() => {
    fetch(`/api/public/courses?limit=${limit}`)
      .then((r) => r.json())
      .then((data) => setCourses(Array.isArray(data?.data) ? data.data : []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false))
  }, [limit])

  const gridClass =
    cols === 1 ? 'max-w-2xl mx-auto' :
    cols === 2 ? 'sm:grid-cols-2' :
    cols === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' :
    'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      {(content.title || content.subtitle) && (
        <div className="text-center mb-10 space-y-3">
          {content.title && (
            <h2 className="text-3xl md:text-4xl font-bold">{content.title}</h2>
          )}
          {content.subtitle && (
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {content.subtitle}
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : courses.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {content.emptyText ?? 'Demnächst gibt es hier freie Lerninhalte.'}
        </p>
      ) : (
        <div className={`grid gap-4 ${gridClass}`}>
          {courses.map((c) => (
            <Link key={c.id} href={`${basePath}/${c.slug}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-tight">{c.title}</CardTitle>
                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {c.subtitle && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{c.subtitle}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {c.estimatedMinutes != null && (
                      <Badge variant="outline">{c.estimatedMinutes} Min</Badge>
                    )}
                    {c.useModules && <Badge variant="outline">Module</Badge>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
