import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Paperclip } from 'lucide-react'
import type { CourseAsset, CourseLesson, CourseLessonBlock } from '@/lib/db/schema'
import { LessonContentRenderer } from './LessonContentRenderer'
import { LessonCompletionToggle } from './LessonCompletionToggle'

interface Props {
  lesson: CourseLesson & { blocks?: CourseLessonBlock[] }
  assets: CourseAsset[]
  // Sub-3a: completion-toggle nur im portal-Pfad rendern (mit aktuellem User).
  completion?: { courseId: string; isCompleted: boolean }
}

export function LessonContent({ lesson, assets, completion }: Props) {
  const docs = assets.filter((a) => a.kind === 'document')
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{lesson.title}</h1>
      <LessonContentRenderer blocks={lesson.blocks ?? []} />
      {completion && (
        <div className="flex justify-end">
          <LessonCompletionToggle
            courseId={completion.courseId}
            lessonId={lesson.id}
            initialCompleted={completion.isCompleted}
          />
        </div>
      )}
      {docs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Paperclip className="h-4 w-4" />
              Anhänge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {docs.map((a) => (
                <li key={a.id}>
                  <a
                    href={`/api/v1/courses/assets/serve/${a.path}`}
                    download={a.originalName}
                    className="flex items-center gap-2 rounded-md border p-2 hover:bg-muted"
                  >
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{a.label ?? a.originalName}</span>
                    <span className="text-xs text-muted-foreground">{(a.sizeBytes / 1024).toFixed(0)} KB</span>
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
