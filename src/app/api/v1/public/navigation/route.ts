import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { asc } from 'drizzle-orm'
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

    // Resolve tenant (public endpoint - use first tenant by creation date)
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .orderBy(asc(tenants.createdAt))
      .limit(1)

    if (!tenant) {
      return NextResponse.json({ success: true, data: [] })
    }

    const items = await CmsNavigationService.listPublic(tenant.id, location)
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error('Error fetching public navigation:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
