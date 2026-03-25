import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getIcon } from '@/lib/utils/icon-map'
import { InlineMarkdown } from '../markdown-renderer'

interface FeaturesBlockContent {
  sectionTitle?: string
  sectionSubtitle?: string
  columns?: 2 | 3 | 4
  items?: Array<{
    icon?: string
    title: string
    description: string
    link?: string
  }>
}

interface FeaturesBlockProps {
  content: FeaturesBlockContent
  settings?: Record<string, unknown>
}

export function FeaturesBlock({ content, settings }: FeaturesBlockProps) {
  const cols = content.columns || 3
  const gridClass = cols === 2
    ? 'md:grid-cols-2'
    : cols === 4
    ? 'md:grid-cols-2 lg:grid-cols-4'
    : 'md:grid-cols-2 lg:grid-cols-3'

  return (
    <section
      className="container mx-auto px-4 py-16 md:py-24"
      style={{
        paddingTop: settings?.paddingTop ? `${settings.paddingTop}px` : undefined,
        paddingBottom: settings?.paddingBottom ? `${settings.paddingBottom}px` : undefined,
        maxWidth: settings?.maxWidth ? `${settings.maxWidth}px` : undefined,
      }}
    >
      {(content.sectionTitle || content.sectionSubtitle) && (
        <div className="text-center mb-12">
          {content.sectionTitle && (
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{content.sectionTitle}</h2>
          )}
          {content.sectionSubtitle && (
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{content.sectionSubtitle}</p>
          )}
        </div>
      )}

      <div className={`grid ${gridClass} gap-6`}>
        {content.items?.map((item, i) => {
          const Icon = item.icon ? getIcon(item.icon) : null
          const card = (
            <Card key={i} className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                {Icon && (
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                )}
                <CardTitle>{item.title}</CardTitle>
                <CardDescription className="text-base"><InlineMarkdown text={item.description} /></CardDescription>
              </CardHeader>
            </Card>
          )
          if (item.link) {
            return <Link key={i} href={item.link} className="block">{card}</Link>
          }
          return card
        })}
      </div>
    </section>
  )
}
