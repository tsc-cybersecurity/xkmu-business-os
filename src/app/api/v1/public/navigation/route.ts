import { NextRequest, NextResponse } from 'next/server'
import { CmsNavigationService } from '@/lib/services/cms-navigation.service'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')

    if (!location || !['header', 'footer'].includes(location)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'location muss "header" oder "footer" sein' } },
        { status: 400 }
      )
    }

    const dbItems = await CmsNavigationService.listPublic(location)

    const items = dbItems.map((item) => ({
      label: item.label,
      href: item.href,
      sortOrder: item.sortOrder ?? 0,
      openInNewTab: item.openInNewTab ?? false,
    }))

    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    logger.error('Error fetching public navigation', error, { module: 'PublicNavigationAPI' })
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
