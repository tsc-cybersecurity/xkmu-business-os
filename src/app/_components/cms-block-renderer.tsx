'use client'

import { HeroBlock } from './blocks/hero-block'
import { FeaturesBlock } from './blocks/features-block'
import { CtaBlock } from './blocks/cta-block'
import { TextBlock } from './blocks/text-block'
import { HeadingBlock } from './blocks/heading-block'
import { ImageBlock } from './blocks/image-block'
import { CardsBlock } from './blocks/cards-block'
import { PlaceholderBlock } from './blocks/placeholder-block'

interface CmsBlockRendererProps {
  blockType: string
  content: Record<string, unknown>
  settings: Record<string, unknown>
}

export function CmsBlockRenderer({ blockType, content, settings }: CmsBlockRendererProps) {
  switch (blockType) {
    case 'hero':
      return <HeroBlock content={content as any} settings={settings} />
    case 'features':
      return <FeaturesBlock content={content as any} settings={settings} />
    case 'cta':
      return <CtaBlock content={content as any} settings={settings} />
    case 'text':
      return <TextBlock content={content as any} settings={settings} />
    case 'heading':
      return <HeadingBlock content={content as any} settings={settings} />
    case 'image':
      return <ImageBlock content={content as any} settings={settings} />
    case 'cards':
      return <CardsBlock content={content as any} settings={settings} />
    case 'placeholder':
      return <PlaceholderBlock content={content as any} settings={settings} />
    default:
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Unbekannter Blocktyp: {blockType}
          </div>
        </div>
      )
  }
}
