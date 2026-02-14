import { CmsPageService } from '@/lib/services/cms-page.service'
import { CmsBlockRenderer } from './cms-block-renderer'

interface CmsPageContentProps {
  slug: string
  fallback?: React.ReactNode
}

export async function CmsPageContent({ slug, fallback }: CmsPageContentProps) {
  const page = await CmsPageService.getBySlugPublic(slug)

  if (!page || page.blocks.length === 0) {
    if (fallback) return <>{fallback}</>
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Diese Seite hat noch keinen Inhalt.</p>
      </div>
    )
  }

  return (
    <>
      {page.blocks.map((block) => (
        <CmsBlockRenderer
          key={block.id}
          blockType={block.blockType}
          content={(block.content as Record<string, unknown>) || {}}
          settings={(block.settings as Record<string, unknown>) || {}}
        />
      ))}
    </>
  )
}
