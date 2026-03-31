'use client'

import Link from 'next/link'
import { iconMap } from '@/lib/utils/icon-map'

export interface BannerBlockContent {
  text: string
  variant?: 'info' | 'success' | 'warning' | 'brand'
  icon?: string
  buttonLabel?: string
  buttonHref?: string
  dismissible?: boolean
}

const variantStyles = {
  info: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
  success:
    'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
  warning:
    'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100',
  brand:
    'bg-[var(--brand-50)] dark:bg-[var(--brand-900)]/30 border-[var(--brand-400)]/30 text-[var(--brand-900)] dark:text-[var(--brand-100)]',
}

export function BannerBlock({
  content,
}: {
  content: BannerBlockContent
  settings: Record<string, unknown>
}) {
  const {
    text,
    variant = 'info',
    icon,
    buttonLabel,
    buttonHref,
  } = content

  const Icon = icon
    ? iconMap[icon as keyof typeof iconMap] || null
    : null

  return (
    <section className="py-4 px-4">
      <div className="container mx-auto max-w-6xl">
        <div
          className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 ${variantStyles[variant] || variantStyles.info}`}
        >
          {Icon && <Icon className="h-5 w-5 shrink-0" />}
          <p className="flex-1 text-sm font-medium">{text}</p>
          {buttonLabel && buttonHref && (
            <Link
              href={buttonHref}
              className="shrink-0 rounded-md bg-white/80 dark:bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white dark:hover:bg-white/20 transition-colors"
            >
              {buttonLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
