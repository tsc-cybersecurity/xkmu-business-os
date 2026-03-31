'use client'

export interface VideoBlockContent {
  src?: string
  title?: string
  caption?: string
  width?: 'full' | 'container' | 'narrow'
  aspectRatio?: '16:9' | '4:3' | '1:1'
}

function getEmbedUrl(src: string): string | null {
  // YouTube
  const ytMatch = src.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  )
  if (ytMatch) return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`

  // Vimeo
  const vimeoMatch = src.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  // Direct embed URL (already an embed)
  if (src.includes('/embed/') || src.includes('player.')) return src

  return null
}

export function VideoBlock({
  content,
}: {
  content: VideoBlockContent
  settings: Record<string, unknown>
}) {
  const {
    src = '',
    title,
    caption,
    width = 'container',
    aspectRatio = '16:9',
  } = content

  const widthClass =
    width === 'full'
      ? 'w-full'
      : width === 'narrow'
        ? 'container mx-auto max-w-2xl'
        : 'container mx-auto max-w-4xl'

  const paddingClass =
    aspectRatio === '4:3'
      ? 'pb-[75%]'
      : aspectRatio === '1:1'
        ? 'pb-[100%]'
        : 'pb-[56.25%]'

  const embedUrl = src ? getEmbedUrl(src) : null

  return (
    <section className="py-8 md:py-16 px-4">
      <div className={widthClass}>
        {title && (
          <h3 className="text-xl font-semibold mb-4 text-center">{title}</h3>
        )}
        <div
          className={`relative ${paddingClass} rounded-xl overflow-hidden bg-muted`}
        >
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={title || 'Video'}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : src ? (
            <video
              src={src}
              controls
              className="absolute inset-0 w-full h-full object-cover"
            >
              <track kind="captions" />
            </video>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              Keine Video-URL angegeben
            </div>
          )}
        </div>
        {caption && (
          <p className="text-sm text-muted-foreground text-center mt-3">
            {caption}
          </p>
        )}
      </div>
    </section>
  )
}
