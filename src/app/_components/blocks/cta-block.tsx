import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getIcon } from '@/lib/utils/icon-map'
import { ArrowRight } from 'lucide-react'
import { InlineMarkdown } from '../markdown-renderer'

export interface CtaBlockContent {
  headline?: string
  description?: string
  buttons?: Array<{ label: string; href: string; variant?: string }>
  highlights?: Array<{ icon?: string; title: string; subtitle?: string }>
  backgroundStyle?: string
  size?: 'full' | 'large' | 'medium' | 'small'
}

interface CtaBlockProps {
  content: CtaBlockContent
  settings?: Record<string, unknown>
}

const BG_STYLES: Record<string, { bg: string; text: string; muted: string; btnOutline: string }> = {
  brand: {
    bg: 'bg-gradient-to-br from-[var(--brand-gradient-from)] to-[var(--brand-gradient-to)]',
    text: 'text-white',
    muted: 'text-white/70',
    btnOutline: 'bg-white/10 hover:bg-white/20 text-white border-white/30',
  },
  dark: {
    bg: 'bg-gradient-to-br from-slate-900 to-slate-800',
    text: 'text-white',
    muted: 'text-slate-300',
    btnOutline: 'bg-white/10 hover:bg-white/20 text-white border-white/30',
  },
  light: {
    bg: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900',
    text: 'text-foreground',
    muted: 'text-muted-foreground',
    btnOutline: 'border-input hover:bg-accent',
  },
  success: {
    bg: 'bg-gradient-to-br from-emerald-600 to-emerald-700',
    text: 'text-white',
    muted: 'text-emerald-100',
    btnOutline: 'bg-white/10 hover:bg-white/20 text-white border-white/30',
  },
  warning: {
    bg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    text: 'text-white',
    muted: 'text-amber-100',
    btnOutline: 'bg-white/10 hover:bg-white/20 text-white border-white/30',
  },
  transparent: {
    bg: 'bg-transparent',
    text: 'text-foreground',
    muted: 'text-muted-foreground',
    btnOutline: 'border-input hover:bg-accent',
  },
}

const SIZES = {
  full:   { section: 'px-0 py-0',           box: 'rounded-none p-12 md:p-20', heading: 'text-4xl md:text-5xl', desc: 'text-xl' },
  large:  { section: 'container mx-auto px-4 py-16 md:py-24', box: 'rounded-2xl p-10 md:p-16', heading: 'text-3xl md:text-5xl', desc: 'text-lg md:text-xl' },
  medium: { section: 'container mx-auto px-4 py-16 md:py-24', box: 'rounded-2xl p-8 md:p-12', heading: 'text-3xl md:text-4xl', desc: 'text-lg' },
  small:  { section: 'container mx-auto px-4 py-8 md:py-12',  box: 'rounded-xl p-6 md:p-8',   heading: 'text-2xl md:text-3xl', desc: 'text-base' },
}

export function CtaBlock({ content, settings }: CtaBlockProps) {
  const style = BG_STYLES[content.backgroundStyle || 'brand'] || BG_STYLES.brand
  const sz = SIZES[content.size || 'medium']

  return (
    <section
      className={sz.section}
      style={{
        paddingTop: settings?.paddingTop ? `${settings.paddingTop}px` : undefined,
        paddingBottom: settings?.paddingBottom ? `${settings.paddingBottom}px` : undefined,
      }}
    >
      <div className={`${sz.box} ${style.bg} ${style.text}`}>
        <div className="max-w-3xl mx-auto text-center space-y-6">
          {content.headline && (
            <h2 className={`${sz.heading} font-bold`}>{content.headline}</h2>
          )}
          {content.description && (
            <p className={`${sz.desc} ${style.muted}`}><InlineMarkdown text={content.description} /></p>
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
                        ? `text-lg px-8 ${style.btnOutline}`
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
                    {Icon && <Icon className={`h-8 w-8 ${style.muted}`} />}
                    <div className="font-semibold">{item.title}</div>
                    {item.subtitle && (
                      <div className={`text-sm ${style.muted}`}>{item.subtitle}</div>
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
