'use client'

import { CmsBlockRenderer } from '../cms-block-renderer'

interface SubBlock {
  blockType: string
  content: Record<string, unknown>
  settings?: Record<string, unknown>
}

export interface ColumnsBlockContent {
  columns?: 2 | 3
  layout?: 'equal' | 'left-wide' | 'right-wide'
  gap?: number
  left?: SubBlock[]
  center?: SubBlock[]
  right?: SubBlock[]
}

interface ColumnsBlockProps {
  content: ColumnsBlockContent
  settings?: Record<string, unknown>
}

export function ColumnsBlock({ content, settings }: ColumnsBlockProps) {
  const cols = content.columns || 2
  const layout = content.layout || 'equal'
  const gap = content.gap ?? 8
  const leftBlocks = content.left || []
  const rightBlocks = content.right || []
  const centerBlocks = content.center || []

  const gridClass = cols === 3
    ? 'md:grid-cols-3'
    : layout === 'left-wide'
    ? 'md:grid-cols-[2fr_1fr]'
    : layout === 'right-wide'
    ? 'md:grid-cols-[1fr_2fr]'
    : 'md:grid-cols-2'

  return (
    <section
      className="container mx-auto px-4 py-8"
      style={{
        paddingTop: settings?.paddingTop ? `${settings.paddingTop}px` : undefined,
        paddingBottom: settings?.paddingBottom ? `${settings.paddingBottom}px` : undefined,
      }}
    >
      <div className={`grid ${gridClass} items-start`} style={{ gap: `${gap * 4}px` }}>
        <div className="space-y-0">
          {leftBlocks.map((block, i) => (
            <CmsBlockRenderer
              key={`left-${i}`}
              blockType={block.blockType}
              content={block.content || {}}
              settings={block.settings || {}}
            />
          ))}
        </div>

        {cols === 3 && (
          <div className="space-y-0">
            {centerBlocks.map((block, i) => (
              <CmsBlockRenderer
                key={`center-${i}`}
                blockType={block.blockType}
                content={block.content || {}}
                settings={block.settings || {}}
              />
            ))}
          </div>
        )}

        <div className="space-y-0">
          {rightBlocks.map((block, i) => (
            <CmsBlockRenderer
              key={`right-${i}`}
              blockType={block.blockType}
              content={block.content || {}}
              settings={block.settings || {}}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
