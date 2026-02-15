'use client'

interface StatItem {
  value: string
  label: string
  description?: string
}

interface StatsBlockContent {
  sectionTitle?: string
  sectionSubtitle?: string
  columns?: 2 | 3 | 4
  items?: StatItem[]
  variant?: 'default' | 'cards' | 'brand'
}

export function StatsBlock({
  content,
}: {
  content: StatsBlockContent
  settings: Record<string, unknown>
}) {
  const {
    sectionTitle,
    sectionSubtitle,
    columns = 4,
    items = [],
    variant = 'default',
  } = content

  const gridCols =
    columns === 2
      ? 'sm:grid-cols-2'
      : columns === 3
        ? 'sm:grid-cols-3'
        : 'sm:grid-cols-2 lg:grid-cols-4'

  const isBrand = variant === 'brand'

  return (
    <section
      className={`py-16 md:py-24 px-4 ${
        isBrand
          ? 'bg-gradient-to-br from-[var(--brand-gradient-from)] to-[var(--brand-gradient-to)] text-white'
          : ''
      }`}
    >
      <div className="container mx-auto max-w-6xl">
        {(sectionTitle || sectionSubtitle) && (
          <div className="text-center mb-12">
            {sectionTitle && (
              <h2
                className={`text-3xl font-bold mb-3 ${isBrand ? 'text-white' : ''}`}
              >
                {sectionTitle}
              </h2>
            )}
            {sectionSubtitle && (
              <p
                className={`text-lg max-w-2xl mx-auto ${
                  isBrand ? 'text-white/80' : 'text-muted-foreground'
                }`}
              >
                {sectionSubtitle}
              </p>
            )}
          </div>
        )}
        <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
          {items.map((item, i) => (
            <div
              key={i}
              className={`text-center p-6 ${
                variant === 'cards'
                  ? 'rounded-xl border-2 bg-card'
                  : isBrand
                    ? 'rounded-xl bg-white/10'
                    : ''
              }`}
            >
              <div
                className={`text-4xl md:text-5xl font-bold mb-2 ${
                  isBrand
                    ? 'text-white'
                    : 'text-[var(--brand-600)] dark:text-[var(--brand-400)]'
                }`}
              >
                {item.value}
              </div>
              <div
                className={`text-sm font-medium mb-1 ${isBrand ? 'text-white' : ''}`}
              >
                {item.label}
              </div>
              {item.description && (
                <p
                  className={`text-xs ${
                    isBrand ? 'text-white/60' : 'text-muted-foreground'
                  }`}
                >
                  {item.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
