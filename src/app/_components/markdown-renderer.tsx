import { renderMarkdown } from '@/lib/utils/markdown'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = renderMarkdown(content)

  return (
    <div
      className={`prose prose-neutral dark:prose-invert max-w-none prose-headings:mt-6 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:my-3 prose-hr:my-4 ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/**
 * Inline markdown for short text fields (descriptions, subtitles).
 * Renders bold, italic, links, inline code — no block elements.
 */
export function InlineMarkdown({ text, className }: { text: string; className?: string }) {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, href) => {
    const safe = /^(https?:\/\/|\/|#|mailto:)/.test(href) ? href : ''
    return safe ? `<a href="${safe}" class="underline">${t}</a>` : t
  })
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\n/g, '<br />')

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
