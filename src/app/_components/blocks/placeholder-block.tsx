import { getIcon } from '@/lib/utils/icon-map'
import { FileText } from 'lucide-react'
import { InlineMarkdown } from '../markdown-renderer'

export interface PlaceholderBlockContent {
  icon?: string
  title?: string
  description?: string
}

interface PlaceholderBlockProps {
  content: PlaceholderBlockContent
  settings?: Record<string, unknown>
}

export function PlaceholderBlock({ content, settings }: PlaceholderBlockProps) {
  const Icon = content.icon ? getIcon(content.icon) : FileText

  return (
    <section
      className="container mx-auto px-4 py-16 max-w-3xl text-center"
      style={{
        paddingTop: settings?.paddingTop ? `${settings.paddingTop}px` : undefined,
        paddingBottom: settings?.paddingBottom ? `${settings.paddingBottom}px` : undefined,
      }}
    >
      {Icon && (
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-[var(--brand-100)] dark:bg-[var(--brand-900)]/30 p-6">
            <Icon className="h-12 w-12 text-[var(--brand-600)] dark:text-[var(--brand-400)]" />
          </div>
        </div>
      )}
      {content.title && (
        <h1 className="text-4xl font-bold mb-4">{content.title}</h1>
      )}
      {content.description && (
        <p className="text-xl text-muted-foreground mb-8"><InlineMarkdown text={content.description} /></p>
      )}
      <div className="rounded-lg border bg-card p-8">
        <p className="text-muted-foreground">
          Inhalt folgt in Kuerze.
        </p>
      </div>
    </section>
  )
}
