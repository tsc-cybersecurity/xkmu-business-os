import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'

interface Props {
  prev: { courseSlug: string; lessonSlug: string } | null
  next: { courseSlug: string; lessonSlug: string; locked?: boolean } | null
  basePath: '/kurse' | '/portal/kurse'
}

export function LessonPrevNextNav({ prev, next, basePath }: Props) {
  return (
    <div className="flex items-center justify-between border-t pt-4">
      {prev ? (
        <Button asChild variant="outline">
          <Link href={`${basePath}/${prev.courseSlug}/${prev.lessonSlug}`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Vorige Lektion
          </Link>
        </Button>
      ) : (
        <span />
      )}
      {next ? (
        next.locked ? (
          <Button disabled title="Schließe diese Lektion ab, um weiterzugehen">
            <Lock className="mr-1 h-4 w-4" />
            Nächste Lektion
          </Button>
        ) : (
          <Button asChild>
            <Link href={`${basePath}/${next.courseSlug}/${next.lessonSlug}`}>
              Nächste Lektion
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        )
      ) : (
        <span />
      )}
    </div>
  )
}
