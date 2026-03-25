import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getIcon } from '@/lib/utils/icon-map'
import { InlineMarkdown } from '../markdown-renderer'

interface CardsBlockContent {
  columns?: 2 | 3 | 4
  items?: Array<{
    icon?: string
    image?: string
    title: string
    description?: string
    link?: string
  }>
}

interface CardsBlockProps {
  content: CardsBlockContent
  settings?: Record<string, unknown>
}

export function CardsBlock({ content, settings }: CardsBlockProps) {
  const cols = content.columns || 3
  const gridClass = cols === 2
    ? 'md:grid-cols-2'
    : cols === 4
    ? 'md:grid-cols-2 lg:grid-cols-4'
    : 'md:grid-cols-2 lg:grid-cols-3'

  return (
    <section
      className="container mx-auto px-4 py-8"
      style={{
        paddingTop: settings?.paddingTop ? `${settings.paddingTop}px` : undefined,
        paddingBottom: settings?.paddingBottom ? `${settings.paddingBottom}px` : undefined,
      }}
    >
      <div className={`grid ${gridClass} gap-6`}>
        {content.items?.map((item, i) => {
          const Icon = item.icon ? getIcon(item.icon) : null
          const card = (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardHeader>
                {Icon && (
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                )}
                <CardTitle className="text-lg">{item.title}</CardTitle>
                {item.description && (
                  <CardDescription><InlineMarkdown text={item.description} /></CardDescription>
                )}
              </CardHeader>
            </Card>
          )

          if (item.link) {
            return (
              <Link key={i} href={item.link} className="block">
                {card}
              </Link>
            )
          }
          return card
        })}
      </div>
    </section>
  )
}
