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
import { ServiceCardsBlock } from './blocks/service-cards-block'
import { BlogListingBlock } from './blocks/blog-listing-block'
import { ContactFormBlock } from './blocks/contact-form-block'
import { ColumnsBlock } from './blocks/columns-block'
import { WheelBlock } from './blocks/wheel-block'
import type { HeroBlockContent } from './blocks/hero-block'
import type { WheelBlockContent } from './blocks/wheel-block'
import type { BannerBlockContent } from './blocks/banner-block'
import type { BlogListingBlockContent } from './blocks/blog-listing-block'
import type { ContactFormBlockContent } from './blocks/contact-form-block'
import type { ColumnsBlockContent } from './blocks/columns-block'
import type { CardsBlockContent } from './blocks/cards-block'
import type { ComparisonBlockContent } from './blocks/comparison-block'
import type { CtaBlockContent } from './blocks/cta-block'
import type { DividerBlockContent } from './blocks/divider-block'
import type { FaqBlockContent } from './blocks/faq-block'
import type { FeaturesBlockContent } from './blocks/features-block'
import type { GalleryBlockContent } from './blocks/gallery-block'
import type { HeadingBlockContent } from './blocks/heading-block'
import type { ImageBlockContent } from './blocks/image-block'
import type { LogoCloudBlockContent } from './blocks/logocloud-block'
import type { PlaceholderBlockContent } from './blocks/placeholder-block'
import type { PricingBlockContent } from './blocks/pricing-block'
import type { ServiceCardsBlockContent } from './blocks/service-cards-block'
import type { StatsBlockContent } from './blocks/stats-block'
import type { TeamBlockContent } from './blocks/team-block'
import type { TestimonialsBlockContent } from './blocks/testimonials-block'
import type { TextBlockContent } from './blocks/text-block'
import type { TimelineBlockContent } from './blocks/timeline-block'
import type { VideoBlockContent } from './blocks/video-block'
import { CourseCalloutBlock } from './blocks/course-callout-block'
import { CourseCodeBlock } from './blocks/course-code-block'
import { CourseLearningObjectivesBlock } from './blocks/course-learning-objectives-block'
import { CourseKeyTakeawaysBlock } from './blocks/course-key-takeaways-block'
import { CourseStepByStepBlock } from './blocks/course-step-by-step-block'
import { CourseAccordionBlock } from './blocks/course-accordion-block'
import type { CourseCalloutBlockContent } from './blocks/course-callout-block'
import type { CourseCodeBlockContent } from './blocks/course-code-block'
import type { CourseLearningObjectivesBlockContent } from './blocks/course-learning-objectives-block'
import type { CourseKeyTakeawaysBlockContent } from './blocks/course-key-takeaways-block'
import type { CourseStepByStepBlockContent } from './blocks/course-step-by-step-block'
import type { CourseAccordionBlockContent } from './blocks/course-accordion-block'

interface CmsBlockRendererProps {
  blockType: string
  content: Record<string, unknown>
  settings: Record<string, unknown>
}

export function CmsBlockRenderer({ blockType, content, settings }: CmsBlockRendererProps) {
  const bgColor = settings?.backgroundColor as string | undefined
  const bgImage = settings?.backgroundImage as string | undefined
  const textColor = settings?.textColor as string | undefined
  const fontSize = settings?.fontSize as string | undefined
  const hasWrapper = bgColor || bgImage || textColor || fontSize

  const fontSizeMap: Record<string, string> = {
    xs: '12px', sm: '14px', base: '16px', lg: '18px', xl: '20px', '2xl': '24px',
  }

  const wrapWithBackground = (child: React.ReactNode) => {
    if (!hasWrapper) return child
    return (
      <div style={{
        backgroundColor: bgColor || undefined,
        backgroundImage: bgImage ? `url(${bgImage})` : undefined,
        backgroundSize: bgImage ? 'cover' : undefined,
        backgroundPosition: bgImage ? 'center' : undefined,
        color: textColor || undefined,
        fontSize: fontSize ? fontSizeMap[fontSize] : undefined,
      }}>
        {child}
      </div>
    )
  }

  const block = (() => { switch (blockType) {
    case 'hero':
      return <HeroBlock content={content as HeroBlockContent} settings={settings} />
    case 'features':
      return <FeaturesBlock content={content as FeaturesBlockContent} settings={settings} />
    case 'cta':
      return <CtaBlock content={content as CtaBlockContent} settings={settings} />
    case 'text':
      return <TextBlock content={content as TextBlockContent} settings={settings} />
    case 'heading':
      return <HeadingBlock content={content as HeadingBlockContent} settings={settings} />
    case 'image':
      return <ImageBlock content={content as ImageBlockContent} settings={settings} />
    case 'cards':
      return <CardsBlock content={content as CardsBlockContent} settings={settings} />
    case 'placeholder':
      return <PlaceholderBlock content={content as PlaceholderBlockContent} settings={settings} />
    case 'testimonials':
      return <TestimonialsBlock content={content as TestimonialsBlockContent} settings={settings} />
    case 'pricing':
      return <PricingBlock content={content as PricingBlockContent} settings={settings} />
    case 'faq':
      return <FaqBlock content={content as FaqBlockContent} settings={settings} />
    case 'stats':
      return <StatsBlock content={content as StatsBlockContent} settings={settings} />
    case 'team':
      return <TeamBlock content={content as TeamBlockContent} settings={settings} />
    case 'timeline':
      return <TimelineBlock content={content as TimelineBlockContent} settings={settings} />
    case 'logocloud':
      return <LogoCloudBlock content={content as LogoCloudBlockContent} settings={settings} />
    case 'video':
      return <VideoBlock content={content as VideoBlockContent} settings={settings} />
    case 'gallery':
      return <GalleryBlock content={content as GalleryBlockContent} settings={settings} />
    case 'banner':
      return <BannerBlock content={content as BannerBlockContent} settings={settings} />
    case 'divider':
      return <DividerBlock content={content as DividerBlockContent} settings={settings} />
    case 'comparison':
      return <ComparisonBlock content={content as ComparisonBlockContent} settings={settings} />
    case 'service-cards':
      return <ServiceCardsBlock content={content as ServiceCardsBlockContent} settings={settings} />
    case 'blog-listing':
      return <BlogListingBlock content={content as BlogListingBlockContent} settings={settings} />
    case 'contact-form':
      return <ContactFormBlock content={content as ContactFormBlockContent} settings={settings} />
    case 'columns':
      return <ColumnsBlock content={content as ColumnsBlockContent} settings={settings} />
    case 'wheel':
      return <WheelBlock content={content as WheelBlockContent} settings={settings} />
    case 'course-callout':
      return <CourseCalloutBlock content={content as CourseCalloutBlockContent} />
    case 'course-code':
      return <CourseCodeBlock content={content as CourseCodeBlockContent} />
    case 'course-learning-objectives':
      return <CourseLearningObjectivesBlock content={content as CourseLearningObjectivesBlockContent} />
    case 'course-key-takeaways':
      return <CourseKeyTakeawaysBlock content={content as CourseKeyTakeawaysBlockContent} />
    case 'course-step-by-step':
      return <CourseStepByStepBlock content={content as CourseStepByStepBlockContent} />
    case 'course-accordion':
      return <CourseAccordionBlock content={content as CourseAccordionBlockContent} />
    default:
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Unbekannter Blocktyp: {blockType}
          </div>
        </div>
      )
  } })()

  return wrapWithBackground(block)
}
