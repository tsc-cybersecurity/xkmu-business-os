import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GraduationCap } from 'lucide-react'
import type { Course } from '@/lib/db/schema'

interface Props {
  courses: Course[]
  basePath: '/kurse' | '/portal/kurse'
}

export function CourseListGrid({ courses, basePath }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
  )
}
