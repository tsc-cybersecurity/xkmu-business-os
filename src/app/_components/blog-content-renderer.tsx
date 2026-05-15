import { Fragment } from 'react'
import { MarkdownRenderer } from './markdown-renderer'
import { CmsBlockRenderer } from './cms-block-renderer'
import { splitContentByPromos } from '@/lib/utils/promo-placeholder'
import type { CmsPromoSlot } from '@/lib/db/schema'

interface BlogContentRendererProps {
  content: string
  // Vorab geladene Promo-Slots (slug → slot). Werden in der Page-Component
  // einmalig geholt und runtergereicht — kein Roundtrip pro Platzhalter.
  promos: Record<string, CmsPromoSlot>
  className?: string
}

export function BlogContentRenderer({ content, promos, className }: BlogContentRendererProps) {
  const chunks = splitContentByPromos(content)

  return (
    <div className={className}>
      {chunks.map((chunk, idx) => {
        if (chunk.kind === 'markdown') {
          if (!chunk.text.trim()) return null
          return <MarkdownRenderer key={`md-${idx}`} content={chunk.text} />
        }
        const slot = promos[chunk.slug]
        if (!slot) {
          // Slot existiert nicht oder ist inaktiv — Platzhalter still wegfallen
          // lassen, statt einen Fehler zu rendern. Editor sieht im CMS, wenn
          // ein Slot fehlt; im Live-Frontend stoert er nicht.
          return <Fragment key={`missing-${idx}`} />
        }
        return (
          <div key={`promo-${idx}-${slot.id}`} className="my-8 not-prose">
            <CmsBlockRenderer
              blockType={slot.blockType}
              content={(slot.content as Record<string, unknown>) ?? {}}
              settings={(slot.settings as Record<string, unknown>) ?? {}}
            />
          </div>
        )
      })}
    </div>
  )
}
