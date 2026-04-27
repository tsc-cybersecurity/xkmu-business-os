import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CmsBlockRenderer } from '@/app/_components/cms-block-renderer'
import type { CourseLessonBlock } from '@/lib/db/schema'

interface Props {
  blocks: CourseLessonBlock[]
}

export function LessonContentRenderer({ blocks }: Props) {
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
