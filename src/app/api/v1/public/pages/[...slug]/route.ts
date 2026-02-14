import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { CmsPageService } from '@/lib/services/cms-page.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params
    const fullSlug = '/' + slug.join('/')
    const page = await CmsPageService.getBySlugPublic(fullSlug)

    if (!page) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Seite nicht gefunden' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: page })
  } catch (error) {
    console.error('Error fetching public page:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
