import { renderMarkdown } from '@/lib/utils/markdown'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = renderMarkdown(content)

  return (
    <div
      className={`prose prose-neutral dark:prose-invert max-w-none ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
