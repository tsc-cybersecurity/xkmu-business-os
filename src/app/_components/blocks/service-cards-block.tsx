import { CheckCircle2 } from 'lucide-react'
import { InlineMarkdown } from '../markdown-renderer'

interface Deliverable {
  label: string
  color?: 'green' | 'blue' | 'purple' | 'orange' | 'gray'
}

interface ServiceCard {
  badge?: string
  title: string
  description?: string
  checklistItems?: string[]
  deliverables?: (string | Deliverable)[]
}

interface ServiceCardsBlockContent {
  sectionTitle?: string
  sectionSubtitle?: string
  columns?: 1 | 2 | 3
  items?: ServiceCard[]
}

interface ServiceCardsBlockProps {
  content: ServiceCardsBlockContent
  settings?: Record<string, unknown>
}

export function ServiceCardsBlock({ content, settings }: ServiceCardsBlockProps) {
  const cols = content.columns || 2
  const gridClass = cols === 1
    ? 'max-w-2xl mx-auto'
    : cols === 3
    ? 'md:grid-cols-2 lg:grid-cols-3'
    : 'md:grid-cols-2'

  return (
    <section
      className="container mx-auto px-4 py-12"
      style={{
        paddingTop: settings?.paddingTop ? `${settings.paddingTop}px` : undefined,
        paddingBottom: settings?.paddingBottom ? `${settings.paddingBottom}px` : undefined,
      }}
    >
      {(content.sectionTitle || content.sectionSubtitle) && (
        <div className="text-center mb-10">
          {content.sectionTitle && <h2 className="text-3xl font-bold">{content.sectionTitle}</h2>}
          {content.sectionSubtitle && <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">{content.sectionSubtitle}</p>}
        </div>
      )}

      <div className={`grid gap-6 ${cols > 1 ? gridClass : gridClass}`}>
        {content.items?.map((item, i) => (
          <div
            key={i}
            className="relative rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Header with badge */}
            <div className="flex items-start gap-4 mb-4">
              {item.badge && (
                <div className="shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{item.badge}</span>
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-lg font-bold leading-tight">{item.title}</h3>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-1"><InlineMarkdown text={item.description} /></p>
                )}
              </div>
            </div>

            {/* Checklist */}
            {item.checklistItems && item.checklistItems.length > 0 && (
              <ul className="space-y-3 mb-5">
                {item.checklistItems.map((text, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
                    <span className="text-sm">{text}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Deliverables */}
            {item.deliverables && item.deliverables.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Was Sie erhalten</p>
                <div className="flex flex-wrap gap-2">
                  {item.deliverables.map((tag, k) => {
                    const label = typeof tag === 'string' ? tag : tag.label
                    const color = typeof tag === 'string' ? 'blue' : (tag.color || 'blue')
                    const colorClasses: Record<string, string> = {
                      green: 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/50',
                      blue: 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50',
                      purple: 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/50',
                      orange: 'text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/50',
                      gray: 'text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50',
                    }
                    return (
                      <span
                        key={k}
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${colorClasses[color] || colorClasses.blue}`}
                      >
                        {label}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
