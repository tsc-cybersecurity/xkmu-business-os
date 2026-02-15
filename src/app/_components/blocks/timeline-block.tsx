'use client'

import { iconMap } from '@/lib/utils/icon-map'

interface TimelineStep {
  icon?: string
  title: string
  description?: string
}

interface TimelineBlockContent {
  sectionTitle?: string
  sectionSubtitle?: string
  items?: TimelineStep[]
}

export function TimelineBlock({
  content,
}: {
  content: TimelineBlockContent
  settings: Record<string, unknown>
}) {
  const { sectionTitle, sectionSubtitle, items = [] } = content

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="container mx-auto max-w-3xl">
        {(sectionTitle || sectionSubtitle) && (
          <div className="text-center mb-12">
            {sectionTitle && (
              <h2 className="text-3xl font-bold mb-3">{sectionTitle}</h2>
            )}
            {sectionSubtitle && (
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {sectionSubtitle}
              </p>
            )}
          </div>
        )}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-8">
            {items.map((step, i) => {
              const Icon =
                iconMap[step.icon as keyof typeof iconMap] || null
              return (
                <div key={i} className="relative flex gap-4">
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 bg-card text-[var(--brand-600)] dark:text-[var(--brand-400)]">
                    {Icon ? (
                      <Icon className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-bold">{i + 1}</span>
                    )}
                  </div>
                  <div className="pt-2 pb-2">
                    <h3 className="text-base font-semibold mb-1">
                      {step.title}
                    </h3>
                    {step.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
