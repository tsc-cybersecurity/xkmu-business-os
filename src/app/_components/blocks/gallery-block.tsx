'use client'

import Image from 'next/image'
import { useState } from 'react'
import { X } from 'lucide-react'

interface GalleryImage {
  src: string
  alt?: string
  caption?: string
}

export interface GalleryBlockContent {
  sectionTitle?: string
  sectionSubtitle?: string
  columns?: 2 | 3 | 4
  items?: GalleryImage[]
}

export function GalleryBlock({
  content,
}: {
  content: GalleryBlockContent
  settings: Record<string, unknown>
}) {
  const { sectionTitle, sectionSubtitle, columns = 3, items = [] } = content
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const gridCols =
    columns === 2
      ? 'sm:grid-cols-2'
      : columns === 4
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-2 lg:grid-cols-3'

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
        <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
          {items.map((img, i) => (
            <button
              key={i}
              onClick={() => setLightboxIndex(i)}
              className="group relative aspect-square rounded-lg overflow-hidden bg-muted"
            >
              <Image
                src={img.src}
                alt={img.alt || img.caption || 'Galeriebild'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                fill
                unoptimized
              />
              {img.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.caption}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && items[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            aria-label="Schliessen"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <Image
            src={items[lightboxIndex].src}
            alt={items[lightboxIndex].alt || items[lightboxIndex].caption || 'Galeriebild'}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            width={1200}
            height={800}
            onClick={(e) => e.stopPropagation()}
            unoptimized
          />
          {items[lightboxIndex].caption && (
            <p className="absolute bottom-8 text-white/80 text-sm text-center">
              {items[lightboxIndex].caption}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
