import { NextRequest, NextResponse } from 'next/server'
import { CmsNavigationService } from '@/lib/services/cms-navigation.service'

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

    const items = await CmsNavigationService.listPublic(location)
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error('Error fetching public navigation:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
