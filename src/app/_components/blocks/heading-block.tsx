interface HeadingBlockContent {
  text?: string
  level?: 1 | 2 | 3
  subtitle?: string
  alignment?: 'left' | 'center' | 'right'
}

interface HeadingBlockProps {
  content: HeadingBlockContent
  settings?: Record<string, unknown>
}

export function HeadingBlock({ content, settings }: HeadingBlockProps) {
  const level = content.level || 1
  const alignment = content.alignment || 'left'
  const alignClass = alignment === 'center' ? 'text-center' : alignment === 'right' ? 'text-right' : 'text-left'

  const headingClasses: Record<number, string> = {
    1: 'text-4xl font-bold mb-4',
    2: 'text-3xl font-bold mb-3',
    3: 'text-2xl font-semibold mb-2',
  }

  return (
    <section
      className={`container mx-auto px-4 py-8 ${alignClass}`}
      style={{
        paddingTop: settings?.paddingTop ? `${settings.paddingTop}px` : undefined,
        paddingBottom: settings?.paddingBottom ? `${settings.paddingBottom}px` : undefined,
        maxWidth: settings?.maxWidth ? `${settings.maxWidth}px` : '768px',
      }}
    >
      {level === 1 && <h1 className={headingClasses[1]}>{content.text}</h1>}
      {level === 2 && <h2 className={headingClasses[2]}>{content.text}</h2>}
      {level === 3 && <h3 className={headingClasses[3]}>{content.text}</h3>}
      {content.subtitle && (
        <p className="text-lg text-muted-foreground">{content.subtitle}</p>
      )}
    </section>
  )
}
