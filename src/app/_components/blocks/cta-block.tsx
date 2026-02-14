import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getIcon } from '@/lib/utils/icon-map'
import { ArrowRight } from 'lucide-react'

interface CtaBlockContent {
  headline?: string
  description?: string
  buttons?: Array<{ label: string; href: string; variant?: string }>
  highlights?: Array<{ icon?: string; title: string; subtitle?: string }>
  backgroundStyle?: string
}

interface CtaBlockProps {
  content: CtaBlockContent
  settings?: Record<string, unknown>
}

export function CtaBlock({ content, settings }: CtaBlockProps) {
  return (
    <section
      className="container mx-auto px-4 py-16 md:py-24"
      style={{
        paddingTop: settings?.paddingTop ? `${settings.paddingTop}px` : undefined,
        paddingBottom: settings?.paddingBottom ? `${settings.paddingBottom}px` : undefined,
      }}
    >
      <div className="rounded-2xl bg-gradient-to-br from-[var(--brand-gradient-from)] to-[var(--brand-gradient-to)] p-8 md:p-12 text-white">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          {content.headline && (
            <h2 className="text-3xl md:text-4xl font-bold">{content.headline}</h2>
          )}
          {content.description && (
            <p className="text-lg text-[var(--brand-100)]">{content.description}</p>
          )}

          {content.buttons && content.buttons.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {content.buttons.map((btn, i) => (
                <Link key={i} href={btn.href}>
                  <Button
                    size="lg"
                    variant={btn.variant === 'outline' ? 'outline' : 'secondary'}
                    className={
                      btn.variant === 'outline'
                        ? 'text-lg px-8 bg-white/10 hover:bg-white/20 text-white border-white/30'
                        : 'text-lg px-8'
                    }
                  >
                    {btn.label}
                    {i === 0 && <ArrowRight className="ml-2 h-5 w-5" />}
                  </Button>
                </Link>
              ))}
            </div>
          )}

          {content.highlights && content.highlights.length > 0 && (
            <div className="grid md:grid-cols-3 gap-6 pt-12 border-t border-white/20">
              {content.highlights.map((item, i) => {
                const Icon = item.icon ? getIcon(item.icon) : null
                return (
                  <div key={i} className="flex flex-col items-center gap-2">
                    {Icon && <Icon className="h-8 w-8 text-[var(--brand-100)]" />}
                    <div className="font-semibold">{item.title}</div>
                    {item.subtitle && (
                      <div className="text-sm text-[var(--brand-100)]">{item.subtitle}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
