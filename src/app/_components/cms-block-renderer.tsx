'use client'

import { HeroBlock } from './blocks/hero-block'
import { FeaturesBlock } from './blocks/features-block'
import { CtaBlock } from './blocks/cta-block'
import { TextBlock } from './blocks/text-block'
import { HeadingBlock } from './blocks/heading-block'
import { ImageBlock } from './blocks/image-block'
import { CardsBlock } from './blocks/cards-block'
import { PlaceholderBlock } from './blocks/placeholder-block'
import { TestimonialsBlock } from './blocks/testimonials-block'
import { PricingBlock } from './blocks/pricing-block'
import { FaqBlock } from './blocks/faq-block'
import { StatsBlock } from './blocks/stats-block'
import { TeamBlock } from './blocks/team-block'
import { TimelineBlock } from './blocks/timeline-block'
import { LogoCloudBlock } from './blocks/logocloud-block'
import { VideoBlock } from './blocks/video-block'
import { GalleryBlock } from './blocks/gallery-block'
import { BannerBlock } from './blocks/banner-block'
import { DividerBlock } from './blocks/divider-block'
import { ComparisonBlock } from './blocks/comparison-block'

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
    case 'testimonials':
      return <TestimonialsBlock content={content as any} settings={settings} />
    case 'pricing':
      return <PricingBlock content={content as any} settings={settings} />
    case 'faq':
      return <FaqBlock content={content as any} settings={settings} />
    case 'stats':
      return <StatsBlock content={content as any} settings={settings} />
    case 'team':
      return <TeamBlock content={content as any} settings={settings} />
    case 'timeline':
      return <TimelineBlock content={content as any} settings={settings} />
    case 'logocloud':
      return <LogoCloudBlock content={content as any} settings={settings} />
    case 'video':
      return <VideoBlock content={content as any} settings={settings} />
    case 'gallery':
      return <GalleryBlock content={content as any} settings={settings} />
    case 'banner':
      return <BannerBlock content={content as any} settings={settings} />
    case 'divider':
      return <DividerBlock content={content as any} settings={settings} />
    case 'comparison':
      return <ComparisonBlock content={content as any} settings={settings} />
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
