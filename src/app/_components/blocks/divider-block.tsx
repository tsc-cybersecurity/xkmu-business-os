'use client'

interface DividerBlockContent {
  style?: 'line' | 'dashed' | 'dots' | 'gradient' | 'space'
  label?: string
}

export function DividerBlock({
  content,
}: {
  content: DividerBlockContent
  settings: Record<string, unknown>
}) {
  const { style = 'line', label } = content

  return (
    <section className="py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        {style === 'space' ? (
          <div className="h-8" />
        ) : style === 'dots' ? (
          <div className="flex items-center justify-center gap-2">
            {label && (
              <span className="text-sm text-muted-foreground mr-4">
                {label}
              </span>
            )}
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
          </div>
        ) : style === 'gradient' ? (
          <div className="relative">
            <div className="h-px bg-gradient-to-r from-transparent via-[var(--brand-400)] to-transparent" />
            {label && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-background px-4 text-sm text-muted-foreground">
                  {label}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <hr
              className={`border-t ${
                style === 'dashed' ? 'border-dashed' : ''
              } border-border`}
            />
            {label && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-background px-4 text-sm text-muted-foreground">
                  {label}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
