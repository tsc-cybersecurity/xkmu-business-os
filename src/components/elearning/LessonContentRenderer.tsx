import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CmsBlockRenderer } from '@/app/_components/cms-block-renderer'
import { ScormPlayer } from './ScormPlayer'
import type { CourseLessonBlock } from '@/lib/db/schema'

interface Props {
  blocks: CourseLessonBlock[]
  /** Pflicht fuer scorm-Bloecke — sonst kann der iframe-src nicht gebaut werden. */
  courseId?: string
  lessonId?: string
}

export function LessonContentRenderer({ blocks, courseId, lessonId }: Props) {
  const visible = blocks.filter((b) => b.isVisible)
  return (
    <div className="space-y-6">
      {visible.map((b) => {
        if (b.kind === 'markdown') {
          return (
            <article
              key={b.id}
              className="prose prose-sm max-w-none dark:prose-invert sm:prose-base"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {b.markdownBody ?? ''}
              </ReactMarkdown>
            </article>
          )
        }
        if (b.kind === 'scorm') {
          const c = (b.content as Record<string, unknown>) ?? {}
          const settings = (b.settings as Record<string, unknown>) ?? {}
          const packageId = String(c.packageId ?? '')
          const entryPath = String(c.entryPath ?? '')
          const version = (c.version === '2004' ? '2004' : c.version === '1.2' ? '1.2' : 'unknown') as
            '1.2' | '2004' | 'unknown'
          const height = typeof settings.height === 'number' ? settings.height : 720
          if (!packageId || !entryPath || !courseId || !lessonId) {
            return (
              <div key={b.id} className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                SCORM-Block kann nicht gerendert werden — packageId/entryPath fehlen.
              </div>
            )
          }
          return (
            <ScormPlayer
              key={b.id}
              courseId={courseId}
              lessonId={lessonId}
              packageId={packageId}
              entryPath={entryPath}
              version={version}
              height={height}
            />
          )
        }
        return (
          <CmsBlockRenderer
            key={b.id}
            blockType={b.blockType ?? ''}
            content={(b.content as Record<string, unknown>) ?? {}}
            settings={(b.settings as Record<string, unknown>) ?? {}}
          />
        )
      })}
    </div>
  )
}
