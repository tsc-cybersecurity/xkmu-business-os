import { MarkdownRenderer } from '../markdown-renderer'

export interface TextBlockContent {
  content?: string
  alignment?: 'left' | 'center' | 'right'
}

interface TextBlockProps {
  content: TextBlockContent
  settings?: Record<string, unknown>
}

export function TextBlock({ content, settings }: TextBlockProps) {
  const alignment = content.alignment || 'left'
  const alignClass = alignment === 'center' ? 'text-center' : alignment === 'right' ? 'text-right' : 'text-left'

  return (
    <section
      className="container mx-auto px-4 py-8"
      style={{
        paddingTop: settings?.paddingTop ? `${settings.paddingTop}px` : undefined,
        paddingBottom: settings?.paddingBottom ? `${settings.paddingBottom}px` : undefined,
        maxWidth: settings?.maxWidth ? `${settings.maxWidth}px` : '768px',
      }}
    >
      <div className={`prose prose-neutral dark:prose-invert max-w-none ${alignClass}`}>
        <MarkdownRenderer content={content.content || ''} />
      </div>
    </section>
  )
}
