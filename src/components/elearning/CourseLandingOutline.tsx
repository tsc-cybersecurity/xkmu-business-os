import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, FolderOpen } from 'lucide-react'
import type { CourseLesson, CourseModule } from '@/lib/db/schema'

interface Props {
  courseSlug: string
  modules: CourseModule[]
  lessons: CourseLesson[]
  basePath: '/kurse' | '/portal/kurse'
}

export function CourseLandingOutline({ courseSlug, modules, lessons, basePath }: Props) {
  const useModules = modules.length > 0
  if (!useModules) {
    const sorted = [...lessons].sort((a, b) => a.position - b.position)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lektionen</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-1">
            {sorted.map((l, idx) => (
              <li key={l.id}>
                <Link
                  href={`${basePath}/${courseSlug}/${l.slug}`}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
                >
                  <span className="text-sm text-muted-foreground tabular-nums w-6">{idx + 1}.</span>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{l.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    )
  }

  const sortedModules = [...modules].sort((a, b) => a.position - b.position)
  return (
    <div className="space-y-4">
      {sortedModules.map((m) => {
        const inMod = lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.position - b.position)
        return (
          <Card key={m.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FolderOpen className="h-4 w-4" />
                {m.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-1">
                {inMod.map((l, idx) => (
                  <li key={l.id}>
                    <Link
                      href={`${basePath}/${courseSlug}/${l.slug}`}
                      className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
                    >
                      <span className="text-sm text-muted-foreground tabular-nums w-6">{idx + 1}.</span>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{l.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
