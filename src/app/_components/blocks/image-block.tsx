import Image from 'next/image'

export interface ImageBlockContent {
  src?: string
  alt?: string
  caption?: string
  width?: 'full' | 'container' | 'narrow'
}

interface ImageBlockProps {
  content: ImageBlockContent
  settings?: Record<string, unknown>
}

export function ImageBlock({ content, settings }: ImageBlockProps) {
  if (!content.src) return null

  const widthClass = content.width === 'full'
    ? 'w-full'
    : content.width === 'narrow'
    ? 'max-w-2xl mx-auto'
    : 'container mx-auto'

  return (
    <figure
      className={`px-4 py-8 ${widthClass}`}
      style={{
        paddingTop: settings?.paddingTop ? `${settings.paddingTop}px` : undefined,
        paddingBottom: settings?.paddingBottom ? `${settings.paddingBottom}px` : undefined,
      }}
    >
      <div className="relative w-full aspect-video">
        <Image
          src={content.src}
          alt={content.alt || ''}
          className="w-full rounded-lg object-cover"
          fill
          unoptimized
        />
      </div>
      {content.caption && (
        <figcaption className="text-center text-sm text-muted-foreground mt-3">
          {content.caption}
        </figcaption>
      )}
    </figure>
  )
}
