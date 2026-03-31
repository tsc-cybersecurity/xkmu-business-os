'use client'

import Image from 'next/image'
import { Star, Quote } from 'lucide-react'

interface TestimonialItem {
  name: string
  role?: string
  company?: string
  avatar?: string
  quote: string
  rating?: number
}

export interface TestimonialsBlockContent {
  sectionTitle?: string
  sectionSubtitle?: string
  columns?: 2 | 3
  items?: TestimonialItem[]
}

export function TestimonialsBlock({
  content,
}: {
  content: TestimonialsBlockContent
  settings: Record<string, unknown>
}) {
  const { sectionTitle, sectionSubtitle, columns = 2, items = [] } = content

  const gridCols =
    columns === 3 ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="container mx-auto max-w-6xl">
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
        <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
          {items.map((item, i) => (
            <div
              key={i}
              className="relative rounded-xl border-2 bg-card p-6 flex flex-col"
            >
              <Quote className="h-8 w-8 text-[var(--brand-400)] opacity-40 mb-4" />
              {item.rating != null && item.rating > 0 && (
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${
                        s < item.rating!
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
              )}
              <blockquote className="flex-1 text-base leading-relaxed mb-6">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3 pt-4 border-t">
                {item.avatar ? (
                  <Image
                    src={item.avatar}
                    alt={item.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-[var(--brand-100)] dark:bg-[var(--brand-900)]/30 flex items-center justify-center text-sm font-semibold text-[var(--brand-600)]">
                    {item.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  {(item.role || item.company) && (
                    <p className="text-xs text-muted-foreground">
                      {[item.role, item.company].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
