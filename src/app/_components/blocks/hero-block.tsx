import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getIcon } from '@/lib/utils/icon-map'
import { ArrowRight } from 'lucide-react'

interface HeroBlockContent {
  backgroundImage?: string
  overlayGradient?: string
  badge?: { icon?: string; text?: string }
  headline?: string
  headlineHighlight?: string
  subheadline?: string
  buttons?: Array<{ label: string; href: string; variant?: string }>
  stats?: Array<{ value: string; label: string }>
}

interface HeroBlockProps {
  content: HeroBlockContent
  settings?: Record<string, unknown>
}

export function HeroBlock({ content, settings }: HeroBlockProps) {
  const BadgeIcon = content.badge?.icon ? getIcon(content.badge.icon) : null

  return (
    <section
      className="relative min-h-[66vh] flex items-center"
      style={{
        paddingTop: settings?.paddingTop ? `${settings.paddingTop}px` : undefined,
        paddingBottom: settings?.paddingBottom ? `${settings.paddingBottom}px` : undefined,
      }}
    >
      {content.backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url("${content.backgroundImage}")` }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: content.overlayGradient || 'linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.6), rgba(0,0,0,0.7))',
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center space-y-8 py-20 md:py-24">
          {content.badge && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-400)]/30 px-4 py-2 text-sm bg-white/10 backdrop-blur-md text-white">
              {BadgeIcon && <BadgeIcon className="h-4 w-4 text-[var(--brand-400)]" />}
              <span>{content.badge.text}</span>
            </div>
          )}

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl text-white drop-shadow-lg">
            {content.headline}{' '}
            {content.headlineHighlight && (
              <span className="bg-gradient-to-r from-[var(--brand-400)] to-[var(--brand-gradient-to)] bg-clip-text text-transparent">
                {content.headlineHighlight}
              </span>
            )}
          </h1>

          {content.subheadline && (
            <p className="text-xl md:text-2xl text-gray-100 max-w-2xl drop-shadow-md">
              {content.subheadline}
            </p>
          )}

          {content.buttons && content.buttons.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              {content.buttons.map((btn, i) => (
                <Link key={i} href={btn.href}>
                  <Button
                    size="lg"
                    variant={btn.variant === 'outline' ? 'outline' : 'default'}
                    className="text-lg px-8"
                  >
                    {btn.label}
                    {i === 0 && <ArrowRight className="ml-2 h-5 w-5" />}
                  </Button>
                </Link>
              ))}
            </div>
          )}

          {content.stats && content.stats.length > 0 && (
            <div className="grid grid-cols-3 gap-8 md:gap-16 pt-12 text-center border-t border-white/20 mt-16 w-full max-w-3xl">
              {content.stats.map((stat, i) => (
                <div key={i}>
                  <div className="text-3xl md:text-4xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-300 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
