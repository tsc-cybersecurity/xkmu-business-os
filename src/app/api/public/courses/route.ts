import { NextRequest, NextResponse } from 'next/server'
import { CoursePublicService } from '@/lib/services/course-public.service'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '60', 10) || 60, 100)
    const { items } = await CoursePublicService.listPublic({ limit })
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    logger.error('Failed to list public courses', error, { module: 'PublicCoursesAPI' })
    return NextResponse.json({ success: false, data: [] }, { status: 500 })
  }
}
